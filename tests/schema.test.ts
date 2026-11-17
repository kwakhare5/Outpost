import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const run = promisify(execFile);
const scratchName = "outpost_test_scratch";

if (existsSync(".env")) process.loadEnvFile(".env");
const adminUrl = process.env.DATABASE_URL;

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

let admin: pg.Client | undefined;
let db: pg.Client | undefined;

beforeAll(async () => {
  if (!adminUrl) throw new Error("DATABASE_URL is not set. See .env.example.");
  admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(
    "select pg_terminate_backend(pid) from pg_stat_activity where datname = $1",
    [scratchName],
  );
  await admin.query(`drop database if exists ${scratchName}`);
  await admin.query(`create database ${scratchName}`);

  const scratchUrl = withDatabase(adminUrl, scratchName);
  await run(process.execPath, ["scripts/db-migrate.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: scratchUrl },
  });

  db = new pg.Client({ connectionString: scratchUrl });
  await db.connect();
});

afterAll(async () => {
  await db?.end();
  if (admin && adminUrl) {
    await admin.query(
      "select pg_terminate_backend(pid) from pg_stat_activity where datname = $1",
      [scratchName],
    );
    await admin.query(`drop database if exists ${scratchName}`);
    await admin.end();
  }
});

async function insertDataset(client: pg.Client): Promise<string> {
  const { rows } = await client.query(
    "insert into datasets (name, source, unit_label, day_boundary, currency, mode) values ('t', 't', 'units', '00:00', 'EUR', 'full') returning id",
  );
  return rows[0].id;
}

