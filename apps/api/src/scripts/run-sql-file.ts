import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pool } from "../modules/db.js";

export async function runSqlFile(relativePathFromRepoRoot: string): Promise<void> {
  const workspaceRoot = resolve(process.cwd(), "..", "..");
  const sqlPath = resolve(workspaceRoot, relativePathFromRepoRoot);
  const sql = await readFile(sqlPath, "utf-8");

  await pool.query(sql);
}
