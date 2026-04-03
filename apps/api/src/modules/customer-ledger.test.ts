import { describe, expect, it } from "vitest";
import { CustomerLedgerService } from "./customer-ledger.js";
import type { CustomerLedgerRepository } from "./repository.js";

const now = new Date();

const stubRepo: CustomerLedgerRepository = {
  findByBusinessAndPhone: async () => null,
  findCustomerById: async () => null,
  hasRecentScan: async () => false,
  countScans: async () => 1,
  listCustomers: async () => [],
  upsertVisit: async () => ({
    id: "cus-1",
    businessId: "biz-1",
    phone: "+123",
    firstSeen: now,
    lastSeen: now,
  }),
  insertScan: async () => ({
    id: "scan-1",
    businessId: "biz-1",
    customerId: "cus-1",
    phone: "+123",
    token: "token-1",
    visitCount: 2,
    scannedAt: now,
  }),
};

describe("CustomerLedgerService", () => {
  it("records checkin and returns visit count", async () => {
    const service = new CustomerLedgerService(stubRepo);
    const result = await service.recordCheckin({
      businessId: "biz-1",
      phone: "+123",
      token: "token-1",
    });

    expect(result.customer.id).toBe("cus-1");
    expect(result.visitCount).toBe(2);
  });
});
