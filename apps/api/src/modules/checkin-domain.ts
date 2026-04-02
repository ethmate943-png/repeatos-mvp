import {
  DomainError,
  type CheckinRequestContext,
  type CheckinResult,
  type CustomerRecord,
  type Reward,
  type TenantContext,
} from "./types.js";
import type { CustomerSessionRecord } from "./types.js";

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
    name?: string;
    token: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ customer: CustomerRecord; visitCount: number }>;
};

type CustomerSessionPort = {
  findSessionById(sessionId: string): Promise<CustomerSessionRecord | null>;
  createSession(input: {
    businessId: string;
    customerId: string;
    phone: string;
  }): Promise<CustomerSessionRecord>;
};

type LoyaltyEnginePort = {
  resolveReward(
    businessId: string,
    customerId: string,
    visitCount: number,
  ): Promise<{ pointsBalance: number; reward: Reward }>;
};

export class CheckinDomainService {
  constructor(
    private readonly tenantSecurity: TenantSecurityPort,
    private readonly antiAbuse: AntiAbusePort,
    private readonly customerLedger: CustomerLedgerPort,
    private readonly customerSessions: CustomerSessionPort,
    private readonly loyaltyEngine: LoyaltyEnginePort,
  ) {}

  async executeCheckin(input: CheckinRequestContext): Promise<CheckinResult> {
    const tenant = await this.tenantSecurity.resolveTenantFromToken(input.token);
    this.tenantSecurity.assertOriginAllowed(tenant, input.origin);

    // Returning customer path: use saved opaque session id.
    if (input.sessionId) {
      const session = await this.customerSessions.findSessionById(input.sessionId);
      if (!session || session.businessId !== tenant.businessId) {
        // Reuse invalid token semantics since the session is the identity boundary.
        throw new DomainError(
          "INVALID_TOKEN",
          "Session is invalid or expired.",
        );
      }

      await this.antiAbuse.assertCooldownNotActive(session.customerId);

      const checkin = await this.customerLedger.recordCheckin({
        businessId: tenant.businessId,
        phone: session.phone,
        token: input.token,
        ip: input.ip,
        userAgent: input.userAgent,
      });

      const visitCount = checkin.visitCount;
      const customerId = checkin.customer.id;

      const { pointsBalance, reward } = await this.loyaltyEngine.resolveReward(
        tenant.businessId,
        customerId,
        visitCount,
      );

      return {
        visitCount,
        pointsBalance,
        reward,
      };
    }

    // First-time path: require name + phone (validated by request schema).
    if (!input.phone || !input.name) {
      // Failsafe: should never happen because scan route validates.
      throw new DomainError(
        "INVALID_TOKEN",
        "Missing phone or name.",
      );
    }

    const normalizedPhone = input.phone.replace(/\s+/g, "");

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
      name: input.name,
      token: input.token,
      ip: input.ip,
      userAgent: input.userAgent,
    });

    const visitCount = checkin.visitCount;
    const customerId = checkin.customer.id;

    const { pointsBalance, reward } = await this.loyaltyEngine.resolveReward(
      tenant.businessId,
      customerId,
      visitCount,
    );

    const session = await this.customerSessions.createSession({
      businessId: tenant.businessId,
      customerId,
      phone: normalizedPhone,
    });

    return {
      visitCount,
      pointsBalance,
      reward,
      sessionId: session.id,
    };
  }
}
