import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import { widgetService } from "../modules/services.js";

const createWidgetSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1),
  config: z.record(z.string(), z.any()),
});

export async function widgetRoutes(app: FastifyInstance) {
  // Admin: Create widget
  app.post("/admin/widgets", async (request, reply) => {
    const apiKey = request.headers["x-admin-api-key"];
    if (apiKey !== config.adminApiKey) {
      return reply.status(401).send({
        code: "UNAUTHORIZED",
        message: "Invalid admin API key.",
      });
    }

    const parsed = createWidgetSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: "INVALID_PAYLOAD",
        message: "Invalid widget data.",
        errors: parsed.error.issues,
      });
    }

    const widget = await widgetService.createWidget(
      parsed.data.businessId,
      parsed.data.name,
      parsed.data.config
    );

    return reply.status(201).send(widget);
  });

  // Admin: List widgets
  app.get("/admin/widgets", async (request, reply) => {
    const apiKey = request.headers["x-admin-api-key"];
    const businessId = (request.query as any).businessId;

    if (apiKey !== config.adminApiKey) {
      return reply.status(401).send({
        code: "UNAUTHORIZED",
        message: "Invalid admin API key.",
      });
    }

    if (!businessId) {
      return reply.status(400).send({
        code: "MISSING_BUSINESS_ID",
        message: "businessId query parameter is required.",
      });
    }

    const widgets = await widgetService.listWidgets(businessId);
    return reply.status(200).send(widgets);
  });

  // Public: Get widget config
  app.get("/widgets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const widget = await widgetService.getWidget(id);

    if (!widget) {
      return reply.status(404).send({
        code: "WIDGET_NOT_FOUND",
        message: "Widget not found.",
      });
    }

    const rewards = await widgetService.listRewards(widget.businessId);

    return reply.status(200).send({
      ...widget,
      rewards,
    });
  });

  // Public: Get embed code
  app.get("/widgets/:id/embed", async (request, reply) => {
    const { id } = request.params as { id: string };
    const widget = await widgetService.getWidget(id);

    if (!widget) {
      return reply.status(404).send({
        code: "WIDGET_NOT_FOUND",
        message: "Widget not found.",
      });
    }

    // Determine base URL from request host
    const protocol = request.protocol;
    const host = request.hostname;
    const port = config.port;
    const baseUrl = `${protocol}://${host}${host === 'localhost' ? `:${port}` : ''}`;

    const embedCode = widgetService.getEmbedCode(id, baseUrl);
    return reply.status(200).send({ embedCode });
  });
}
