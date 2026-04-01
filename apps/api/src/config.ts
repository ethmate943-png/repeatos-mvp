import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  adminApiKey: process.env.ADMIN_API_KEY ?? "dev-admin-key",
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://repeatos:repeatos_dev_password@localhost:5432/repeatos",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  rateLimitMaxPerMinute: Number(process.env.RATE_LIMIT_MAX_PER_MINUTE ?? 100),
  scanCooldownSeconds: Number(process.env.SCAN_COOLDOWN_SECONDS ?? 60),
  logLevel: process.env.LOG_LEVEL ?? "info",
  widgetAllowedOrigins: (process.env.WIDGET_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
