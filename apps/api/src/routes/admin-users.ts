import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { adminUser } from "../modules/services.js";
import { pool } from "../modules/db.js";
import { PostgresRepository } from "../modules/postgres-repository.js";
import { parseTieredLoyaltyConfig } from "../modules/loyalty-engine.js";
import { requireAdminApiKey } from "../plugins/admin-api-key.js";

const adminRepo = new PostgresRepository(pool);

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

function adminPublic(admin: { id: string; email: string; createdAt: Date | string }) {
  const createdAt =
    admin.createdAt instanceof Date ? admin.createdAt.toISOString() : String(admin.createdAt);
  return {
    id: admin.id,
    email: admin.email,
    createdAt,
  };
}

export async function adminUserRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdminApiKey);

  app.get<{ Params: { adminId: string }; Querystring: { businessId: string } }>(
    "/admin/users/:adminId",
    async (request, reply) => {
      const params = z.object({ adminId: z.string().min(1).max(128) }).safeParse(request.params);
      const query = businessQuerySchema.safeParse(request.query);
      if (!params.success || !query.success) {
        return reply.status(400).send({
          code: "INVALID_QUERY",
          message: "Valid adminId and businessId are required.",
        });
      }

      const admin = await adminUser.findAdminById(query.data.businessId, params.data.adminId);
      if (!admin) {
        return reply.status(404).send({
          code: "NOT_FOUND",
          message: "Staff user not found for this business.",
        });
      }

      return reply.status(200).send(adminPublic(admin));
    },
  );

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
    return reply.status(200).send(admins.map((a) => adminPublic(a)));
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

    return reply.status(201).send(adminPublic(admin));
  });

  app.get("/admin/businesses", async (_request, reply) => {
    const businesses = await adminRepo.listBusinesses();
    return reply.status(200).send(businesses);
  });

  app.get<{ Params: { businessId: string } }>("/admin/businesses/:businessId", async (request, reply) => {
    const params = z.object({ businessId: z.string().min(1).max(128) }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        code: "INVALID_PARAMS",
        message: "Valid businessId is required.",
      });
    }

    const row = await adminRepo.getBusiness(params.data.businessId);
    if (!row) {
      return reply.status(404).send({
        code: "NOT_FOUND",
        message: "Business not found.",
      });
    }

    const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);

    return reply.status(200).send({
      id: row.id,
      name: row.name,
      slug: row.slug,
      integrationMode: row.integrationMode ?? row.integration_mode ?? "hosted",
      menuUrl: row.menuUrl ?? row.menu_url ?? null,
      allowedOrigins: row.allowedOrigins ?? row.allowed_origins ?? [],
      loyaltyConfig: row.loyaltyConfig ?? row.loyalty_config ?? {},
      createdAt: Number.isNaN(createdAt.getTime()) ? null : createdAt.toISOString(),
    });
  });

  app.get("/admin/menu", async (request, reply) => {
    const parsed = businessQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        code: "INVALID_QUERY",
        message: "businessId is required.",
      });
    }
    const items = await adminRepo.listAllMenuItems(parsed.data.businessId);
    return reply.status(200).send(items);
  });

  const createMenuItemSchema = z.object({
    businessId: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    priceKobo: z.number().int().positive(),
    category: z.string().optional(),
    available: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  });

  app.post("/admin/menu", async (request, reply) => {
    const parsed = createMenuItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: "INVALID_BODY",
        message: "businessId, name, and positive priceKobo are required.",
      });
    }
    const row = await adminRepo.createMenuItem({
      businessId: parsed.data.businessId,
      name: parsed.data.name,
      description: parsed.data.description,
      priceKobo: parsed.data.priceKobo,
      category: parsed.data.category,
      available: parsed.data.available ?? true,
      sortOrder: parsed.data.sortOrder ?? 0,
    });
    return reply.status(201).send(row);
  });

  app.get<{ Params: { customerId: string }; Querystring: { businessId: string } }>(
    "/admin/customers/:customerId/loyalty",
    async (request, reply) => {
      const params = z.object({ customerId: z.string().uuid() }).safeParse(request.params);
      const query = businessQuerySchema.safeParse(request.query);
      if (!params.success || !query.success) {
        return reply.status(400).send({
          code: "INVALID_QUERY",
          message: "Valid customerId and businessId are required.",
        });
      }

      const { customerId } = params.data;
      const { businessId } = query.data;

      const customer = await adminRepo.findCustomerById(businessId, customerId);
      if (!customer) {
        return reply.status(404).send({
          code: "NOT_FOUND",
          message: "Customer not found for this business.",
        });
      }

      const business = await adminRepo.getBusiness(businessId);
      const loyalty = parseTieredLoyaltyConfig(
        business?.loyaltyConfig ?? business?.loyalty_config,
      );

      const [balanceKobo, history, vouchers] = await Promise.all([
        adminRepo.getBalance(businessId, customerId),
        adminRepo.listEntries(businessId, customerId),
        adminRepo.listActiveVouchers(businessId, customerId),
      ]);

      return reply.status(200).send({
        customer: {
          id: customer.id,
          phone: customer.phone,
          name: customer.name ?? null,
          firstSeen: customer.firstSeen.toISOString(),
          lastSeen: customer.lastSeen.toISOString(),
        },
        balanceKobo,
        minRedemptionKobo: loyalty.min_redemption_kobo,
        maxDiscountPct: loyalty.max_discount_pct,
        expiryDays: loyalty.expiry_days,
        history: history.map((row) => ({
          id: row.id,
          type: row.type,
          amount: row.amount,
          note: row.note ?? null,
          createdAt: row.createdAt.toISOString(),
          expiresAt: row.expiresAt?.toISOString() ?? null,
        })),
        vouchers: vouchers.map((v) => ({
          id: v.id,
          code: v.code,
          valueKobo: v.valueKobo,
          status: v.status,
          expiresAt: v.expiresAt.toISOString(),
        })),
      });
    },
  );

  app.post("/admin/customers", async (request, reply) => {
    const parsed = createCustomerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: "INVALID_BODY",
        message: "businessId and phone are required.",
      });
    }

    const customer = await adminRepo.upsertVisit(
      parsed.data.businessId,
      parsed.data.phone.trim().replace(/\s+/g, ""),
      undefined,
    );
    return reply.status(201).send(customer);
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
