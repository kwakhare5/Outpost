import { query } from "../db";
import {
  deductOldestFirst,
  lockExpiredBatches,
  ExpiryLockResult,
} from "./inventory";
import {
  updateArrivedTransfers,
  VanTransferRecord,
} from "./transit";
import {
  getUrgencyQueue,
  parseClockHour,
  UrgencyItem,
} from "./urgency";

export interface ClockState {
  currentTime: string;
  formattedTime: string;
  dayDate: string;
  totalHoursAdvanced: number;
}

export interface StoreDemandDeduction {
  storeId: string;
  productId: string;
  unitsRequested: number;
  fulfilledUnits: number;
  unfulfilledUnits: number;
}

export interface AdvanceClockResult {
  previousTime: string;
  currentTime: string;
  formattedTime: string;
  dayDate: string;
  totalHoursAdvanced: number;
  demandDeductions: StoreDemandDeduction[];
  expiredBatchesSummary: ExpiryLockResult;
  arrivedTransfers: VanTransferRecord[];
  urgencyQueue: UrgencyItem[];
  // ARCHITECTURE Section 1.C Flow 2 contract aliases
  new_time: string;
  fires: UrgencyItem[];
  arrived_vans: VanTransferRecord[];
}

/**
 * Formats a 24-hour time string into a plain-English 12-hour display string with AM/PM.
 * Example: "08:00" -> "08:00 AM", "18:00" -> "06:00 PM"
 */
