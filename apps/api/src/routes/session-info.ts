import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DomainError } from "../modules/types.js";
import { sessionInfoService } from "../modules/services.js";

const sessionInfoSchema = z.object({
  token: z.string().min(8),
  session_id: z.string().trim().min(1),
});

export async function sessionInfoRoutes(app: FastifyInstance) {
  app.post("/session-info", async (request, reply) => {
    const parsed = sessionInfoSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        code: "INVALID_PAYLOAD",
        message: "Invalid session payload.",
      });
    }

    const { token, session_id } = parsed.data;

    try {
      const result = await sessionInfoService.resolveCustomerName({
        token,
        sessionId: session_id,
        origin: request.headers.origin as string,
      });

      return reply.status(200).send({
        customer_name: result.customerName,
      });
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
        message: "Unexpected error during session lookup.",
      });
    }
  });
}

