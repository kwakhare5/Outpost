import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}

const migrationsDir = path.join(process.cwd(), "migrations");
const namePattern = /^\d{4}_[a-z0-9_]+\.sql$/;

const client = new pg.Client({ connectionString: url });
try {
  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const bad = files.filter((name) => !namePattern.test(name));
  if (bad.length > 0) {
    throw new Error(
      `migration names must look like 0001_name.sql: ${bad.join(", ")}`,
    );
  }

  await client.connect();
  await client.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const { rows } = await client.query("select name from schema_migrations");
  const applied = new Set(rows.map((row) => row.name));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [
        file,
      ]);
      await client.query("commit");
    } catch (error) {
      // Keep the original failure; a broken connection can also fail the rollback.
      await client.query("rollback").catch((rollbackError) => {
        error.message += ` (rollback also failed: ${rollbackError.message})`;
      });
      throw error;
    }
    console.log(`applied ${file}`);
    count += 1;
  }
  console.log(count === 0 ? "nothing to apply" : `applied ${count} migration(s)`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
