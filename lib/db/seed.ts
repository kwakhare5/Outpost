import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import { db, query } from "./index";
import { resetTimeClock } from "../engine/clock";

export interface DemandRow {
  store_id: string;
  store_name: string;
  product_id: string;
  product_name: string;
  unit_mrp: number;
  hour_of_day: number;
  units_demanded: number;
  source_dataset: string;
}

const PRODUCT_METADATA: Record<string, { category: string; shelf_life_days: number }> = {
  "amul-taaza-500": { category: "dairy", shelf_life_days: 2 },
  "mother-dairy-dahi-400": { category: "dairy", shelf_life_days: 4 },
  "harvest-gold-bread-400": { category: "bakery", shelf_life_days: 3 },
  "fresh-eggs-6": { category: "breakfast", shelf_life_days: 7 },
  "amul-butter-100": { category: "dairy", shelf_life_days: 30 },
};

export function parseDemandCsv(filePath: string): DemandRow[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV file must contain a header and at least one data row");
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const colIndex = {
    store_id: headers.indexOf("store_id"),
    store_name: headers.indexOf("store_name"),
    product_id: headers.indexOf("product_id"),
    product_name: headers.indexOf("product_name"),
    unit_mrp: headers.indexOf("unit_mrp"),
    hour_of_day: headers.indexOf("hour_of_day"),
    units_demanded: headers.indexOf("units_demanded"),
    source_dataset: headers.indexOf("source_dataset"),
  };

  const missingCols = Object.entries(colIndex)
    .filter(([, idx]) => idx === -1)
    .map(([col]) => col);

  if (missingCols.length > 0) {
    throw new Error(`CSV is missing required columns: ${missingCols.join(", ")}`);
  }

  const rows: DemandRow[] = [];
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex].trim();
    if (!rawLine) continue;
    const parts = rawLine.split(",");
    if (parts.length < headers.length) continue;

    rows.push({
      store_id: parts[colIndex.store_id].trim(),
      store_name: parts[colIndex.store_name].trim(),
      product_id: parts[colIndex.product_id].trim(),
      product_name: parts[colIndex.product_name].trim(),
      unit_mrp: parseFloat(parts[colIndex.unit_mrp]),
      hour_of_day: parseInt(parts[colIndex.hour_of_day], 10),
      units_demanded: parseFloat(parts[colIndex.units_demanded]),
      source_dataset: parts.slice(colIndex.source_dataset).join(",").trim(),
    });
  }
  return rows;
}

