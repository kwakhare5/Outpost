import { describe, it, expect, beforeEach } from "vitest";
import { query } from "../lib/db";
import { seedStartingBatches } from "../lib/db/seed";
import {
  getTimeClock,
  resetTimeClock,
  advanceClock,
  formatClockTime,
} from "../lib/engine/clock";
import {
  dispatchVanTransfer,
  confirmDoorstepCount,
} from "../lib/engine/transit";
import { getAvailableStock } from "../lib/engine/inventory";
import { GET as getClockRoute } from "../app/api/clock/route";
import { POST as postAdvanceRoute } from "../app/api/clock/advance/route";
import { NextRequest } from "next/server";

describe("Top-Bar Time Clock Controller & Advancement Engine (Task 3.2)", { timeout: 30000 }, () => {
  beforeEach(async () => {
    // Fast operational reset: clean ledger, reset transfers, restore starting batches & 08:00 clock
    await query(`DELETE FROM outcomes_ledger`);
    await query(`DELETE FROM van_transfers`);
    await seedStartingBatches();
    await resetTimeClock();
  });

  it("GET /api/clock returns initial 08:00 AM operational clock state with formatted display time", async () => {
    const response = await getClockRoute();
    expect(response.status).toBe(200);

    const clock = await response.json();
    expect(clock.currentTime).toBe("08:00");
    expect(clock.formattedTime).toBe("08:00 AM");
    expect(clock.dayDate).toBe("2026-10-25");
    expect(clock.totalHoursAdvanced).toBe(0);
  });

  it("advances 1 hour: steps clock to 09:00, consumes demand from oldest batches, and logs under advancing clock time", async () => {
    // Prior to advancement: Andheri has 38 Amul Milk units on hand
    const stockBeforeAndheri = await getAvailableStock("andheri-west", "amul-taaza-500");
    expect(stockBeforeAndheri).toBe(38);

    const stockBeforeBandra = await getAvailableStock("bandra", "amul-taaza-500");
    expect(stockBeforeBandra).toBe(112);

    // Advance 1 hour (from 08:00 to 09:00)
    const result = await advanceClock(1);

    expect(result.previousTime).toBe("08:00");
    expect(result.currentTime).toBe("09:00");
    expect(result.formattedTime).toBe("09:00 AM");
    expect(result.dayDate).toBe("2026-10-25");
    expect(result.totalHoursAdvanced).toBe(1);

    // Flow 2 contract aliases
    expect(result.new_time).toBe("09:00");
    expect(result.fires).toBeDefined();
    expect(result.arrived_vans).toBeDefined();

    // Verify Andheri West Milk stockout: 38 on hand vs 45 demanded at 08:00
    // 38 fulfilled, 7 unfulfilled lost sales, stock drops to 0
    const stockAfterAndheri = await getAvailableStock("andheri-west", "amul-taaza-500");
    expect(stockAfterAndheri).toBe(0);

    const andheriMilkDeduction = result.demandDeductions.find(
      (deduction) => deduction.storeId === "andheri-west" && deduction.productId === "amul-taaza-500"
    );
    expect(andheriMilkDeduction).toBeDefined();
    expect(andheriMilkDeduction?.unitsRequested).toBe(45);
    expect(andheriMilkDeduction?.fulfilledUnits).toBe(38);
    expect(andheriMilkDeduction?.unfulfilledUnits).toBe(7);

    // Verify outcomes_ledger has 38 sales and 7 lost sales logged under advancing operational hour '09:00'
    const ledgerRows = await query<{
      clock_time: string;
      event_type: string;
      units: number;
      rupee_impact: string;
    }>(
      `SELECT clock_time, event_type, units, rupee_impact 
       FROM outcomes_ledger 
       WHERE store_id = 'andheri-west' AND product_id = 'amul-taaza-500'
       ORDER BY id ASC`
    );
    expect(ledgerRows).toHaveLength(2);
    expect(ledgerRows[0].clock_time).toBe("09:00");
    expect(ledgerRows[0].event_type).toBe("sale");
    expect(ledgerRows[0].units).toBe(38);
    expect(parseFloat(ledgerRows[0].rupee_impact)).toBe(38 * 27); // ₹1026
    expect(ledgerRows[1].clock_time).toBe("09:00");
    expect(ledgerRows[1].event_type).toBe("lost_sale");
    expect(ledgerRows[1].units).toBe(7);
    expect(parseFloat(ledgerRows[1].rupee_impact)).toBe(-(7 * 27)); // -₹189

    // Verify Bandra Milk: starts with 112, demands 38 (38.25 in dataset) at 08:00 -> 74 remaining
    const stockAfterBandra = await getAvailableStock("bandra", "amul-taaza-500");
    expect(stockAfterBandra).toBe(74);
  });

  it("POST /api/clock/advance route advances time and returns recalculated urgency queue", async () => {
    const request = new NextRequest("http://localhost:3000/api/clock/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours: 1 }),
    });

    const response = await postAdvanceRoute(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.currentTime).toBe("09:00");
    expect(data.formattedTime).toBe("09:00 AM");
    expect(data.totalHoursAdvanced).toBe(1);

    // Urgency queue must rank Andheri Amul Milk at critical (0 units left, ~0 hours left)
    expect(data.urgencyQueue.length).toBeGreaterThan(0);
    const andheriMilkUrgency = data.urgencyQueue.find(
      (item: { storeId: string; productId: string }) =>
        item.storeId === "andheri-west" && item.productId === "amul-taaza-500"
    );
    expect(andheriMilkUrgency).toBeDefined();
    expect(andheriMilkUrgency.currentStock).toBe(0);
    expect(andheriMilkUrgency.urgencyLevel).toBe("critical");
    expect(andheriMilkUrgency.hoursLeft).toBe(0);
  });

  it("advances in-flight delivery vans to 'arrived' status when transit ETA has elapsed", async () => {
    // 1. Dispatch a transfer of 40 cartons from Bandra to Andheri at 08:00 AM (ETA 08:45)
    const transfer = await dispatchVanTransfer({
      fromStoreId: "bandra",
      toStoreId: "andheri-west",
      productId: "amul-taaza-500",
      quantity: 40,
      asOfTime: "2026-10-25T08:00:00.000Z",
      clockTime: "08:00",
    });

    expect(transfer.status).toBe("in_transit");
    expect(new Date(transfer.expectedArrivalAt!).toISOString()).toBe("2026-10-25T08:45:00.000Z");

    // 2. Doorstep count should be BLOCKED while van is in transit
    await expect(
      confirmDoorstepCount({
        transferId: transfer.id,
        receivedQty: 40,
        damagedQty: 0,
        asOfTime: "2026-10-25T08:30:00.000Z",
      })
    ).rejects.toThrow(/Van is still in transit on the road/);

    // 3. Advance clock by 1 hour (08:00 -> 09:00)
    const advanceResult = await advanceClock(1);
    expect(advanceResult.currentTime).toBe("09:00");

    // The transfer must be reported in arrivedTransfers
    const arrivedIds = advanceResult.arrivedTransfers.map((arrivedTransfer) => arrivedTransfer.id);
    expect(arrivedIds).toContain(transfer.id);

    // 4. Verify in database that transfer status is now 'arrived'
    const transferRows = await query<{ status: string }>(
      `SELECT status FROM van_transfers WHERE id = $1`,
      [transfer.id]
    );
    expect(transferRows[0].status).toBe("arrived");

    // 5. Doorstep count confirmation is now UNLOCKED and completes cleanly
    const confirmed = await confirmDoorstepCount({
      transferId: transfer.id,
      receivedQty: 38,
      damagedQty: 2,
      asOfTime: "2026-10-25T09:00:00.000Z",
      clockTime: "09:00",
    });

    expect(confirmed.status).toBe("received");
    expect(confirmed.receivedQty).toBe(38);
    expect(confirmed.damagedQty).toBe(2);
  });

  it("locks mid-hour expiring stock BEFORE customer order fulfillment (zero expired food leakage)", async () => {
    // Insert a batch of bread in Powai with expiration timestamp mid-hour at 08:30 AM
    await query(
      `INSERT INTO batches (store_id, product_id, batch_code, initial_qty, current_qty, expires_at, status)
       VALUES ('powai', 'harvest-gold-bread-400', 'BAT-TEST-EXP-0830', 15, 15, '2026-10-25T08:30:00.000Z', 'active')`
    );

    // Advance clock from 08:00 to 09:00
    const result = await advanceClock(1);
    expect(result.currentTime).toBe("09:00");

    // The mid-hour expiring batch must be locked and recorded in expiredBatchesSummary
    expect(result.expiredBatchesSummary.lockedBatchesCount).toBeGreaterThanOrEqual(1);
    expect(result.expiredBatchesSummary.lockedBatchCodes).toContain("BAT-TEST-EXP-0830");

    // Verify batch status is 'expired' with current_qty 0
    const batchRows = await query<{ status: string; current_qty: number }>(
      `SELECT status, current_qty FROM batches WHERE batch_code = 'BAT-TEST-EXP-0830'`
    );
    expect(batchRows[0].status).toBe("expired");
    expect(batchRows[0].current_qty).toBe(0);

    // Verify waste was logged to outcomes_ledger
    const wasteRows = await query<{ event_type: string; units: number; rupee_impact: string }>(
      `SELECT event_type, units, rupee_impact 
       FROM outcomes_ledger 
       WHERE store_id = 'powai' AND event_type = 'expired_waste'`
    );
    expect(wasteRows.length).toBeGreaterThanOrEqual(1);
  });

  it("advances multiple hours sequentially and formats time strings", async () => {
    // Advance 3 hours (08:00 -> 11:00)
    const result = await advanceClock(3);
    expect(result.previousTime).toBe("08:00");
    expect(result.currentTime).toBe("11:00");
    expect(result.formattedTime).toBe("11:00 AM");
    expect(result.totalHoursAdvanced).toBe(3);

    const clock = await getTimeClock();
    expect(clock.currentTime).toBe("11:00");
    expect(clock.formattedTime).toBe("11:00 AM");
    expect(clock.totalHoursAdvanced).toBe(3);
  });

  it("formats 24-hour clock strings into plain 12-hour AM/PM representations", () => {
    expect(formatClockTime("08:00")).toBe("08:00 AM");
    expect(formatClockTime("00:00")).toBe("12:00 AM");
    expect(formatClockTime("12:00")).toBe("12:00 PM");
    expect(formatClockTime("13:45")).toBe("01:45 PM");
    expect(formatClockTime("23:59")).toBe("11:59 PM");
  });

  it("rejects invalid advancement payloads with HTTP 400", async () => {
    const invalidRequest = new NextRequest("http://localhost:3000/api/clock/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours: -2 }),
    });

    const response = await postAdvanceRoute(invalidRequest);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toMatch(/positive integer/i);
  });

  it("resets operational clock back to 08:00 AM via resetTimeClock helper", async () => {
    // Advance 2 hours first
    await advanceClock(2);
    let clock = await getTimeClock();
    expect(clock.currentTime).toBe("10:00");

    // Reset clock
    const resetResult = await resetTimeClock();
    expect(resetResult.currentTime).toBe("08:00");
    expect(resetResult.formattedTime).toBe("08:00 AM");
    expect(resetResult.totalHoursAdvanced).toBe(0);

    clock = await getTimeClock();
    expect(clock.currentTime).toBe("08:00");
    expect(clock.formattedTime).toBe("08:00 AM");
    expect(clock.totalHoursAdvanced).toBe(0);
  });
});
