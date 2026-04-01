import { describe, expect, it } from "vitest";
import { LoyaltyEngine } from "./loyalty-engine.js";
import type { PointsLedgerRepository, VoucherRepository, TenantRepository, CustomerLedgerRepository } from "./repository.js";

const stubPoints: PointsLedgerRepository = {
  addEntry: async () => { throw new Error("unused"); },
  getBalance: async () => 0,
  listEntries: async () => [],
};

const stubVoucher: VoucherRepository = {
  createVoucher: async () => { throw new Error("unused"); },
  getVoucherByCode: async () => null,
  listActiveVouchers: async () => [],
  markRedeemed: async () => {},
};

const stubCustomer: CustomerLedgerRepository = {
  findByBusinessAndPhone: async () => null,
  upsertVisit: async () => { throw new Error("unused"); },
  insertScan: async () => { throw new Error("unused"); },
  hasRecentScan: async () => false,
  countScans: async () => 0,
  listCustomers: async () => [],
};

describe("LoyaltyEngine", () => {
  it("returns reward when visit count matches threshold", async () => {
    const tenantRepo: TenantRepository = {
      findTenantByToken: async () => null,
      getBusiness: async () => ({
        loyaltyConfig: {
          thresholds: [{ visits: 5, reward: 5000 }],
          expiry_days: 30,
          min_order: 1000,
          max_discount_percent: 20,
        },
      }),
    };

    const engine = new LoyaltyEngine(stubPoints, stubVoucher, tenantRepo, stubCustomer);
    const reward = await engine.resolveReward("biz-1", 5);
    expect(reward).toEqual({ label: "5 Point Reward" });
  });

  it("returns null when no threshold matches", async () => {
    const tenantRepo: TenantRepository = {
      findTenantByToken: async () => null,
      getBusiness: async () => ({
        loyaltyConfig: {
          thresholds: [{ visits: 5, reward: 5000 }],
          expiry_days: 30,
          min_order: 1000,
          max_discount_percent: 20,
        },
      }),
    };

    const engine = new LoyaltyEngine(stubPoints, stubVoucher, tenantRepo, stubCustomer);
    const reward = await engine.resolveReward("biz-1", 2);
    expect(reward).toBeNull();
  });

  it("returns null when business has no loyalty config", async () => {
    const tenantRepo: TenantRepository = {
      findTenantByToken: async () => null,
      getBusiness: async () => ({}),
    };

    const engine = new LoyaltyEngine(stubPoints, stubVoucher, tenantRepo, stubCustomer);
    const reward = await engine.resolveReward("biz-1", 5);
    expect(reward).toBeNull();
  });
});
