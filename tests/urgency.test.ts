import { describe, it, expect, beforeEach, afterAll } from "vitest";
import dotenv from "dotenv";
dotenv.config();

import { db } from "../lib/db";
import { seedDatabase } from "../lib/db/seed";
import {
  computeUrgencyMetrics,
  calculateItemUrgency,
  getUrgencyQueue,
  parseClockHour,
} from "../lib/engine/urgency";

describe("Urgency Detection Engine (Task 2.3)", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await db.end();
  });

  it("parses Time Clock hour correctly including midnight boundary", () => {
    expect(parseClockHour("08:00")).toBe(8);
    expect(parseClockHour("00:00")).toBe(0); // Midnight must not default to 8
    expect(parseClockHour("23:45")).toBe(23);
    expect(parseClockHour("invalid")).toBe(8);
  });

  it("computes urgency metrics correctly for regular and edge cases", () => {
    // 38 units on hand, 45 units/hr demand -> ~51 mins left (< 1.5 hrs => critical)
    const amulMetrics = computeUrgencyMetrics(38, 45.0, 27.0);
    expect(amulMetrics.hoursLeft).toBe(0.84);
    expect(amulMetrics.minutesLeft).toBe(51);
    expect(amulMetrics.isUrgent).toBe(true);
    expect(amulMetrics.urgencyLevel).toBe("critical");
    expect(amulMetrics.burnRatePerMinute).toBe(20.25); // 45 * 27 / 60 = 20.25 ₹/min

    // Zero demand with stock -> safe (null runway)
    const zeroDemand = computeUrgencyMetrics(10, 0, 50.0);
    expect(zeroDemand.hoursLeft).toBeNull();
    expect(zeroDemand.minutesLeft).toBeNull();
    expect(zeroDemand.isUrgent).toBe(false);
    expect(zeroDemand.urgencyLevel).toBe("healthy");
    expect(zeroDemand.burnRatePerMinute).toBe(0);

    // Zero demand with zero stock -> critical stockout (0 hours)
    const zeroStockZeroDemand = computeUrgencyMetrics(0, 0, 50.0);
    expect(zeroStockZeroDemand.hoursLeft).toBe(0);
    expect(zeroStockZeroDemand.minutesLeft).toBe(0);
    expect(zeroStockZeroDemand.isUrgent).toBe(true);
    expect(zeroStockZeroDemand.urgencyLevel).toBe("critical");
  });

  it("proves Amul Milk in Andheri West stockout is detected ~50 minutes ahead", async () => {
    // At morning hour 8 (08:00 AM), Andheri West Amul Milk has 38 stock and 45 units/hr demand
    const urgency = await calculateItemUrgency("andheri-west", "amul-taaza-500", { hour: 8 });

    expect(urgency).not.toBeNull();
    if (!urgency) return;

    expect(urgency.storeId).toBe("andheri-west");
    expect(urgency.productId).toBe("amul-taaza-500");
    expect(urgency.currentStock).toBe(38);
    expect(urgency.hourlyDemand).toBe(45);
    expect(urgency.unitMrp).toBe(27);

    // Minutes left is ~50 minutes (specifically 51 minutes / 0.84 hours)
    expect(urgency.minutesLeft).toBeGreaterThanOrEqual(49);
    expect(urgency.minutesLeft).toBeLessThanOrEqual(52);
    expect(urgency.hoursLeft).toBeLessThan(1.5);
    expect(urgency.isUrgent).toBe(true);
    expect(urgency.urgencyLevel).toBe("critical");
    expect(urgency.burnRatePerMinute).toBe(20.25);
  });

  it("confirms Bandra Amul Milk has surplus buffer during the same hour", async () => {
    // Bandra has 112 units on hand, 38.25 units/hr demand at hour 8
    const bandraUrgency = await calculateItemUrgency("bandra", "amul-taaza-500", { hour: 8 });

    expect(bandraUrgency).not.toBeNull();
    if (!bandraUrgency) return;

    expect(bandraUrgency.currentStock).toBe(112);
    expect(bandraUrgency.hourlyDemand).toBe(38.25);
    // Hours left is ~2.93 hours (> 1.5 hrs => not critical red alert)
    expect(bandraUrgency.hoursLeft).toBeCloseTo(2.93, 1);
    expect(bandraUrgency.isUrgent).toBe(false);
    expect(bandraUrgency.urgencyLevel).toBe("warning");
    expect(bandraUrgency.burnRatePerMinute).toBeCloseTo(17.21, 1);
  });

  it("prioritizes queue strictly by Hours Left ascending with tie-breaking", async () => {
    const queue = await getUrgencyQueue({ hour: 8 });

    expect(queue.length).toBe(15); // 3 stores * 5 products

    // The top risk item should have the minimum hoursLeft
    const topItem = queue[0];
    expect(topItem.storeId).toBe("andheri-west");
    expect(topItem.productId).toBe("amul-taaza-500");
    expect(topItem.urgencyLevel).toBe("critical");

    // Ensure list is ordered: numeric hoursLeft first in ascending order, nulls at the end
    let seenNull = false;
    for (let i = 1; i < queue.length; i++) {
      const prev = queue[i - 1].hoursLeft;
      const curr = queue[i].hoursLeft;

      if (curr === null) {
        seenNull = true;
      }
      if (seenNull) {
        expect(curr).toBeNull();
      } else if (prev !== null && curr !== null) {
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    }
  });
});