export async function seedDatabase(): Promise<{
  storesCount: number;
  routesCount: number;
  productsCount: number;
  demandRowsCount: number;
  batchesCount: number;
}> {
  const csvPath = path.join(process.cwd(), "data", "mumbai_anchor_demand.csv");
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Demand CSV not found at ${csvPath}`);
  }

  const demandRows = parseDemandCsv(csvPath);
  if (demandRows.length === 0) {
    throw new Error("Demand CSV is empty or failed to parse");
  }

  // 1. Clear existing operational state
  await query(`
    TRUNCATE TABLE 
      outcomes_ledger, 
      van_transfers, 
      batches, 
      real_demand_curves, 
      store_routes, 
      products, 
      stores, 
      time_clock 
    CASCADE
  `);

  // 2. Extract and insert unique stores dynamically from CSV
  const storeMap = new Map<string, { id: string; name: string; city: string; safety_cushion_pct: number }>();
  for (const row of demandRows) {
    if (!storeMap.has(row.store_id)) {
      storeMap.set(row.store_id, {
        id: row.store_id,
        name: row.store_name,
        city: "Mumbai",
        safety_cushion_pct: 0.20,
      });
    }
  }

  const stores = Array.from(storeMap.values());
  const storeValues: unknown[] = [];
  const storePlaceholders = stores.map((store, index) => {
    const offset = index * 4;
    storeValues.push(store.id, store.name, store.city, store.safety_cushion_pct);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
  }).join(", ");

  await query(
    `INSERT INTO stores (id, name, city, safety_cushion_pct) VALUES ${storePlaceholders}`,
    storeValues
  );

  // 3. Batch insert 6 transit corridors with standard travel times
  const routes = [
    { from_store_id: "bandra", to_store_id: "andheri-west", travel_minutes: 45 },
    { from_store_id: "andheri-west", to_store_id: "bandra", travel_minutes: 45 },
    { from_store_id: "bandra", to_store_id: "powai", travel_minutes: 60 },
    { from_store_id: "powai", to_store_id: "bandra", travel_minutes: 60 },
    { from_store_id: "andheri-west", to_store_id: "powai", travel_minutes: 40 },
    { from_store_id: "powai", to_store_id: "andheri-west", travel_minutes: 40 },
  ];

  const routeValues: unknown[] = [];
  const routePlaceholders = routes.map((route, index) => {
    const offset = index * 3;
    routeValues.push(route.from_store_id, route.to_store_id, route.travel_minutes);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
  }).join(", ");

  await query(
    `INSERT INTO store_routes (from_store_id, to_store_id, travel_minutes) VALUES ${routePlaceholders}`,
    routeValues
  );

  // 4. Extract and insert unique products dynamically from CSV
  const productMap = new Map<string, { id: string; name: string; category: string; unit_mrp: number; shelf_life_days: number }>();
  for (const row of demandRows) {
    if (!productMap.has(row.product_id)) {
      const meta = PRODUCT_METADATA[row.product_id] || { category: "general", shelf_life_days: 7 };
      productMap.set(row.product_id, {
        id: row.product_id,
        name: row.product_name,
        category: meta.category,
        unit_mrp: row.unit_mrp,
        shelf_life_days: meta.shelf_life_days,
      });
    }
  }

  const products = Array.from(productMap.values());
  const productValues: unknown[] = [];
  const productPlaceholders = products.map((product, index) => {
    const offset = index * 5;
    productValues.push(product.id, product.name, product.category, product.unit_mrp, product.shelf_life_days);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
  }).join(", ");

  await query(
    `INSERT INTO products (id, name, category, unit_mrp, shelf_life_days) VALUES ${productPlaceholders}`,
    productValues
  );

  // 5. Bulk insert 255 real hourly demand curves
  const curveValues: unknown[] = [];
  const curvePlaceholders = demandRows.map((row, index) => {
    const offset = index * 5;
    curveValues.push(row.store_id, row.product_id, row.hour_of_day, row.units_demanded, row.source_dataset);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
  }).join(", ");

  await query(
    `INSERT INTO real_demand_curves (store_id, product_id, hour_of_day, units_demanded, source_dataset)
     VALUES ${curvePlaceholders}`,
    curveValues
  );

  // 6. Batch insert initial inventory batches for morning run
  const batchesCount = await seedStartingBatches();

  // 7. Seed Operational Clock at 08:00 AM (idempotent)
  await resetTimeClock({ time: "08:00", date: "2026-10-25", totalHoursAdvanced: 0 });

  return {
    storesCount: stores.length,
    routesCount: routes.length,
    productsCount: products.length,
    demandRowsCount: demandRows.length,
    batchesCount,
  };
}

/**
 * Resets and seeds only the morning inventory batches (fast reset for test suites).
 */
export async function seedStartingBatches(): Promise<number> {
  await query(`DELETE FROM batches`);

  const initialBatches = [
    // Andheri West: Amul Milk 38 units (stockout risk ~50 mins), Dahi 20 units expiring today
    { store_id: "andheri-west", product_id: "amul-taaza-500", batch_code: "BAT-AND-MILK-01", initial_qty: 50, current_qty: 38, expires_at: "2026-10-27T08:00:00Z" },
    { store_id: "andheri-west", product_id: "mother-dairy-dahi-400", batch_code: "BAT-AND-DAHI-EXP", initial_qty: 20, current_qty: 20, expires_at: "2026-10-25T18:00:00Z" },
    { store_id: "andheri-west", product_id: "mother-dairy-dahi-400", batch_code: "BAT-AND-DAHI-02", initial_qty: 30, current_qty: 30, expires_at: "2026-10-29T08:00:00Z" },
    { store_id: "andheri-west", product_id: "harvest-gold-bread-400", batch_code: "BAT-AND-BREAD-01", initial_qty: 30, current_qty: 25, expires_at: "2026-10-28T08:00:00Z" },
    { store_id: "andheri-west", product_id: "fresh-eggs-6", batch_code: "BAT-AND-EGGS-01", initial_qty: 35, current_qty: 30, expires_at: "2026-11-01T08:00:00Z" },
    { store_id: "andheri-west", product_id: "amul-butter-100", batch_code: "BAT-AND-BTR-01", initial_qty: 30, current_qty: 25, expires_at: "2026-11-25T08:00:00Z" },

    // Bandra: Sending store with 112 Amul Milk units on hand (surplus inventory)
    { store_id: "bandra", product_id: "amul-taaza-500", batch_code: "BAT-BAN-MILK-01", initial_qty: 120, current_qty: 112, expires_at: "2026-10-27T08:00:00Z" },
    { store_id: "bandra", product_id: "mother-dairy-dahi-400", batch_code: "BAT-BAN-DAHI-01", initial_qty: 45, current_qty: 40, expires_at: "2026-10-29T08:00:00Z" },
    { store_id: "bandra", product_id: "harvest-gold-bread-400", batch_code: "BAT-BAN-BREAD-01", initial_qty: 55, current_qty: 50, expires_at: "2026-10-28T08:00:00Z" },
    { store_id: "bandra", product_id: "fresh-eggs-6", batch_code: "BAT-BAN-EGGS-01", initial_qty: 50, current_qty: 45, expires_at: "2026-11-01T08:00:00Z" },
    { store_id: "bandra", product_id: "amul-butter-100", batch_code: "BAT-BAN-BTR-01", initial_qty: 45, current_qty: 40, expires_at: "2026-11-25T08:00:00Z" },

    // Powai
    { store_id: "powai", product_id: "amul-taaza-500", batch_code: "BAT-POW-MILK-01", initial_qty: 55, current_qty: 50, expires_at: "2026-10-27T08:00:00Z" },
    { store_id: "powai", product_id: "mother-dairy-dahi-400", batch_code: "BAT-POW-DAHI-01", initial_qty: 35, current_qty: 30, expires_at: "2026-10-29T08:00:00Z" },
    { store_id: "powai", product_id: "harvest-gold-bread-400", batch_code: "BAT-POW-BREAD-01", initial_qty: 40, current_qty: 35, expires_at: "2026-10-28T08:00:00Z" },
    { store_id: "powai", product_id: "fresh-eggs-6", batch_code: "BAT-POW-EGGS-01", initial_qty: 35, current_qty: 30, expires_at: "2026-11-01T08:00:00Z" },
    { store_id: "powai", product_id: "amul-butter-100", batch_code: "BAT-POW-BTR-01", initial_qty: 30, current_qty: 25, expires_at: "2026-11-25T08:00:00Z" },
  ];

  const batchValues: unknown[] = [];
  const batchPlaceholders = initialBatches.map((batch, index) => {
    const offset = index * 6;
    batchValues.push(
      batch.store_id,
      batch.product_id,
      batch.batch_code,
      batch.initial_qty,
      batch.current_qty,
      batch.expires_at
    );
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, 'active')`;
  }).join(", ");

  await query(
    `INSERT INTO batches (store_id, product_id, batch_code, initial_qty, current_qty, expires_at, status)
     VALUES ${batchPlaceholders}`,
    batchValues
  );
  return initialBatches.length;
}

if (require.main === module || process.argv[1]?.endsWith("seed.ts")) {
  seedDatabase()
    .then((res) => {
      console.log("Database seeded successfully with Mumbai anchor data:");
      console.log(`  - Stores: ${res.storesCount}`);
      console.log(`  - Routes: ${res.routesCount}`);
      console.log(`  - Products: ${res.productsCount}`);
      console.log(`  - Demand Curves: ${res.demandRowsCount}`);
      console.log(`  - Initial Batches: ${res.batchesCount}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Database seeding failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await db.end();
    });
}
