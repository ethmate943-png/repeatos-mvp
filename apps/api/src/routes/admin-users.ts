import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import { adminUser } from "../modules/services.js";

const businessQuerySchema = z.object({
  businessId: z.string().min(1),
});

const createAdminSchema = z.object({
  businessId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const createCustomerSchema = z.object({
  businessId: z.string().min(1),
  phone: z.string().min(10), // Basic phone validation
});

export async function adminUserRoutes(app: FastifyInstance) {
  // Middleware/Hook for API Key check on all /admin/* routes in this plugin
  app.addHook("preHandler", async (request, reply) => {
    const apiKey = request.headers["x-admin-api-key"];
    if (apiKey !== config.adminApiKey) {
      return reply.status(401).send({
        code: "UNAUTHORIZED",
        message: "Invalid admin API key.",
      });
    }
  });

  // List Staff (Admins)
  app.get("/admin/users", async (request, reply) => {
    const parsed = businessQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        code: "INVALID_QUERY",
        message: "businessId is required.",
      });
    }

    const admins = await adminUser.listAdmins(parsed.data.businessId);
    return reply.status(200).send(admins);
  });

  // Create Staff (Admin)
  app.post("/admin/users", async (request, reply) => {
    const parsed = createAdminSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: "INVALID_BODY",
        message: parsed.error.message,
      });
    }

    const admin = await adminUser.createAdmin({
      businessId: parsed.data.businessId,
      email: parsed.data.email,
      passwordHash: parsed.data.password, // In real app, hash this with bcrypt
    });

    return reply.status(201).send(admin);
  });

  // List Customers
  app.get("/admin/customers", async (request, reply) => {
    const parsed = businessQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        code: "INVALID_QUERY",
        message: "businessId is required.",
      });
    }

    const customers = await adminUser.listCustomers(parsed.data.businessId);
    return reply.status(200).send(customers);
  });
}
