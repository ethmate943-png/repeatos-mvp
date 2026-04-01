import type { RewardRepository, PointsLedgerRepository, VoucherRepository, TenantRepository, CustomerLedgerRepository } from "./repository.js";
import type { Reward, OrderRecord, PointsLedgerRecord, VoucherRecord } from "./types.js";
import { randomUUID } from "node:crypto";

export class LoyaltyEngine {
  constructor(
    private readonly pointsRepo: PointsLedgerRepository,
    private readonly voucherRepo: VoucherRepository,
    private readonly tenantRepo: TenantRepository,
    private readonly customerRepo: CustomerLedgerRepository,
    private readonly rewardRepo?: RewardRepository,
  ) {}

  async processLoyaltyForOrder(order: OrderRecord) {
    const business = await this.tenantRepo.getBusiness(order.businessId);
    if (!business || !business.loyaltyConfig) return;

    const config = business.loyaltyConfig;
    
    // 1. Check min_order
    if (order.totalKobo < (config.min_order || 0)) return;

    // 2. Award points based on thresholds
    // AGENTS.md: Determine points to award from loyalty_config.thresholds based on customer's order count (or visits)
    const scanCount = await this.customerRepo.countScans(order.businessId, order.customerId);
    
    // Simple logic: find matching threshold for visits
    // Threshold example: { "visits": "1-9", "reward": 50 } OR { "visits": 10, "reward": 100 }
    // We'll simplify: if scanCount matches a specific visit number, take that. 
    // If it's a range, take that.
    
    let pointsToAward = 0;
    if (config.thresholds) {
      for (const t of config.thresholds) {
        if (typeof t.visits === 'number' && t.visits === scanCount) {
          pointsToAward = t.reward;
          break;
        } else if (typeof t.visits === 'string' && t.visits.includes('-')) {
          const [min, max] = t.visits.split('-').map(Number);
          if (scanCount >= min && scanCount <= max) {
            pointsToAward = t.reward;
            break;
          }
        }
      }
    }

    if (pointsToAward > 0) {
      await this.pointsRepo.addEntry({
        businessId: order.businessId,
        customerId: order.customerId,
        orderId: order.id,
        type: "award",
        amount: pointsToAward,
        note: `Points awarded for order ${order.id}`
      });
    }

    // 3. Check for voucher issuance
    const balance = await this.pointsRepo.getBalance(order.businessId, order.customerId);
    // Vouchers are issued when a "reward threshold" is hit. 
    // In AGENTS.md, the 'reward' in thresholds is points. 
    // Wait, let's re-read: "If threshold crossed -> issue voucher -> write type = 'redeem' row to ledger"
    // This implies we have separate "Voucher Thresholds". 
    // Actually, AGENTS.md says rewards are vouchers. 
    // "Naira-denominated vouchers are unlocked."
    
    // Let's assume points are redeemed for vouchers once balance >= some threshold.
    // For now, let's implement a simple threshold: if balance >= 5000 kobo (₦50), issue voucher.
    // We'll use config.reward_threshold if it exists, otherwise assume 5000.
    const rewardThreshold = config.reward_threshold || 5000;
    
    if (balance >= rewardThreshold) {
      const voucherCode = randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
      const expiryDays = config.expiry_days || 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      await this.voucherRepo.createVoucher({
        businessId: order.businessId,
        customerId: order.customerId,
        code: voucherCode,
        valueKobo: balance, // Use all points
        minOrderKobo: config.min_order || 0,
        maxDiscountPct: config.max_discount_percent || 20,
        status: "active",
        expiresAt
      });

      // Deduct points
      await this.pointsRepo.addEntry({
        businessId: order.businessId,
        customerId: order.customerId,
        type: "redeem",
        amount: -balance,
        note: `Points redeemed for voucher ${voucherCode}`
      });
    }
  }

  async resolveReward(businessId: string, visitCount: number): Promise<{ label: string } | null> {
    if (this.rewardRepo) {
      const reward = await this.rewardRepo.findRewardByVisitCount(businessId, visitCount);
      if (reward) return reward;
    }

    const business = await this.tenantRepo.getBusiness(businessId);
    if (!business?.loyaltyConfig?.thresholds) return null;

    for (const t of business.loyaltyConfig.thresholds) {
      if (typeof t.visits === "number" && t.visits === visitCount) {
        return { label: `${t.reward / 1000} Point Reward` };
      }
    }
    return null;
  }
}