export function formatClockTime(time24: string): string {
  const parts = time24.split(":");
  const hour = parseInt(parts[0], 10);
  const minute = parts[1] || "00";
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, "0")}:${minute} ${period}`;
}

/**
 * Returns current operational time, date, and hours advanced from Supabase time_clock table.
 */
export async function getTimeClock(): Promise<ClockState> {
  const rows = await query<{
    current_time: string;
    day_date: string;
    total_hours_advanced: number;
  }>(`SELECT "current_time", day_date, total_hours_advanced FROM time_clock WHERE id = 1`);

  const currentTime = rows.length > 0 ? rows[0].current_time : "08:00";
  const dayDate = rows.length > 0 ? rows[0].day_date : "2026-10-25";
  const totalHoursAdvanced = rows.length > 0 ? Number(rows[0].total_hours_advanced) : 0;

  return {
    currentTime,
    formattedTime: formatClockTime(currentTime),
    dayDate,
    totalHoursAdvanced,
  };
}

/**
 * Resets the operational time clock to a specific time, date, and advancement count.
 */
export async function resetTimeClock(options?: {
  time?: string;
  date?: string;
  totalHoursAdvanced?: number;
}): Promise<ClockState> {
  const targetTime = options?.time || "08:00";
  const targetDate = options?.date || "2026-10-25";
  const advancedCount = options?.totalHoursAdvanced ?? 0;

  await query(
    `INSERT INTO time_clock (id, "current_time", day_date, total_hours_advanced)
     VALUES (1, $1, $2, $3)
     ON CONFLICT (id) DO UPDATE 
     SET "current_time" = $1, 
         day_date = $2, 
         total_hours_advanced = $3`,
    [targetTime, targetDate, advancedCount]
  );

  return {
    currentTime: targetTime,
    formattedTime: formatClockTime(targetTime),
    dayDate: targetDate,
    totalHoursAdvanced: advancedCount,
  };
}

/**
 * Advances the operational clock forward by 1 hour (or specified count).
 * Follows ARCHITECTURE Flow 2 and PRD Section 3.5:
 * 1. Computes the target advanced operational hour.
 * 2. Locks any batches expiring during or up to the advanced hour (zero expired food leakage).
 * 3. Updates Supabase time_clock to the advanced hour.
 * 4. Advances in-flight vans that reached destination by the new timestamp.
 * 5. Consumes hourly demand from oldest active batches under the new clock hour.
 * 6. Recalculates Hours Left and priority urgency queue across all stores.
 */
export async function advanceClock(hoursCount: number = 1): Promise<AdvanceClockResult> {
  if (hoursCount <= 0) {
    throw new Error("Hours count must be greater than zero");
  }

  let currentClockState = await getTimeClock();
  const startingTime = currentClockState.currentTime;
  const accumulatedDeductions: StoreDemandDeduction[] = [];
  let combinedExpiredSummary: ExpiryLockResult = {
    lockedBatchesCount: 0,
    expiredUnitsTotal: 0,
    totalRupeeLoss: 0,
    lockedBatchCodes: [],
  };
  const accumulatedArrivedTransfers: VanTransferRecord[] = [];

  for (let stepIndex = 0; stepIndex < hoursCount; stepIndex++) {
    const currentHourOfDay = parseClockHour(currentClockState.currentTime);

    // 1. Calculate next hour and handle midnight date rollover
    const nextHourRaw = currentHourOfDay + 1;
    const nextHourOfDay = nextHourRaw % 24;
    let nextDayDate = currentClockState.dayDate;
    if (nextHourRaw >= 24) {
      const dateInstance = new Date(`${currentClockState.dayDate}T00:00:00.000Z`);
      dateInstance.setUTCDate(dateInstance.getUTCDate() + 1);
      nextDayDate = dateInstance.toISOString().split("T")[0];
    }
    const nextTimeString = `${String(nextHourOfDay).padStart(2, "0")}:00`;
    const nextStepTimestamp = `${nextDayDate}T${nextTimeString}:00.000Z`;

    // 2. Lock batches reaching expiration up to the advanced timestamp (zero expired food leakage)
    const expiryLockResult = await lockExpiredBatches(nextStepTimestamp, nextTimeString);
    combinedExpiredSummary = {
      lockedBatchesCount: combinedExpiredSummary.lockedBatchesCount + expiryLockResult.lockedBatchesCount,
      expiredUnitsTotal: combinedExpiredSummary.expiredUnitsTotal + expiryLockResult.expiredUnitsTotal,
      totalRupeeLoss: combinedExpiredSummary.totalRupeeLoss + expiryLockResult.totalRupeeLoss,
      lockedBatchCodes: [
        ...combinedExpiredSummary.lockedBatchCodes,
        ...expiryLockResult.lockedBatchCodes,
      ],
    };

    // 3. Update database time_clock table to the advanced operational hour
    const updatedRows = await query<{
      current_time: string;
      day_date: string;
      total_hours_advanced: number;
    }>(
      `UPDATE time_clock
       SET "current_time" = $1,
           day_date = $2,
           total_hours_advanced = total_hours_advanced + 1
       WHERE id = 1
       RETURNING "current_time", day_date, total_hours_advanced`,
      [nextTimeString, nextDayDate]
    );

    currentClockState = {
      currentTime: updatedRows[0].current_time,
      formattedTime: formatClockTime(updatedRows[0].current_time),
      dayDate: updatedRows[0].day_date,
      totalHoursAdvanced: Number(updatedRows[0].total_hours_advanced),
    };

    // 4. Update in-flight vans that arrived at their destination by the new timestamp
    const arrivedVans = await updateArrivedTransfers(nextStepTimestamp);
    accumulatedArrivedTransfers.push(...arrivedVans);

    // 5. Fetch real demand curves joined with product pricing for the hour that transpired
    const demandRows = await query<{
      store_id: string;
      product_id: string;
      units_demanded: string;
      unit_mrp: string;
    }>(
      `SELECT d.store_id, d.product_id, d.units_demanded, p.unit_mrp
       FROM real_demand_curves d
       JOIN products p ON d.product_id = p.id
       WHERE d.hour_of_day = $1
       ORDER BY d.store_id, d.product_id`,
      [currentHourOfDay]
    );

    // 6. Deduct demand using Oldest-First under the new operational hour
    const stepDeductionResults = await Promise.all(
      demandRows.map(async (demandRow) => {
        const unitsDemanded = Math.round(parseFloat(demandRow.units_demanded));
        if (unitsDemanded <= 0) return null;

        const unitMrp = parseFloat(demandRow.unit_mrp);
        return deductOldestFirst(
          demandRow.store_id,
          demandRow.product_id,
          unitsDemanded,
          {
            clockTime: nextTimeString,
            asOfTime: nextStepTimestamp,
            logEvents: true,
            skipLockExpired: true,
            unitMrp,
          }
        );
      })
    );

    for (const deductionResult of stepDeductionResults) {
      if (deductionResult) {
        accumulatedDeductions.push({
          storeId: deductionResult.storeId,
          productId: deductionResult.productId,
          unitsRequested: deductionResult.unitsRequested,
          fulfilledUnits: deductionResult.fulfilledUnits,
          unfulfilledUnits: deductionResult.unfulfilledUnits,
        });
      }
    }
  }

  // 7. Recalculate priority urgency queue with new stock and demand state
  const updatedHour = parseClockHour(currentClockState.currentTime);
  const updatedTimestamp = `${currentClockState.dayDate}T${currentClockState.currentTime}:00.000Z`;
  const recalculatedUrgencyQueue = await getUrgencyQueue({
    hour: updatedHour,
    asOfTime: updatedTimestamp,
  });

  return {
    previousTime: startingTime,
    currentTime: currentClockState.currentTime,
    formattedTime: currentClockState.formattedTime,
    dayDate: currentClockState.dayDate,
    totalHoursAdvanced: currentClockState.totalHoursAdvanced,
    demandDeductions: accumulatedDeductions,
    expiredBatchesSummary: combinedExpiredSummary,
    arrivedTransfers: accumulatedArrivedTransfers,
    urgencyQueue: recalculatedUrgencyQueue,
    // ARCHITECTURE Section 1.C Flow 2 contract aliases
    new_time: currentClockState.currentTime,
    fires: recalculatedUrgencyQueue,
    arrived_vans: accumulatedArrivedTransfers,
  };
}