describe("schema", () => {
  it("creates the 12 tables plus the ledger", async () => {
    const { rows } = await db!.query(
      "select table_name from information_schema.tables where table_schema = 'public' order by 1",
    );
    expect(rows.map((row) => row.table_name)).toEqual([
      "assistant_runs",
      "data_quality",
      "datasets",
      "decisions",
      "fixes",
      "model_versions",
      "ops",
      "outcomes",
      "proof_runs",
      "routes",
      "sales",
      "schema_migrations",
      "warnings",
    ]);
  });

  it("creates the named indexes", async () => {
    const wanted = [
      "sales_dataset_day_idx",
      "warnings_shelf_day_unique",
      "warnings_rank_idx",
      "fixes_warning_idx",
      "decisions_one_per_visitor",
      "assistant_runs_dataset_idx",
      "proof_runs_dataset_idx",
      "datasets_visitor_idx",
    ];
    const { rows } = await db!.query(
      "select indexname, indexdef from pg_indexes where schemaname = 'public'",
    );
    const defs = new Map(rows.map((row) => [row.indexname, row.indexdef]));
    for (const name of wanted) {
      expect(defs.has(name), name).toBe(true);
    }
    expect(defs.get("sales_dataset_day_idx")).toContain("(dataset_id, day)");
    expect(defs.get("warnings_shelf_day_unique")).toContain(
      "UNIQUE INDEX",
    );
    expect(defs.get("warnings_shelf_day_unique")).toContain(
      "(dataset_id, store_id, product_id, as_of_day)",
    );
    expect(defs.get("decisions_one_per_visitor")).toContain("UNIQUE INDEX");
    expect(defs.get("decisions_one_per_visitor")?.toLowerCase()).toContain(
      "coalesce(visitor_id",
    );
  });

  it("rejects duplicate shelf-days", async () => {
    const datasetId = await insertDataset(db!);
    const insert =
      "insert into sales (dataset_id, store_id, product_id, day, quantity, empty_flag) values ($1, 's', 'p', '2024-01-01', 1, 'no')";
    await db!.query(insert, [datasetId]);
    await expect(db!.query(insert, [datasetId])).rejects.toMatchObject({
      code: "23505",
    });
  });

  it("rejects an invalid mode", async () => {
    await expect(
      db!.query(
        "insert into datasets (name, source, unit_label, day_boundary, currency, mode) values ('t', 't', 'units', '00:00', 'EUR', 'learned')",
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("rejects a duplicate warning for the same shelf-day", async () => {
    const datasetId = await insertDataset(db!);
    const insert =
      "insert into warnings (dataset_id, store_id, product_id, as_of_day, target_day, score, model_version) values ($1, 's', 'p', '2024-01-01', '2024-01-02', 0.5, 'test')";
    await db!.query(insert, [datasetId]);
    await expect(db!.query(insert, [datasetId])).rejects.toMatchObject({
      code: "23505",
      constraint: "warnings_shelf_day_unique",
    });
  });

  it("allows one decision per visitor per warning", async () => {
    const datasetId = await insertDataset(db!);
    const { rows } = await db!.query(
      "insert into warnings (dataset_id, store_id, product_id, as_of_day, target_day, score, model_version) values ($1, 's', 'p', '2024-01-01', '2024-01-02', 0.5, 'test') returning id",
      [datasetId],
    );
    const warningId = rows[0].id;
    const insertDecision =
      "insert into decisions (warning_id, visitor_id, action, snapshot, idempotency_key) values ($1, $2, 'approve', '{}'::jsonb, $3)";
    await db!.query(insertDecision, [warningId, null, "a"]);
    await expect(
      db!.query(insertDecision, [warningId, null, "b"]),
    ).rejects.toMatchObject({
      code: "23505",
      constraint: "decisions_one_per_visitor",
    });
    await db!.query(insertDecision, [warningId, "visitor-1", "d"]);
    await db!.query(insertDecision, [warningId, "visitor-2", "e"]);
  });

  it("cascades deletes from a dataset", async () => {
    const datasetId = await insertDataset(db!);
    await db!.query(
      "insert into sales (dataset_id, store_id, product_id, day, quantity, empty_flag) values ($1, 's', 'p', '2024-01-02', 1, 'no')",
      [datasetId],
    );
    await db!.query(
      "insert into ops (dataset_id, store_id, product_id, stock, price, lead_time_hours) values ($1, 's', 'p', 10, 1.5, 24)",
      [datasetId],
    );
    await db!.query(
      "insert into routes (dataset_id, from_store, to_store, hours) values ($1, 'a', 'b', 0.5)",
      [datasetId],
    );
    await db!.query(
      "insert into data_quality (dataset_id, report) values ($1, '{}'::jsonb)",
      [datasetId],
    );
    const warning = await db!.query(
      "insert into warnings (dataset_id, store_id, product_id, as_of_day, target_day, score, model_version) values ($1, 's', 'p', '2024-01-02', '2024-01-03', 0.5, 'test') returning id",
      [datasetId],
    );
    const warningId = warning.rows[0].id;
    const fix = await db!.query(
      "insert into fixes (warning_id, kind, amount) values ($1, 'move', 2) returning id",
      [warningId],
    );
    const decision = await db!.query(
      "insert into decisions (warning_id, fix_id, action, snapshot, idempotency_key) values ($1, $2, 'approve', '{}'::jsonb, 'c') returning id",
      [warningId, fix.rows[0].id],
    );
    const decisionId = decision.rows[0].id;
    await db!.query(
      "insert into outcomes (decision_id, simulated_available, simulated_lost, empty_hours) values ($1, true, 0, 1)",
      [decisionId],
    );
    const proof = await db!.query(
      "insert into proof_runs (dataset_id, kind, status) values ($1, 'upload', 'done') returning id",
      [datasetId],
    );
    await db!.query(
      "insert into assistant_runs (dataset_id, question, check_run_id) values ($1, 'q', $2)",
      [datasetId, proof.rows[0].id],
    );

    await db!.query("delete from datasets where id = $1", [datasetId]);

    const checks: Array<[string, string, unknown[]]> = [
      ["sales", "dataset_id = $1", [datasetId]],
      ["ops", "dataset_id = $1", [datasetId]],
      ["routes", "dataset_id = $1", [datasetId]],
      ["data_quality", "dataset_id = $1", [datasetId]],
      ["warnings", "dataset_id = $1", [datasetId]],
      ["fixes", "warning_id = $1", [warningId]],
      ["decisions", "warning_id = $1", [warningId]],
      ["outcomes", "decision_id = $1", [decisionId]],
      ["proof_runs", "dataset_id = $1", [datasetId]],
      ["assistant_runs", "dataset_id = $1", [datasetId]],
    ];
    for (const [table, where, params] of checks) {
      const count = await db!.query(
        `select count(*)::int as n from ${table} where ${where}`,
        params,
      );
      expect(count.rows[0].n, table).toBe(0);
    }
  });

  it("stores a model version", async () => {
    const { rows } = await db!.query(
      "insert into model_versions (id, kind, artifact, feature_spec) values ('model-test', 'warning', '{}'::jsonb, '{}'::jsonb) returning id, kind",
    );
    expect(rows[0]).toEqual({ id: "model-test", kind: "warning" });
  });
});
