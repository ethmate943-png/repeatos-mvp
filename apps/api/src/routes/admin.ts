import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import { adminAnalytics } from "../modules/services.js";

const querySchema = z.object({
  businessId: z.string().min(1),
});

export async function adminRoutes(app: FastifyInstance) {
  app.get("/admin/analytics/summary", async (request, reply) => {
    const apiKey = request.headers["x-admin-api-key"];
    if (apiKey !== config.adminApiKey) {
      return reply.status(401).send({
        code: "UNAUTHORIZED",
        message: "Invalid admin API key.",
      });
    }

    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        code: "INVALID_QUERY",
        message: "businessId is required.",
      });
    }

    const summary = await adminAnalytics.getSummary(parsed.data.businessId);
    return reply.status(200).send(summary);
  });
}
