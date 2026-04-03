import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../modules/db.js";
import { parseTieredLoyaltyConfig } from "../modules/loyalty-engine.js";
import { PostgresRepository } from "../modules/postgres-repository.js";
import { requireAdminApiKey } from "../plugins/admin-api-key.js";

const paramsSchema = z.object({
  customerId: z.string().uuid(),
});

const bodySchema = z.object({
  business_id: z.string().uuid(),
  amount_kobo: z.number().int().positive(),
  order_value_kobo: z.number().int().nonnegative(),
  note: z.string().min(1),
});

const repo = new PostgresRepository(pool);

export async function adminCustomerRedeemRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdminApiKey);

  app.post("/admin/customers/:customerId/redeem", async (request, reply) => {
    const paramsParsed = paramsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.status(400).send({
        code: "INVALID_PARAMS",
        message: "Invalid customer id.",
      });
    }

    const bodyParsed = bodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return reply.status(400).send({
        code: "INVALID_PAYLOAD",
        message: "Invalid redeem payload.",
      });
    }

    const customerId = paramsParsed.data.customerId;
    const { business_id, amount_kobo, order_value_kobo, note } = bodyParsed.data;

    const customer = await repo.findCustomerById(business_id, customerId);
    if (!customer) {
      return reply.status(404).send({
        code: "NOT_FOUND",
        message: "Customer not found for this business.",
      });
    }

    const business = await repo.getBusiness(business_id);
    if (!business) {
      return reply.status(404).send({
        code: "NOT_FOUND",
        message: "Business not found.",
      });
    }

    const loyalty = parseTieredLoyaltyConfig(
      business.loyaltyConfig ?? business.loyalty_config,
    );
    const balance = await repo.getBalance(business_id, customerId);

    if (balance < loyalty.min_redemption_kobo) {
      return reply.status(400).send({
        code: "BELOW_MIN_REDEMPTION",
        message: `Balance must be at least ₦${loyalty.min_redemption_kobo / 100} to redeem.`,
      });
    }

    if (amount_kobo > balance) {
      return reply.status(400).send({
        code: "INSUFFICIENT_BALANCE",
        message: "Amount exceeds credit balance.",
      });
    }

    const maxDiscountKobo = Math.floor(
      (order_value_kobo * loyalty.max_discount_pct) / 100,
    );
    if (amount_kobo > maxDiscountKobo) {
      return reply.status(400).send({
        code: "DISCOUNT_CAP",
        message: `Amount exceeds ${loyalty.max_discount_pct}% of order value (max ₦${maxDiscountKobo / 100}).`,
      });
    }

    await repo.addEntry({
      businessId: business_id,
      customerId,
      type: "redeem",
      amount: -Math.abs(amount_kobo),
      note,
    });

    const newBalance = await repo.getBalance(business_id, customerId);

    return reply.status(200).send({
      success: true,
      amount_redeemed_kobo: amount_kobo,
      new_balance_kobo: newBalance,
    });
  });
}
