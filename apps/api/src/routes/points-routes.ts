import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pointsService, tenantSecurity, customerLedger } from "../modules/services.js";

const querySchema = z.object({
  token: z.string(),
  phone: z.string(),
});

export async function pointsRoutes(app: FastifyInstance) {
  app.get("/loyalty/status", async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid query" });

    const { token, phone } = parsed.data;

    try {
      const tenant = await tenantSecurity.resolveTenantFromToken(token);
      const customer = await customerLedger.findExistingCustomer(tenant.businessId, phone);
      if (!customer) return reply.status(404).send({ error: "Customer not found" });

      const balance = await pointsService.getBalance(tenant.businessId, customer.id);
      const vouchers = await pointsService.listVouchers(tenant.businessId, customer.id);
      const history = await pointsService.listHistory(tenant.businessId, customer.id);

      return reply.send({
        balance,
        vouchers,
        history,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch loyalty status" });
    }
  });
}
