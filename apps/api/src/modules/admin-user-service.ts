import type { AdminRepository, CustomerLedgerRepository } from "./repository.js";
import type { AdminRecord, CustomerRecord } from "./types.js";

export class AdminUserService {
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly customerRepo: CustomerLedgerRepository
  ) {}

  async listAdmins(businessId: string): Promise<AdminRecord[]> {
    return this.adminRepo.listAdmins(businessId);
  }

  async findAdminById(businessId: string, adminId: string): Promise<AdminRecord | null> {
    return this.adminRepo.findAdminById(businessId, adminId);
  }

  async createAdmin(input: {
    businessId: string;
    email: string;
    passwordHash: string;
  }): Promise<AdminRecord> {
    return this.adminRepo.createAdmin(input);
  }

  async deleteAdmin(id: string): Promise<void> {
    return this.adminRepo.deleteAdmin(id);
  }

  async listCustomers(businessId: string): Promise<CustomerRecord[]> {
    return this.customerRepo.listCustomers(businessId);
  }
}
