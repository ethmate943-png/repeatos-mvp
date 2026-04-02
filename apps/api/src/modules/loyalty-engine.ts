import type { PointsLedgerRepository, TenantRepository, VoucherRepository } from "./repository.js";
import type { LoyaltyConfig, OrderRecord, Reward } from "./types.js";

const DEFAULT_CONFIG: LoyaltyConfig = {
  points_per_visit: 5000,
  thresholds: [
    { points: 25000, value_kobo: 5000, label: "Free Coffee" },
    { points: 50000, value_kobo: 10000, label: "₦100 voucher" },
    { points: 75000, value_kobo: 15000, label: "₦150 voucher" },
  ],
  expiry_days: 30,
  min_order_kobo: 50000,
  max_discount_pct: 20,
};

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/I/1

function generateVoucherCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

function addDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function normalizeConfig(raw: unknown): LoyaltyConfig {
  const candidate = raw as Partial<LoyaltyConfig> | undefined;
  if (!candidate || typeof candidate !== "object") return DEFAULT_CONFIG;

  // If thresholds are missing or empty, treat as no configured loyalty.
  if (!Array.isArray(candidate.thresholds) || candidate.thresholds.length === 0) {
    return DEFAULT_CONFIG;
  }

  return {
    ...DEFAULT_CONFIG,
    ...candidate,
    thresholds: candidate.thresholds as LoyaltyConfig["thresholds"],
  };
}

export class LoyaltyEngine {
  constructor(
    private readonly pointsRepo: PointsLedgerRepository,
    private readonly voucherRepo: VoucherRepository,
    private readonly tenantRepo: TenantRepository,
  ) {}

  private async awardPoints(input: {
    businessId: string;
    customerId: string;
    amount: number;
    orderId?: string;
    note: string;
  }): Promise<void> {
    await this.pointsRepo.addEntry({
      businessId: input.businessId,
      customerId: input.customerId,
      orderId: input.orderId,
      type: "award",
      amount: input.amount,
      note: input.note,
    });
  }

  private findCrossedThreshold(
    thresholds: LoyaltyConfig["thresholds"],
    balance: number,
  ): LoyaltyConfig["thresholds"][number] | null {
    const sorted = [...thresholds].sort((a, b) => b.points - a.points);
    return sorted.find((t) => balance >= t.points) ?? null;
  }

  async processLoyaltyForOrder(order: OrderRecord): Promise<void> {
    const business = await this.tenantRepo.getBusiness(order.businessId);
    const config = normalizeConfig(business?.loyaltyConfig);

    if (!config || order.totalKobo < config.min_order_kobo) return;

    await this.awardPoints({
      businessId: order.businessId,
      customerId: order.customerId,
      orderId: order.id,
      amount: config.points_per_visit,
      note: `Order ${order.id} accepted`,
    });

    const balanceAfterAward = await this.pointsRepo.getBalance(
      order.businessId,
      order.customerId,
    );
    const crossed = this.findCrossedThreshold(config.thresholds, balanceAfterAward);
    if (!crossed) return;

    // 5 attempts on unique voucher code collision.
    let lastErr: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateVoucherCode();
      const expiresAt = addDays(config.expiry_days);
      try {
        await this.voucherRepo.createVoucher({
          businessId: order.businessId,
          customerId: order.customerId,
          code,
          valueKobo: crossed.value_kobo,
          minOrderKobo: config.min_order_kobo,
          maxDiscountPct: config.max_discount_pct,
          status: "active",
          expiresAt,
        });

        await this.pointsRepo.addEntry({
          businessId: order.businessId,
          customerId: order.customerId,
          orderId: order.id,
          type: "redeem",
          amount: -crossed.points,
          note: `Voucher reserved (${code})`,
        });
        return;
      } catch (err) {
        lastErr = err;
      }
    }

    if (lastErr instanceof Error) throw lastErr;
    throw new Error("Failed to issue voucher after multiple attempts");
  }

  async resolveReward(
    businessId: string,
    customerId: string,
    visitCount: number,
  ): Promise<{ pointsBalance: number; reward: Reward }> {
    const business = await this.tenantRepo.getBusiness(businessId);
    const config = normalizeConfig(business?.loyaltyConfig);

    await this.awardPoints({
      businessId,
      customerId,
      amount: config.points_per_visit,
      note: `Visit #${visitCount} check-in`,
    });

    const balanceAfterAward = await this.pointsRepo.getBalance(
      businessId,
      customerId,
    );

    const crossed = this.findCrossedThreshold(config.thresholds, balanceAfterAward);
    if (!crossed) {
      return {
        pointsBalance: balanceAfterAward,
        reward: null,
      };
    }

    // 5 attempts on unique voucher code collision.
    let lastErr: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateVoucherCode();
      const expiresAt = addDays(config.expiry_days);

      try {
        const voucher = await this.voucherRepo.createVoucher({
          businessId,
          customerId,
          code,
          valueKobo: crossed.value_kobo,
          minOrderKobo: config.min_order_kobo,
          maxDiscountPct: config.max_discount_pct,
          status: "active",
          expiresAt,
        });

        await this.pointsRepo.addEntry({
          businessId,
          customerId,
          type: "redeem",
          amount: -crossed.points,
          note: `Voucher reserved (${code})`,
        });

        const finalBalance = await this.pointsRepo.getBalance(
          businessId,
          customerId,
        );

        return {
          pointsBalance: finalBalance,
          reward: {
            label: crossed.label,
            code: voucher.code,
            valueKobo: voucher.valueKobo,
            expiresAt: voucher.expiresAt,
          },
        };
      } catch (err) {
        lastErr = err;
      }
    }

    if (lastErr instanceof Error) throw lastErr;
    throw new Error("Failed to issue voucher after multiple attempts");
  }
}
