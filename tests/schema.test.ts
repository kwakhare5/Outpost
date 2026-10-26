import { describe, it, expect, afterAll } from "vitest";
import dotenv from "dotenv";
dotenv.config();

import { db, query } from "../lib/db";
import { REQUIRED_TABLES } from "../lib/db/migrate";

describe("Database Schema Verification", () => {
  afterAll(async () => {
    await db.end();
  });

  it("confirms all 8 core tables exist in the Supabase public schema", async () => {
    const rows = await query<{ table_name: string }>(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
         AND table_name = ANY($1::text[])`,
      [REQUIRED_TABLES]
    );

    const found = rows.map((r) => r.table_name);
    for (const table of REQUIRED_TABLES) {
      expect(found).toContain(table);
    }
  });

  it("verifies stores and store_routes tables structure", async () => {
    const storeCols = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stores'`
    );
    const storeColNames = storeCols.map((c) => c.column_name);
    expect(storeColNames).toContain("id");
    expect(storeColNames).toContain("name");
    expect(storeColNames).toContain("city");
    expect(storeColNames).toContain("safety_cushion_pct");

    const routeCols = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_routes'`
    );
    const routeColNames = routeCols.map((c) => c.column_name);
    expect(routeColNames).toContain("from_store_id");
    expect(routeColNames).toContain("to_store_id");
    expect(routeColNames).toContain("travel_minutes");
  });

  it("verifies products and real_demand_curves tables structure", async () => {
    const productCols = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products'`
    );
    const prodColNames = productCols.map((c) => c.column_name);
    expect(prodColNames).toContain("id");
    expect(prodColNames).toContain("name");
    expect(prodColNames).toContain("category");
    expect(prodColNames).toContain("unit_mrp");
    expect(prodColNames).toContain("shelf_life_days");

    const curveCols = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'real_demand_curves'`
    );
    const curveColNames = curveCols.map((c) => c.column_name);
    expect(curveColNames).toContain("store_id");
    expect(curveColNames).toContain("product_id");
    expect(curveColNames).toContain("hour_of_day");
    expect(curveColNames).toContain("units_demanded");
  });

  it("verifies batches table has strict expiration and status columns", async () => {
    const columns = await query<{ column_name: string; data_type: string }>(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'batches'`
    );

    const colMap = new Map(columns.map((c) => [c.column_name, c.data_type]));
    expect(colMap.has("id")).toBe(true);
    expect(colMap.has("store_id")).toBe(true);
    expect(colMap.has("product_id")).toBe(true);
    expect(colMap.has("expires_at")).toBe(true);
    expect(colMap.has("status")).toBe(true);
    expect(colMap.has("current_qty")).toBe(true);
  });

  it("verifies van_transfers table has doorstep count columns and status", async () => {
    const columns = await query<{ column_name: string }>(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'van_transfers'`
    );

    const colNames = columns.map((c) => c.column_name);
    expect(colNames).toContain("dispatched_qty");
    expect(colNames).toContain("received_qty");
    expect(colNames).toContain("damaged_qty");
    expect(colNames).toContain("status");
  });

  it("verifies time_clock table exists with current_time", async () => {
    const columns = await query<{ column_name: string }>(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'time_clock'`
    );

    const colNames = columns.map((c) => c.column_name);
    expect(colNames).toContain("id");
    expect(colNames).toContain("current_time");
    expect(colNames).toContain("day_date");
    expect(colNames).toContain("total_hours_advanced");
  });

  it("verifies outcomes_ledger supports baseline shadow run comparisons", async () => {
    const columns = await query<{ column_name: string }>(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'outcomes_ledger'`
    );

    const colNames = columns.map((c) => c.column_name);
    expect(colNames).toContain("is_baseline");
    expect(colNames).toContain("rupee_impact");
    expect(colNames).toContain("event_type");
  });
});
