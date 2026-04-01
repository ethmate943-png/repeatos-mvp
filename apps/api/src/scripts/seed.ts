import { runSqlFile } from "./run-sql-file.js";
import { pool } from "../modules/db.js";

async function seed() {
  try {
    await runSqlFile("infra/sql/002_seed_demo.sql");
    console.log("Seed completed: 002_seed_demo.sql");
  } finally {
    await pool.end();
  }
}

void seed();
