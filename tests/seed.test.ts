import { describe, it, expect, beforeAll, afterAll } from "vitest";
import dotenv from "dotenv";
dotenv.config();

import { db, query } from "../lib/db";
import { seedDatabase } from "../lib/db/seed";

describe("Live Supabase Anchor Seeding Verification (Task 2.1)", () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await db.end();
  });

  it("seeds exactly 3 dark stores with 20% safety cushion", async () => {
    const stores = await query<{ id: string; name: string; city: string; safety_cushion_pct: string }>(
      "SELECT id, name, city, safety_cushion_pct FROM stores ORDER BY id"
    );
    expect(stores).toHaveLength(3);
    const storeIds = stores.map((s) => s.id);
    expect(storeIds).toEqual(["andheri-west", "bandra", "powai"]);
    stores.forEach((s) => {
      expect(s.city).toBe("Mumbai");
      expect(parseFloat(s.safety_cushion_pct)).toBe(0.20);
    });
  });

  it("seeds 6 Mumbai store transit routes with realistic travel times", async () => {
    const routes = await query<{ from_store_id: string; to_store_id: string; travel_minutes: number }>(
      "SELECT from_store_id, to_store_id, travel_minutes FROM store_routes"
    );
    expect(routes).toHaveLength(6);
    const bandraToAndheri = routes.find((r) => r.from_store_id === "bandra" && r.to_store_id === "andheri-west");
    expect(bandraToAndheri?.travel_minutes).toBe(45);
    const bandraToPowai = routes.find((r) => r.from_store_id === "bandra" && r.to_store_id === "powai");
    expect(bandraToPowai?.travel_minutes).toBe(60);
  });

  it("seeds 5 core anchor products with correct MRP and shelf life", async () => {
    const products = await query<{ id: string; name: string; unit_mrp: string; shelf_life_days: number }>(
      "SELECT id, name, unit_mrp, shelf_life_days FROM products ORDER BY id"
    );
    expect(products).toHaveLength(5);
    const milk = products.find((p) => p.id === "amul-taaza-500");
    expect(milk?.name).toBe("Amul Taaza Milk 500ml");
    expect(parseFloat(milk?.unit_mrp || "0")).toBe(27.0);

    const dahi = products.find((p) => p.id === "mother-dairy-dahi-400");
    expect(dahi?.shelf_life_days).toBe(4);
  });

  it("seeds exactly 255 hourly demand curve rows from FreshRetailNet-50K", async () => {
    const [{ count }] = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM real_demand_curves"
    );
    expect(parseInt(count, 10)).toBe(255);

    // Verify Andheri West Amul Milk has 17 hours (06:00 to 22:00)
    const andheriMilk = await query<{ hour_of_day: number; units_demanded: string }>(
      `SELECT hour_of_day, units_demanded 
       FROM real_demand_curves 
       WHERE store_id = 'andheri-west' AND product_id = 'amul-taaza-500'
       ORDER BY hour_of_day ASC`
    );
    expect(andheriMilk).toHaveLength(17);
    expect(andheriMilk[0].hour_of_day).toBe(6);
    expect(andheriMilk[16].hour_of_day).toBe(22);
    // Peak hour at 08:00 has the highest morning sales velocity (45.0 units/hr for Andheri Amul Milk)
    const peakHour = andheriMilk.find((h) => h.hour_of_day === 8);
    expect(parseFloat(peakHour?.units_demanded || "0")).toBe(45.0);
  });

  it("seeds initial inventory batches matching the operational scenario", async () => {
    const batches = await query<{ store_id: string; product_id: string; current_qty: number; batch_code: string }>(
      "SELECT store_id, product_id, current_qty, batch_code FROM batches"
    );
    expect(batches.length).toBeGreaterThanOrEqual(16);

    // Andheri milk starting at 38 units (stockout in ~50 minutes at 45 units/hr)
    const andheriMilkBatch = batches.find(
      (b) => b.store_id === "andheri-west" && b.product_id === "amul-taaza-500"
    );
    expect(andheriMilkBatch?.current_qty).toBe(38);

    // Bandra milk starting at 112 units (sending store surplus)
    const bandraMilkBatch = batches.find(
      (b) => b.store_id === "bandra" && b.product_id === "amul-taaza-500"
    );
    expect(bandraMilkBatch?.current_qty).toBe(112);

    // Expiring dahi batch (20 units)
    const expiringDahi = batches.find((b) => b.batch_code === "BAT-AND-DAHI-EXP");
    expect(expiringDahi?.current_qty).toBe(20);
  });

  it("seeds initial time clock at 08:00 AM on 2026-10-25", async () => {
    const clock = await query<{ id: number; current_time: string; day_date: string; total_hours_advanced: number }>(
      'SELECT id, "current_time", day_date, total_hours_advanced FROM time_clock WHERE id = 1'
    );
    expect(clock).toHaveLength(1);
    expect(clock[0].current_time).toBe("08:00");
    expect(clock[0].day_date).toBe("2026-10-25");
    expect(clock[0].total_hours_advanced).toBe(0);
  });
});
