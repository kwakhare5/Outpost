import { describe, it, expect, afterAll } from "vitest";
import dotenv from "dotenv";
dotenv.config();

import { db, supabase, query } from "../lib/db";

describe("Outpost V1 Health Check", () => {
  afterAll(async () => {
    await db.end();
  });

  it("verifies environment configuration is loadable without secrets leak", () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.DATABASE_URL).toMatch(/^postgres(ql)?:\/\//);
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
  });

  it("executes real live PostgreSQL query against Supabase", async () => {
    interface PingResult {
      alive: number;
    }
    const rows = await query<PingResult>("SELECT 1 as alive");
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].alive)).toBe(1);
  });

  it("verifies Supabase client connection against stores table", async () => {
    const { data, error } = await supabase.from("stores").select("id").limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
