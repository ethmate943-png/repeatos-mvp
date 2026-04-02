import { describe, expect, it } from "vitest";
import { DomainError } from "./types.js";
import { SessionInfoService } from "./session-info.js";
import type { CustomerRecord, TenantContext } from "./types.js";

const now = new Date();

const tenant: TenantContext = {
  businessId: "biz-1",
  allowedOrigins: ["https://vendor.com"],
  token: "token-1",
};

const customer: CustomerRecord = {
  id: "cus-1",
  businessId: tenant.businessId,
  phone: "+2348012345678",
  name: "Alice",
  firstSeen: now,
  lastSeen: now,
};

describe("SessionInfoService", () => {
  it("resolves customer name from session id", async () => {
    const service = new SessionInfoService(
      {
        resolveTenantFromToken: async () => tenant,
        assertOriginAllowed: () => undefined,
      },
      {
        findSessionById: async () => ({
          id: "sess-1",
          businessId: tenant.businessId,
          customerId: customer.id,
          phone: customer.phone,
          createdAt: now,
          lastSeen: now,
        }),
      },
      {
        findExistingCustomer: async () => customer,
      },
    );

    const result = await service.resolveCustomerName({
      token: tenant.token,
      sessionId: "sess-1",
    });

    expect(result.customerName).toBe("Alice");
  });

  it("throws INVALID_TOKEN for invalid session id", async () => {
    const service = new SessionInfoService(
      {
        resolveTenantFromToken: async () => tenant,
        assertOriginAllowed: () => undefined,
      },
      {
        findSessionById: async () => null,
      },
      {
        findExistingCustomer: async () => null,
      },
    );

    await expect(
      service.resolveCustomerName({
        token: tenant.token,
        sessionId: "missing",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_TOKEN",
      message: "Session is invalid or expired.",
    });
  });

  it("returns null if customer record is missing", async () => {
    const service = new SessionInfoService(
      {
        resolveTenantFromToken: async () => tenant,
        assertOriginAllowed: () => undefined,
      },
      {
        findSessionById: async () => ({
          id: "sess-2",
          businessId: tenant.businessId,
          customerId: "cus-missing",
          phone: "+2348012345678",
          createdAt: now,
          lastSeen: now,
        }),
      },
      {
        findExistingCustomer: async () => null,
      },
    );

    const result = await service.resolveCustomerName({
      token: tenant.token,
      sessionId: "sess-2",
    });

    expect(result.customerName).toBeNull();
  });
});

