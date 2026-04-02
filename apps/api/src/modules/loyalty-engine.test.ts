import { describe, expect, it } from "vitest";
import { LoyaltyEngine } from "./loyalty-engine.js";
import type { PointsLedgerRepository, VoucherRepository, TenantRepository } from "./repository.js";

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

describe("LoyaltyEngine", () => {
  it("awards points and issues voucher when threshold is crossed", async () => {
    const tenantRepo: TenantRepository = {
      findTenantByToken: async () => null,
      getBusiness: async () => ({
        loyaltyConfig: {
          points_per_visit: 5000,
          thresholds: [{ points: 25000, value_kobo: 5000, label: "Free Coffee" }],
          expiry_days: 30,
          min_order_kobo: 50000,
          max_discount_pct: 20,
        },
      }),
    };

    let getBalanceCalls = 0;
    const pointsRepo: PointsLedgerRepository = {
      addEntry: async (entry) =>
        ({
          id: "pl-1",
          createdAt: new Date(),
          ...entry,
        }) as any,
      getBalance: async () => {
        getBalanceCalls += 1;
        return getBalanceCalls === 1 ? 25000 : 0;
      },
      listEntries: async () => [],
    };

    const voucherRepo: VoucherRepository = {
      createVoucher: async (input) =>
        ({
          id: "v-1",
          issuedAt: new Date(),
          ...input,
        }) as any,
      getVoucherByCode: async () => null,
      listActiveVouchers: async () => [],
      markRedeemed: async () => {},
    };

    const engine = new LoyaltyEngine(pointsRepo, voucherRepo, tenantRepo);
    const result = await engine.resolveReward("biz-1", "cus-1", 5);

    expect(result.pointsBalance).toBe(0);
    expect(result.reward).not.toBeNull();
    expect(result.reward?.label).toBe("Free Coffee");
    expect(result.reward?.valueKobo).toBe(5000);
    expect(result.reward?.code).toHaveLength(8);
  });

  it("returns null reward when no threshold matches", async () => {
    const tenantRepo: TenantRepository = {
      findTenantByToken: async () => null,
      getBusiness: async () => ({
        loyaltyConfig: {
          points_per_visit: 5000,
          thresholds: [{ points: 25000, value_kobo: 5000, label: "Free Coffee" }],
          expiry_days: 30,
          min_order_kobo: 50000,
          max_discount_pct: 20,
        },
      }),
    };

    let getBalanceCalls = 0;
    const pointsRepo: PointsLedgerRepository = {
      addEntry: async (entry) =>
        ({
          id: "pl-1",
          createdAt: new Date(),
          ...entry,
        }) as any,
      getBalance: async () => {
        getBalanceCalls += 1;
        return getBalanceCalls === 1 ? 10000 : 10000; // no redeem => second call not used
      },
      listEntries: async () => [],
    };

    const voucherRepo: VoucherRepository = {
      createVoucher: async () => { throw new Error("should not issue voucher"); },
      getVoucherByCode: async () => null,
      listActiveVouchers: async () => [],
      markRedeemed: async () => {},
    };

    const engine = new LoyaltyEngine(pointsRepo, voucherRepo, tenantRepo);
    const result = await engine.resolveReward("biz-1", "cus-1", 2);
    expect(result.reward).toBeNull();
    expect(result.pointsBalance).toBe(10000);
  });

  it("falls back to default config when loyalty_config is missing", async () => {
    const tenantRepo: TenantRepository = {
      findTenantByToken: async () => null,
      getBusiness: async () => ({}),
    };

    const pointsRepo: PointsLedgerRepository = {
      addEntry: async (entry) =>
        ({
          id: "pl-1",
          createdAt: new Date(),
          ...entry,
        }) as any,
      getBalance: async () => 0,
      listEntries: async () => [],
    };

    const voucherRepo: VoucherRepository = {
      createVoucher: async () => { throw new Error("should not issue voucher"); },
      getVoucherByCode: async () => null,
      listActiveVouchers: async () => [],
      markRedeemed: async () => {},
    };

    const engine = new LoyaltyEngine(pointsRepo, voucherRepo, tenantRepo);
    const result = await engine.resolveReward("biz-1", "cus-1", 5);
    expect(result.reward).toBeNull();
    expect(result.pointsBalance).toBe(0);
  });
});
