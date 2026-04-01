import { describe, expect, it } from "vitest";
import { AntiAbuseService } from "./anti-abuse.js";
import type { CustomerLedgerRepository } from "./repository.js";

const baseRepo: CustomerLedgerRepository = {
  findByBusinessAndPhone: async () => null,
  upsertVisit: async () => { throw new Error("unused"); },
  insertScan: async () => { throw new Error("unused"); },
  hasRecentScan: async () => false,
  countScans: async () => 0,
  listCustomers: async () => [],
};

describe("AntiAbuseService", () => {
  it("passes when cooldown is not active", async () => {
    const service = new AntiAbuseService(baseRepo, 60);
    await expect(service.assertCooldownNotActive("customer-1")).resolves.toBeUndefined();
  });

  it("throws COOLDOWN_ACTIVE when scan is too recent", async () => {
    const service = new AntiAbuseService(
      { ...baseRepo, hasRecentScan: async () => true },
      60,
    );
    await expect(service.assertCooldownNotActive("customer-1")).rejects.toThrowError();
  });
});
