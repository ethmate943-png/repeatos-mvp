import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { config } from "./config.js";
import { pool } from "./modules/db.js";
import { startCreditExpiryJob } from "./jobs/expireCredits.js";
import { adminRoutes } from "./routes/admin.js";
import { adminCustomerRedeemRoutes } from "./routes/admin-customer-redeem.js";
import { adminUserRoutes } from "./routes/admin-users.js";
import { healthRoutes } from "./routes/health.js";
import { scanRoutes } from "./routes/scan.js";
import { sessionInfoRoutes } from "./routes/session-info.js";
import { widgetRoutes } from "./routes/widget-routes.js";
import { orderRoutes } from "./routes/order-routes.js";
import { pointsRoutes } from "./routes/points-routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
  });

  await app.register(rateLimit, {
    max: config.rateLimitMaxPerMinute,
    timeWindow: "1 minute",
  });

  await app.register(healthRoutes);
  await app.register(scanRoutes);
  await app.register(sessionInfoRoutes);
  await app.register(adminRoutes);
  await app.register(adminCustomerRedeemRoutes);
  await app.register(adminUserRoutes);
  await app.register(widgetRoutes);
  await app.register(orderRoutes);
  await app.register(pointsRoutes);

  const widgetDistPath = process.env.WIDGET_DIST_PATH
    ?? path.join(__dirname, "../../widget/dist");
  await app.register(fastifyStatic, {
    root: path.resolve(widgetDistPath),
    prefix: "/public/",
    decorateReply: false,
  });

  app.get("/demo", async (_request, reply) => {
    const demoPath = path.resolve(widgetDistPath, "../demo.html");
    const html = await readFile(demoPath, "utf-8");
    reply.type("text/html").send(html);
  });

  return app;
}

async function start() {
  startCreditExpiryJob(pool);
  const app = await buildServer();

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    app.log.info(`API running on port ${config.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
