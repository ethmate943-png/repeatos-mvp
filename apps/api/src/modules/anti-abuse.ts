import { DomainError } from "./types.js";
import type { CustomerLedgerRepository } from "./repository.js";

export class AntiAbuseService {
  constructor(
    private readonly customerLedger: CustomerLedgerRepository,
    private readonly cooldownSeconds = 60,
  ) {}

  async assertCooldownNotActive(customerId: string): Promise<void> {
    const blocked = await this.customerLedger.hasRecentScan(
      customerId,
      this.cooldownSeconds,
    );

    if (blocked) {
      throw new DomainError(
        "COOLDOWN_ACTIVE",
        "This customer has scanned too recently.",
      );
    }
  }
}
