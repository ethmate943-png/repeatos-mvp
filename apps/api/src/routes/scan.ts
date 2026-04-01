import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ScanResponse } from "../types.js";
import { checkinDomain } from "../modules/services.js";
import { DomainError } from "../modules/types.js";

const scanSchema = z.object({
  token: z.string().min(8),
  phone: z.string().trim().min(7),
});

export async function scanRoutes(app: FastifyInstance) {
  app.post("/scan", async (request, reply) => {
    const parsed = scanSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        code: "INVALID_PAYLOAD",
        message: "Invalid scan payload.",
      });
    }

    const { token, phone } = parsed.data;
 
    try {
      const result = await checkinDomain.executeCheckin({
        token,
        phone,
        origin: request.headers.origin as string,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
      });

      const response: ScanResponse = {
        visit_count: result.visitCount,
        reward: result.reward,
      };

      return reply.status(200).send(response);
    } catch (error) {
      if (error instanceof DomainError) {
        switch (error.code) {
          case "INVALID_TOKEN":
          case "TOKEN_INACTIVE":
            return reply.status(404).send({
              code: error.code,
              message: error.message,
            });
          case "ORIGIN_NOT_ALLOWED":
            return reply.status(403).send({
              code: error.code,
              message: error.message,
            });
          case "COOLDOWN_ACTIVE":
            return reply.status(429).send({
              code: error.code,
              message: error.message,
            });
          default:
            return reply.status(400).send({
              code: error.code,
              message: error.message,
            });
        }
      }

      request.log.error(error);
      return reply.status(500).send({
        code: "INTERNAL_ERROR",
        message: "Unexpected error during check-in.",
      });
    }
  });
}
