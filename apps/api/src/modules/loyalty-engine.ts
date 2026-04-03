import type { PointsLedgerRepository, TenantRepository } from "./repository.js";
import type {
  CreditResult,
  OrderRecord,
  TieredLoyaltyConfig,
  LoyaltyTier,
} from "./types.js";

export const DEFAULT_TIERED_LOYALTY: TieredLoyaltyConfig = {
  tiers: [
    { from: 1, to: 3, credits_kobo: 5000 },
    { from: 4, to: 10, credits_kobo: 10000 },
    { from: 11, to: null, credits_kobo: 15000 },
  ],
  min_redemption_kobo: 50000,
  max_discount_pct: 20,
  expiry_days: 30,
};

export function parseTieredLoyaltyConfig(raw: unknown): TieredLoyaltyConfig {
  const c = raw as Partial<TieredLoyaltyConfig> | null | undefined;
  if (!c || typeof c !== "object" || !Array.isArray(c.tiers) || c.tiers.length === 0) {
    return DEFAULT_TIERED_LOYALTY;
  }
  return {
    ...DEFAULT_TIERED_LOYALTY,
    ...c,
    tiers: c.tiers as LoyaltyTier[],
  };
}

export class LoyaltyEngine {
  constructor(
    private readonly pointsRepo: PointsLedgerRepository,
    private readonly tenantRepo: TenantRepository,
  ) {}

  /**
   * Tiered credits are awarded at check-in; order acceptance does not write ledger rows in MVP.
   */
  async processLoyaltyForOrder(_order: OrderRecord): Promise<void> {
    return;
  }

  async resolveReward(
    businessId: string,
    customerId: string,
    visitCount: number,
  ): Promise<CreditResult> {
    const config = await this.loadConfig(businessId);
    const tier = this.resolveTier(config.tiers, visitCount);
    const creditsEarned = tier.credits_kobo;

    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + config.expiry_days);

    await this.pointsRepo.addEntry({
      businessId,
      customerId,
      type: "award",
      amount: creditsEarned,
      note: `Visit #${visitCount} — tier award`,
      expiresAt,
    });

    const creditBalance = await this.pointsRepo.getBalance(businessId, customerId);
    const nudgeMessage = this.buildNudgeMessage(
      config.tiers,
      visitCount,
      config.min_redemption_kobo,
      creditBalance,
    );
    const tierLabel = `₦${creditsEarned / 100} per visit`;

    return {
      creditsEarned,
      creditBalance,
      nudgeMessage,
      tierLabel,
    };
  }

  private resolveTier(tiers: LoyaltyTier[], visitCount: number): LoyaltyTier {
    const tier = tiers.find(
      (t) => visitCount >= t.from && (t.to === null || visitCount <= t.to),
    );
    return tier ?? tiers[tiers.length - 1];
  }

  private buildNudgeMessage(
    tiers: LoyaltyTier[],
    visitCount: number,
    minRedemptionKobo: number,
    balanceKobo: number,
  ): string {
    const nextTier = tiers.find((t) => t.from > visitCount);

    if (nextTier) {
      const visitsAway = nextTier.from - visitCount;
      const nextValue = nextTier.credits_kobo / 100;
      return `${visitsAway} visit${visitsAway === 1 ? "" : "s"} → ₦${nextValue} bonus`;
    }

    if (balanceKobo >= minRedemptionKobo) {
      return `You have ₦${balanceKobo / 100} to redeem. Show this to staff!`;
    }

    const remaining = minRedemptionKobo - balanceKobo;
    return `₦${remaining / 100} more to unlock redemption`;
  }

  private async loadConfig(businessId: string): Promise<TieredLoyaltyConfig> {
    const business = await this.tenantRepo.getBusiness(businessId);
    const raw = business?.loyaltyConfig ?? business?.loyalty_config;
    return parseTieredLoyaltyConfig(raw);
  }
}
