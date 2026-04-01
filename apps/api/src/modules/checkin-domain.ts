import type {
  CheckinRequestContext,
  CheckinResult,
  CustomerRecord,
  TenantContext,
} from "./types.js";

type TenantSecurityPort = {
  resolveTenantFromToken(token: string): Promise<TenantContext>;
  assertOriginAllowed(tenant: TenantContext, origin?: string): void;
};

type AntiAbusePort = {
  assertCooldownNotActive(customerId: string): Promise<void>;
};

type CustomerLedgerPort = {
  findExistingCustomer(
    businessId: string,
    phone: string,
  ): Promise<CustomerRecord | null>;
  recordCheckin(input: {
    businessId: string;
    phone: string;
    token: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ customer: CustomerRecord; visitCount: number }>;
};

type LoyaltyEnginePort = {
  resolveReward(
    businessId: string,
    visitCount: number,
  ): Promise<{ label: string } | null>;
};

export class CheckinDomainService {
  constructor(
    private readonly tenantSecurity: TenantSecurityPort,
    private readonly antiAbuse: AntiAbusePort,
    private readonly customerLedger: CustomerLedgerPort,
    private readonly loyaltyEngine: LoyaltyEnginePort,
  ) {}

  async executeCheckin(input: CheckinRequestContext): Promise<CheckinResult> {
    const normalizedPhone = input.phone.replace(/\s+/g, "");
    const tenant = await this.tenantSecurity.resolveTenantFromToken(input.token);
    this.tenantSecurity.assertOriginAllowed(tenant, input.origin);

    const existingCustomer = await this.customerLedger.findExistingCustomer(
      tenant.businessId,
      normalizedPhone,
    );
    if (existingCustomer) {
      await this.antiAbuse.assertCooldownNotActive(existingCustomer.id);
    }

    const checkin = await this.customerLedger.recordCheckin({
      businessId: tenant.businessId,
      phone: normalizedPhone,
      token: input.token,
      ip: input.ip,
      userAgent: input.userAgent,
    });
    
    const visitCount = checkin.visitCount;

    const reward = await this.loyaltyEngine.resolveReward(
      tenant.businessId,
      visitCount,
    );

    return {
      visitCount,
      reward,
    };
  }
}
