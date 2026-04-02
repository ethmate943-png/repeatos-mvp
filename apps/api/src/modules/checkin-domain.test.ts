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
  name: "Test Name",
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
        findSessionById: async () => null,
        createSession: async () => ({
          id: "sess-1",
          businessId: tenant.businessId,
          customerId: customer.id,
          phone: customer.phone,
          createdAt: now,
          lastSeen: now,
        }),
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
      name: "Test Name",
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
    expect(result.sessionId).toBe("sess-1");
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
        findSessionById: async () => null,
        createSession: async () => ({
          id: "sess-2",
          businessId: tenant.businessId,
          customerId: customer.id,
          phone: customer.phone,
          createdAt: now,
          lastSeen: now,
        }),
      },
      {
        resolveReward: async () => ({ pointsBalance: 1000, reward: null }),
      },
    );

    const result = await service.executeCheckin({
      token: "token-1",
      phone: "+123",
      name: "Test Name",
      origin: "https://vendor.com",
    });

    expect(result.visitCount).toBe(1);
    expect(result.pointsBalance).toBe(1000);
    expect(result.reward).toBeNull();
    expect(result.sessionId).toBe("sess-2");
  });

  it("executes returning checkin with session id and skips name/phone capture", async () => {
    const session = {
      id: "sess-3",
      businessId: tenant.businessId,
      customerId: customer.id,
      phone: customer.phone,
      createdAt: now,
      lastSeen: now,
    };

    const assertCooldownNotActive = (() => {
      let calls = 0;
      return async (customerId: string) => {
        calls += 1;
        expect(customerId).toBe(customer.id);
      };
    })();

    const service = new CheckinDomainService(
      {
        resolveTenantFromToken: async () => tenant,
        assertOriginAllowed: () => undefined,
      },
      {
        assertCooldownNotActive,
      },
      {
        findExistingCustomer: async () => {
          throw new Error("should not be called for returning flow");
        },
        recordCheckin: async (input) => {
          expect(input.phone).toBe(customer.phone);
          expect(input.name).toBeUndefined();
          return { customer, visitCount: 2 };
        },
      },
      {
        findSessionById: async () => session,
        createSession: async () => {
          throw new Error("should not create a session for returning flow");
        },
      },
      {
        resolveReward: async () => ({ pointsBalance: 1234, reward: null }),
      },
    );

    const result = await service.executeCheckin({
      token: "token-1",
      sessionId: "sess-3",
      origin: "https://vendor.com",
    });

    expect(result.visitCount).toBe(2);
    expect(result.pointsBalance).toBe(1234);
    expect(result.reward).toBeNull();
    expect(result.sessionId).toBeUndefined();
  });
});
