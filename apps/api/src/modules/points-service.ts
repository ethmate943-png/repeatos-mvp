import type {
  PointsLedgerRepository,
  VoucherRepository,
} from "./repository.js";
import type {
  PointsLedgerRecord,
  VoucherRecord,
} from "./types.js";

export class PointsService {
  constructor(
    public readonly pointsRepo: PointsLedgerRepository,
    public readonly voucherRepo: VoucherRepository,
  ) {}

  async getBalance(businessId: string, customerId: string): Promise<number> {
    return this.pointsRepo.getBalance(businessId, customerId);
  }

  async listHistory(businessId: string, customerId: string): Promise<PointsLedgerRecord[]> {
    return this.pointsRepo.listEntries(businessId, customerId);
  }

  async listVouchers(businessId: string, customerId: string): Promise<VoucherRecord[]> {
    return this.voucherRepo.listActiveVouchers(businessId, customerId);
  }
}
