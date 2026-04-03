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

const sampleCredits = {
  creditsEarned: 5000,
  creditBalance: 5000,
  nudgeMessage: "3 visits → ₦100 bonus",
  tierLabel: "₦50 per visit",
};

describe("CheckinDomainService", () => {
  it("executes full checkin and returns credits + session", async () => {
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
          creditsEarned: 10000,
          creditBalance: 45000,
          nudgeMessage: "6 visits → ₦150 bonus",
          tierLabel: "₦100 per visit",
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
    expect(result.customerName).toBe("Test Name");
    expect(result.credits.creditBalance).toBe(45000);
    expect(result.credits.creditsEarned).toBe(10000);
    expect(result.reward).toBeNull();
    expect(result.sessionId).toBe("sess-1");
  });

  it("returns reward null for first visit credits", async () => {
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
        resolveReward: async () => sampleCredits,
      },
    );

    const result = await service.executeCheckin({
      token: "token-1",
      phone: "+123",
      name: "Test Name",
      origin: "https://vendor.com",
    });

    expect(result.visitCount).toBe(1);
    expect(result.credits).toEqual(sampleCredits);
    expect(result.reward).toBeNull();
    expect(result.sessionId).toBe("sess-2");
  });

  it("executes returning checkin with session id", async () => {
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
        resolveReward: async () => ({
          creditsEarned: 5000,
          creditBalance: 12340,
          nudgeMessage: "2 visits → ₦100 bonus",
          tierLabel: "₦50 per visit",
        }),
      },
    );

    const result = await service.executeCheckin({
      token: "token-1",
      sessionId: "sess-3",
      origin: "https://vendor.com",
    });

    expect(result.visitCount).toBe(2);
    expect(result.customerName).toBe("Test Name");
    expect(result.credits.creditBalance).toBe(12340);
    expect(result.reward).toBeNull();
    expect(result.sessionId).toBeUndefined();
  });
});
