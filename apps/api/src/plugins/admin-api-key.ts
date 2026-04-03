import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";

export async function requireAdminApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const apiKey = request.headers["x-admin-api-key"];
  if (apiKey !== config.adminApiKey) {
    return reply.status(401).send({
      code: "UNAUTHORIZED",
      message: "Invalid admin API key.",
    });
  }
}
