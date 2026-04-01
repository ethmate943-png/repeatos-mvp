import { runSqlFile } from "./run-sql-file.js";
import { pool } from "../modules/db.js";

async function migrate() {
  try {
    await runSqlFile("infra/sql/001_init_core.sql");
    console.log("Migration completed: 001_init_core.sql");
    await runSqlFile("infra/sql/002_widgets.sql");
    console.log("Migration completed: 002_widgets.sql");
    await runSqlFile("infra/sql/003_core_alignment.sql");
    console.log("Migration completed: 003_core_alignment.sql");
  } finally {
    await pool.end();
  }
}

void migrate();
