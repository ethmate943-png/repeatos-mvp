import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { orderService, tenantSecurity, customerLedger } from "../modules/services.js";
import { OrderStatus } from "../modules/types.js";

const createOrderSchema = z.object({
  token: z.string(),
  phone: z.string(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number(),
    priceKobo: z.number(),
  })),
  totalKobo: z.number(),
  tableRef: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export async function orderRoutes(app: FastifyInstance) {
  // Customer: Place an order
  app.post("/orders", async (request, reply) => {
    const parsed = createOrderSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid payload" });

    const { token, phone, items, totalKobo, tableRef } = parsed.data;

    try {
      const tenant = await tenantSecurity.resolveTenantFromToken(token);
      const customer = await customerLedger.findExistingCustomer(tenant.businessId, phone);
      if (!customer) return reply.status(404).send({ error: "Customer not found. Scan QR first." });

      const order = await orderService.createOrder({
        businessId: tenant.businessId,
        customerId: customer.id,
        items,
        totalKobo,
        status: OrderStatus.PENDING,
        tableRef,
      });

      return reply.status(201).send(order);
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: "Failed to create order" });
    }
  });

  // Admin: List orders for a business
  app.get("/admin/orders", async (request, reply) => {
    // In a real app, businessId comes from JWT
    const { businessId } = request.query as { businessId: string };
    if (!businessId) return reply.status(400).send({ error: "Missing businessId" });

    const orders = await orderService.listOrders(businessId);
    return reply.send(orders);
  });

  // Admin: Update order status
  app.patch("/admin/orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateStatusSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid status" });

    try {
      const order = await orderService.updateStatus(id, parsed.data.status);
      return reply.send(order);
    } catch (err) {
      app.log.error(err);
      return reply.status(404).send({ error: "Order not found" });
    }
  });
}
