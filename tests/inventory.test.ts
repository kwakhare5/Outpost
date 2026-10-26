import { describe, it, expect, beforeEach, afterAll } from "vitest";
import dotenv from "dotenv";
dotenv.config();

import { db, query } from "../lib/db";
import { seedDatabase } from "../lib/db/seed";
import {
  lockExpiredBatches,
  getAvailableStock,
  getActiveBatches,
  getExpiringBatches,
  getSimulationClock,
  deductOldestFirst,
} from "../lib/engine/inventory";

describe("Inventory & Oldest-First Engine (Task 2.2)", () => {
  beforeEach(async () => {
    // Re-seed benchmark data to ensure pristine state
    await seedDatabase();
  });

  afterAll(async () => {
    await db.end();
  });

  it("calculates available stock correctly excluding expired batches", async () => {
    // Andheri West Amul Milk starts with 38 units
    const stock = await getAvailableStock("andheri-west", "amul-taaza-500", "2026-10-25T08:00:00Z");
    expect(stock).toBe(38);

    // Andheri West Dahi has 20 units expiring at 18:00 today and 30 fresh units (total 50)
    const morningStock = await getAvailableStock("andheri-west", "mother-dairy-dahi-400", "2026-10-25T08:00:00Z");
    expect(morningStock).toBe(50);

    // After 18:00, the 20-unit batch is expired, so only 30 units are available
    const eveningStock = await getAvailableStock("andheri-west", "mother-dairy-dahi-400", "2026-10-25T19:00:00Z");
    expect(eveningStock).toBe(30);
  });

  it("deducts units using strict Oldest-First batch priority", async () => {
    // Insert 2 distinct batches for testing Oldest-First order
    await query("DELETE FROM batches WHERE store_id = 'andheri-west' AND product_id = 'amul-taaza-500'");

    await query(
      `INSERT INTO batches (store_id, product_id, batch_code, initial_qty, current_qty, expires_at, status)
       VALUES 
         ('andheri-west', 'amul-taaza-500', 'BAT-OLDER', 15, 15, '2026-10-27T08:00:00Z', 'active'),
         ('andheri-west', 'amul-taaza-500', 'BAT-NEWER', 25, 25, '2026-10-29T08:00:00Z', 'active')`
    );

    // Request 20 units
    const result = await deductOldestFirst(
      "andheri-west",
      "amul-taaza-500",
      20,
      { asOfTime: "2026-10-25T08:00:00Z", logEvents: true }
    );

    expect(result.fulfilledUnits).toBe(20);
    expect(result.unfulfilledUnits).toBe(0);
    expect(result.deductions).toHaveLength(2);

    // Older batch should be fully consumed (15 units) and marked depleted
    const [olderDeduction, newerDeduction] = result.deductions;
    expect(olderDeduction.batchCode).toBe("BAT-OLDER");
    expect(olderDeduction.unitsDeducted).toBe(15);
    expect(olderDeduction.remainingQty).toBe(0);

    // Newer batch should cover the remaining 5 units (20 remaining) and stay active
    expect(newerDeduction.batchCode).toBe("BAT-NEWER");
    expect(newerDeduction.unitsDeducted).toBe(5);
    expect(newerDeduction.remainingQty).toBe(20);

    // Verify database state matches
    const batches = await getActiveBatches("andheri-west", "amul-taaza-500", "2026-10-25T08:00:00Z");
    expect(batches).toHaveLength(1);
    expect(batches[0].batch_code).toBe("BAT-NEWER");
    expect(batches[0].current_qty).toBe(20);
  });

  it("automatically locks expired batches into the waste ledger with zero food leakage", async () => {
    // Check initial state: Dahi batch BAT-AND-DAHI-EXP expires at 18:00 on 2026-10-25 with 20 units
    const lockResult = await lockExpiredBatches("2026-10-25T19:00:00Z", "19:00");
    expect(lockResult.lockedBatchesCount).toBeGreaterThanOrEqual(1);
    expect(lockResult.lockedBatchCodes).toContain("BAT-AND-DAHI-EXP");
    expect(lockResult.expiredUnitsTotal).toBe(20);
    expect(lockResult.totalRupeeLoss).toBe(700); // 20 units * ₹35

    // Verify the expired batch is locked in the database
    const rows = await query<{ status: string; current_qty: number }>(
      "SELECT status, current_qty FROM batches WHERE batch_code = 'BAT-AND-DAHI-EXP'"
    );
    expect(rows[0].status).toBe("expired");
    expect(rows[0].current_qty).toBe(0);

    // Verify the waste ledger entry
    const ledger = await query<{ units: number; rupee_impact: string }>(
      "SELECT units, rupee_impact FROM outcomes_ledger WHERE event_type = 'expired_waste' AND product_id = 'mother-dairy-dahi-400'"
    );
    expect(ledger).toHaveLength(1);
    expect(ledger[0].units).toBe(20);
    expect(parseFloat(ledger[0].rupee_impact)).toBe(-700.0);

    // Attempting to deduct dahi after 19:00 must only draw from the fresh batch
    const deductResult = await deductOldestFirst(
      "andheri-west",
      "mother-dairy-dahi-400",
      10,
      { asOfTime: "2026-10-25T19:00:00Z" }
    );
    expect(deductResult.fulfilledUnits).toBe(10);
    expect(deductResult.deductions[0].batchCode).toBe("BAT-AND-DAHI-02");
  });

  it("handles demand exceeding available stock without going negative", async () => {
    // Andheri milk has 38 units on hand. Request 50 units (shortfall of 12)
    const result = await deductOldestFirst(
      "andheri-west",
      "amul-taaza-500",
      50,
      { asOfTime: "2026-10-25T08:00:00Z", logEvents: true }
    );

    expect(result.fulfilledUnits).toBe(38);
    expect(result.unfulfilledUnits).toBe(12);

    // Stock should now be 0
    const remainingStock = await getAvailableStock("andheri-west", "amul-taaza-500", "2026-10-25T08:00:00Z");
    expect(remainingStock).toBe(0);

    // Lost sale entry logged in outcomes ledger
    const lostSale = await query<{ units: number; rupee_impact: string }>(
      "SELECT units, rupee_impact FROM outcomes_ledger WHERE event_type = 'lost_sale' AND product_id = 'amul-taaza-500'"
    );
    expect(lostSale).toHaveLength(1);
    expect(lostSale[0].units).toBe(12);
    expect(parseFloat(lostSale[0].rupee_impact)).toBe(-(12 * 27)); // 12 units * ₹27 = -₹324
  });

  it("records correct negative rupee loss when stock is completely zero", async () => {
    // Delete all bread batches at Andheri West (zero stock on hand)
    await query("DELETE FROM batches WHERE store_id = 'andheri-west' AND product_id = 'harvest-gold-bread-400'");

    // Attempt to deduct 10 loaves of bread (MRP ₹45)
    const result = await deductOldestFirst(
      "andheri-west",
      "harvest-gold-bread-400",
      10,
      { logEvents: true }
    );

    expect(result.fulfilledUnits).toBe(0);
    expect(result.unfulfilledUnits).toBe(10);

    // Outcomes ledger must record lost_sale with unit_price: 45.0 and rupee_impact: -450.0 (NOT 0)
    const lostSale = await query<{ unit_price: string; rupee_impact: string }>(
      "SELECT unit_price, rupee_impact FROM outcomes_ledger WHERE event_type = 'lost_sale' AND product_id = 'harvest-gold-bread-400'"
    );
    expect(lostSale).toHaveLength(1);
    expect(parseFloat(lostSale[0].unit_price)).toBe(45.0);
    expect(parseFloat(lostSale[0].rupee_impact)).toBe(-450.0);
  });

  it("throws an error when requested units is zero or negative", async () => {
    await expect(
      deductOldestFirst("andheri-west", "amul-taaza-500", 0)
    ).rejects.toThrow("Units requested must be greater than zero");

    await expect(
      deductOldestFirst("andheri-west", "amul-taaza-500", -5)
    ).rejects.toThrow("Units requested must be greater than zero");
  });

  it("detects impending spoilage batches within the 24-hour horizon", async () => {
    // As of 08:00 AM on 2026-10-25: Dahi batch BAT-AND-DAHI-EXP expires at 18:00 (in 10 hours)
    const expiring = await getExpiringBatches("andheri-west", 24, "2026-10-25T08:00:00Z");
    expect(expiring.length).toBeGreaterThanOrEqual(1);

    const dahiBatch = expiring.find((b) => b.batchCode === "BAT-AND-DAHI-EXP");
    expect(dahiBatch).toBeDefined();
    expect(dahiBatch?.currentQty).toBe(20);
    expect(dahiBatch?.hoursUntilExpiry).toBe(10);
    expect(dahiBatch?.unitMrp).toBe(35.0);
  });

  it("reads simulation clock from time_clock table", async () => {
    const clock = await getSimulationClock();
    expect(clock.currentTime).toBe("08:00");
    expect(clock.dayDate).toBe("2026-10-25");
  });
});
