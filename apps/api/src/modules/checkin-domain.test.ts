import { describe, expect, it } from "vitest";
import { CheckinDomainService } from "./checkin-domain.js";
import type { CustomerRecord, TenantContext } from "./types.js";

const now = new Date();

const tenant: TenantContext = {
  businessId: "biz-1",
  allowedOrigins: ["https://vendor.com"],
  token: "token-1",
};

const customer: CustomerRecord = {
  id: "cus-1",
  businessId: "biz-1",
  phone: "+123",
  firstSeen: now,
  lastSeen: now,
};

describe("CheckinDomainService", () => {
  it("executes full checkin and returns visit count + points + reward", async () => {
    const service = new CheckinDomainService(
      {
        resolveTenantFromToken: async () => tenant,
        assertOriginAllowed: () => undefined,
      },
      {
        assertCooldownNotActive: async () => undefined,
      },
      {
        findExistingCustomer: async () => customer,
        recordCheckin: async () => ({ customer, visitCount: 5 }),
      },
      {
        resolveReward: async () => ({
          pointsBalance: 0,
          reward: {
            label: "Free Coffee",
            code: "ABCDEFGH",
            valueKobo: 5000,
            expiresAt: new Date("2030-01-01T00:00:00.000Z"),
          },
        }),
      },
    );

    const result = await service.executeCheckin({
      token: "token-1",
      phone: " +123 ",
      origin: "https://vendor.com",
    });

    expect(result.visitCount).toBe(5);
    expect(result.pointsBalance).toBe(0);
    expect(result.reward).toEqual({
      label: "Free Coffee",
      code: "ABCDEFGH",
      valueKobo: 5000,
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
  });

  it("returns null reward when no threshold matches", async () => {
    const service = new CheckinDomainService(
      {
        resolveTenantFromToken: async () => tenant,
        assertOriginAllowed: () => undefined,
      },
      {
        assertCooldownNotActive: async () => undefined,
      },
      {
        findExistingCustomer: async () => null,
        recordCheckin: async () => ({ customer, visitCount: 1 }),
      },
      {
        resolveReward: async () => ({ pointsBalance: 1000, reward: null }),
      },
    );

    const result = await service.executeCheckin({
      token: "token-1",
      phone: "+123",
      origin: "https://vendor.com",
    });

    expect(result.visitCount).toBe(1);
    expect(result.pointsBalance).toBe(1000);
    expect(result.reward).toBeNull();
  });
});
