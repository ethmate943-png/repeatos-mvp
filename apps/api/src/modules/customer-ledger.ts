import type { CustomerLedgerRepository } from "./repository.js";

export class CustomerLedgerService {
  constructor(private readonly repository: CustomerLedgerRepository) {}

  async findExistingCustomer(businessId: string, phone: string) {
    return this.repository.findByBusinessAndPhone(businessId, phone);
  }

  async recordCheckin(input: {
    businessId: string;
    phone: string;
    name?: string;
    token: string;
    ip?: string;
    userAgent?: string;
  }) {
    const customer = await this.repository.upsertVisit(
      input.businessId,
      input.phone,
      input.name,
    );
    const previousScans = await this.repository.countScans(input.businessId, customer.id);
    const currentVisitCount = previousScans + 1;
    
    await this.repository.insertScan({
      businessId: input.businessId,
      customerId: customer.id,
      phone: input.phone,
      token: input.token,
      visitCount: currentVisitCount,
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return {
      customer,
      visitCount: currentVisitCount
    };
  }
}
