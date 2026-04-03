import cron from "node-cron";
import type { Pool } from "pg";

/**
 * Marks expired award rows as type `expire` for analytics. Balance already ignores
 * expired rows via `expires_at` in getBalance.
 */
export function startCreditExpiryJob(db: Pool): void {
  cron.schedule("0 2 * * *", async () => {
    const result = await db.query(
      `UPDATE points_ledger
       SET type = 'expire'
       WHERE type = 'award'
         AND expires_at < NOW()
         AND expires_at IS NOT NULL`,
    );
    console.log(`[expireCredits] marked ${result.rowCount} rows expired`);
  });
}
