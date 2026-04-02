import {
  DomainError,
  type CustomerRecord,
  type CustomerSessionRecord,
  type TenantContext,
} from "./types.js";

type TenantSecurityPort = {
  resolveTenantFromToken(token: string): Promise<TenantContext>;
  assertOriginAllowed(tenant: TenantContext, origin?: string): void;
};

type CustomerSessionPort = {
  findSessionById(sessionId: string): Promise<CustomerSessionRecord | null>;
};

type CustomerLedgerPort = {
  findExistingCustomer(
    businessId: string,
    phone: string,
  ): Promise<CustomerRecord | null>;
};

export class SessionInfoService {
  constructor(
    private readonly tenantSecurity: TenantSecurityPort,
    private readonly customerSessions: CustomerSessionPort,
    private readonly customerLedger: CustomerLedgerPort,
  ) {}

  async resolveCustomerName(input: {
    token: string;
    sessionId: string;
    origin?: string;
  }): Promise<{ customerName: string | null }> {
    const tenant = await this.tenantSecurity.resolveTenantFromToken(input.token);
    this.tenantSecurity.assertOriginAllowed(tenant, input.origin);

    const session = await this.customerSessions.findSessionById(input.sessionId);
    if (!session || session.businessId !== tenant.businessId) {
      throw new DomainError(
        "INVALID_TOKEN",
        "Session is invalid or expired.",
      );
    }

    const customer = await this.customerLedger.findExistingCustomer(
      tenant.businessId,
      session.phone,
    );

    return { customerName: customer?.name ?? null };
  }
}

