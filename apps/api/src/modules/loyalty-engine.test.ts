import { describe, expect, it } from "vitest";
import { LoyaltyEngine, parseTieredLoyaltyConfig } from "./loyalty-engine.js";
import type { PointsLedgerRepository, TenantRepository } from "./repository.js";
import type { PointsLedgerRecord } from "./types.js";

const stubTenant = (config: object | null): TenantRepository => ({
  findTenantByToken: async () => null,
  getBusiness: async () =>
    config === null ? null : { loyaltyConfig: config },
});

describe("parseTieredLoyaltyConfig", () => {
  it("returns defaults when tiers missing", () => {
    const c = parseTieredLoyaltyConfig({ foo: 1 });
    expect(c.tiers).toHaveLength(3);
    expect(c.min_redemption_kobo).toBe(50000);
  });
});

describe("LoyaltyEngine", () => {
  it("visit 1 awards ₦50 (5000 kobo) and nudges next tier", async () => {
    const ledger: PointsLedgerRecord[] = [];
    const pointsRepo: PointsLedgerRepository = {
      addEntry: async (entry) => {
        const row = { ...entry, id: "pl-1", createdAt: new Date() } as PointsLedgerRecord;
        ledger.push(row);
        return row;
      },
      getBalance: async (_b, _c) =>
        ledger
          .filter(
            (e) =>
              e.businessId === _b &&
              e.customerId === _c &&
              (!e.expiresAt || e.expiresAt > new Date()),
          )
          .reduce((s, e) => s + e.amount, 0),
      listEntries: async () => [],
    };

    const engine = new LoyaltyEngine(
      pointsRepo,
      stubTenant({
        tiers: [
          { from: 1, to: 3, credits_kobo: 5000 },
          { from: 4, to: 10, credits_kobo: 10000 },
          { from: 11, to: null, credits_kobo: 15000 },
        ],
        min_redemption_kobo: 50000,
        max_discount_pct: 20,
        expiry_days: 30,
      }),
    );

    const result = await engine.resolveReward("biz-1", "cus-1", 1);
    expect(result.creditsEarned).toBe(5000);
    expect(result.creditBalance).toBe(5000);
    expect(result.tierLabel).toBe("₦50 per visit");
    expect(result.nudgeMessage).toBe("3 visits → ₦100 bonus");
  });

  it("visit 4 awards ₦100 and nudges tier 11", async () => {
    const ledger: PointsLedgerRecord[] = [];
    const pointsRepo: PointsLedgerRepository = {
      addEntry: async (entry) => {
        const row = { ...entry, id: `pl-${ledger.length}`, createdAt: new Date() } as PointsLedgerRecord;
        ledger.push(row);
        return row;
      },
      getBalance: async (_b, _c) =>
        ledger
          .filter(
            (e) =>
              e.businessId === _b &&
              e.customerId === _c &&
              (!e.expiresAt || e.expiresAt > new Date()),
          )
          .reduce((s, e) => s + e.amount, 0),
      listEntries: async () => [],
    };

    const engine = new LoyaltyEngine(
      pointsRepo,
      stubTenant({
        tiers: [
          { from: 1, to: 3, credits_kobo: 5000 },
          { from: 4, to: 10, credits_kobo: 10000 },
          { from: 11, to: null, credits_kobo: 15000 },
        ],
        min_redemption_kobo: 50000,
        max_discount_pct: 20,
        expiry_days: 30,
      }),
    );

    const result = await engine.resolveReward("biz-1", "cus-1", 4);
    expect(result.creditsEarned).toBe(10000);
    expect(result.tierLabel).toBe("₦100 per visit");
    expect(result.nudgeMessage).toBe("7 visits → ₦150 bonus");
  });

  it("visit 11+ awards ₦150", async () => {
    const ledger: PointsLedgerRecord[] = [];
    const pointsRepo: PointsLedgerRepository = {
      addEntry: async (entry) => {
        const row = { ...entry, id: `pl-${ledger.length}`, createdAt: new Date() } as PointsLedgerRecord;
        ledger.push(row);
        return row;
      },
      getBalance: async (_b, _c) =>
        ledger
          .filter(
            (e) =>
              e.businessId === _b &&
              e.customerId === _c &&
              (!e.expiresAt || e.expiresAt > new Date()),
          )
          .reduce((s, e) => s + e.amount, 0),
      listEntries: async () => [],
    };

    const engine = new LoyaltyEngine(
      pointsRepo,
      stubTenant({
        tiers: [
          { from: 1, to: 3, credits_kobo: 5000 },
          { from: 4, to: 10, credits_kobo: 10000 },
          { from: 11, to: null, credits_kobo: 15000 },
        ],
        min_redemption_kobo: 50000,
        max_discount_pct: 20,
        expiry_days: 30,
      }),
    );

    const result = await engine.resolveReward("biz-1", "cus-1", 11);
    expect(result.creditsEarned).toBe(15000);
    expect(result.tierLabel).toBe("₦150 per visit");
  });
});
