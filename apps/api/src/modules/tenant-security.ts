import { DomainError, type TenantContext } from "./types.js";
import type { TenantRepository } from "./repository.js";

export class TenantSecurityService {
  constructor(private readonly tenantRepository: TenantRepository) {}

  async resolveTenantFromToken(token: string): Promise<TenantContext> {
    const tenant = await this.tenantRepository.findTenantByToken(token);
    if (!tenant) {
      throw new DomainError(
        "INVALID_TOKEN",
        "QR token is invalid or inactive.",
      );
    }
    return tenant;
  }

  assertOriginAllowed(tenant: TenantContext, origin?: string): void {
    if (tenant.allowedOrigins.includes("*")) return;
    if (!origin || !tenant.allowedOrigins.includes(origin)) {
      throw new DomainError(
        "ORIGIN_NOT_ALLOWED",
        "Origin is not allowed for this business.",
      );
    }
  }
}
