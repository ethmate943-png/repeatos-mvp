import { describe, expect, it } from "vitest";
import { TenantSecurityService } from "./tenant-security.js";
import type { TenantRepository } from "./repository.js";

const stubRepo: TenantRepository = {
  findTenantByToken: async () => ({
    businessId: "biz-1",
    allowedOrigins: ["https://vendor.com"],
    token: "token-1",
  }),
  getBusiness: async () => null,
};

describe("TenantSecurityService", () => {
  it("resolves tenant from valid token", async () => {
    const service = new TenantSecurityService(stubRepo);
    const tenant = await service.resolveTenantFromToken("token-1");
    expect(tenant.businessId).toBe("biz-1");
  });

  it("throws INVALID_TOKEN for unknown token", async () => {
    const service = new TenantSecurityService({
      ...stubRepo,
      findTenantByToken: async () => null,
    });
    await expect(service.resolveTenantFromToken("bad")).rejects.toThrowError();
  });

  it("throws ORIGIN_NOT_ALLOWED for wrong origin", () => {
    const service = new TenantSecurityService(stubRepo);
    expect(() =>
      service.assertOriginAllowed(
        { businessId: "biz-1", allowedOrigins: ["https://vendor.com"], token: "token-1" },
        "https://evil.com",
      ),
    ).toThrowError();
  });

  it("passes for matching origin", () => {
    const service = new TenantSecurityService(stubRepo);
    expect(() =>
      service.assertOriginAllowed(
        { businessId: "biz-1", allowedOrigins: ["https://vendor.com"], token: "token-1" },
        "https://vendor.com",
      ),
    ).not.toThrow();
  });

  it("passes for wildcard origin", () => {
    const service = new TenantSecurityService(stubRepo);
    expect(() =>
      service.assertOriginAllowed(
        { businessId: "biz-1", allowedOrigins: ["*"], token: "token-1" },
        "https://anything.com",
      ),
    ).not.toThrow();
  });
});
