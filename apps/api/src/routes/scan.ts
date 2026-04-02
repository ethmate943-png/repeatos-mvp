import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ScanResponse } from "../types.js";
import { checkinDomain } from "../modules/services.js";
import { DomainError } from "../modules/types.js";

function normalizeNigeriaPhone(phoneRaw: string): string | null {
  const phone = phoneRaw.trim().replace(/\s+/g, "");

  // Accept: +234XXXXXXXXXX or 0XXXXXXXXXX
  // Nigerian mobile numbers are typically 10 digits after the country code.
  // We accept 9-10 digits to be forgiving.
  if (phone.startsWith("+234")) {
    const rest = phone.slice(4);
    if (/^\d{9,10}$/.test(rest)) return `+234${rest}`;
    return null;
  }

  if (phone.startsWith("0")) {
    const rest = phone.slice(1);
    if (/^\d{9,10}$/.test(rest)) return `+234${rest}`;
    return null;
  }

  // Also accept raw digits "234XXXXXXXXXX"
  if (phone.startsWith("234")) {
    const rest = phone.slice(3);
    if (/^\d{9,10}$/.test(rest)) return `+234${rest}`;
    return null;
  }

  return null;
}

const scanSchema = z.object({
  token: z.string().min(8),
  phone: z.string().trim().optional(),
  name: z.string().trim().min(2).optional(),
  session_id: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  // First check-in: require name + phone.
  if (!data.session_id) {
    if (!data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "phone is required for first-time check-in.",
        path: ["phone"],
      });
    }
    if (!data.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "name is required for first-time check-in.",
        path: ["name"],
      });
    }
  }

  // If phone is provided, validate/normalize it.
  if (data.phone) {
    const normalized = normalizeNigeriaPhone(data.phone);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone must start with +234 or 0 (e.g. +2348012345678 or 08012345678).",
        path: ["phone"],
      });
    }
  }
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

    const { token, phone, name, session_id } = parsed.data;
    const normalizedPhone = phone ? normalizeNigeriaPhone(phone) ?? undefined : undefined;
 
    try {
      const result = await checkinDomain.executeCheckin({
        token,
        phone: normalizedPhone,
        name,
        sessionId: session_id,
        origin: request.headers.origin as string,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
      });

      const response: ScanResponse = {
        visit_count: result.visitCount,
        points_balance: result.pointsBalance,
        reward: result.reward
          ? {
              label: result.reward.label,
              code: result.reward.code,
              value_kobo: result.reward.valueKobo,
              expires_at: result.reward.expiresAt.toISOString(),
            }
          : null,
        session_id: result.sessionId,
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
