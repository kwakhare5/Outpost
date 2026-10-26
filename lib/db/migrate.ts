import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import { db, query } from "./index";

export const REQUIRED_TABLES = [
  "stores",
  "store_routes",
  "products",
  "batches",
  "real_demand_curves",
  "van_transfers",
  "time_clock",
  "outcomes_ledger",
] as const;

export async function runMigrations(): Promise<{ applied: boolean; tables: string[] }> {
  const schemaPath = path.join(process.cwd(), "lib", "db", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  // Run the full schema SQL
  await query(schemaSql);

  // Verify all 8 tables exist in the public schema
  const existingTables = await query<{ table_name: string }>(
    `SELECT table_name 
     FROM information_schema.tables 
     WHERE table_schema = 'public' 
       AND table_name = ANY($1::text[])`,
    [REQUIRED_TABLES]
  );

  const foundTableNames = existingTables.map((r) => r.table_name);
  const missing = REQUIRED_TABLES.filter((t) => !foundTableNames.includes(t));

  if (missing.length > 0) {
    throw new Error(`Migration verification failed. Missing tables in Supabase: ${missing.join(", ")}`);
  }

  return {
    applied: true,
    tables: foundTableNames,
  };
}

// Allow direct execution: npx tsx lib/db/migrate.ts
if (require.main === module || process.argv[1]?.endsWith("migrate.ts")) {
  runMigrations()
    .then((result) => {
      console.log("Migration successful! Confirmed tables in Supabase public schema:");
      result.tables.forEach((t) => console.log(`  - ${t}`));
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await db.end();
    });
}
