import { Pool } from "pg";
import { config } from "../config.js";

const connectionString = config.databaseUrl
  .replace(/[?&](channel_binding|sslmode)=[^&]*/g, "")
  .replace(/\?&/, "?")
  .replace(/\?$/, "");

const isNeon = connectionString.includes("neon.tech");

export const pool = new Pool({
  connectionString,
  ssl: isNeon ? true : undefined,
  connectionTimeoutMillis: 30000,
  max: 5,
});
