import { query } from "../db";
import { getTimeClock } from "./inventory";

export interface UrgencyItem {
  storeId: string;
  storeName: string;
  productId: string;
  productName: string;
  unitMrp: number;
  currentStock: number;
  hourlyDemand: number;
  hoursLeft: number | null;
  minutesLeft: number | null;
  isUrgent: boolean;
  urgencyLevel: "critical" | "warning" | "healthy";
  burnRatePerMinute: number;
}

interface UrgencyDbRow {
  store_id: string;
  store_name: string;
  product_id: string;
  product_name: string;
  unit_mrp: string;
  current_stock: number;
  hourly_demand: string;
}

/**
 * Pure calculation helper: calculates Hours Left, Minutes Left, Urgency Level,
 * and Sales Velocity at Risk (Rupees/minute).
 */
export function computeUrgencyMetrics(
  currentStock: number,
  hourlyDemand: number,
  unitMrp: number
): {
  hoursLeft: number | null;
  minutesLeft: number | null;
  isUrgent: boolean;
  urgencyLevel: "critical" | "warning" | "healthy";
  burnRatePerMinute: number;
} {
  let hoursLeft: number | null = null;
  let minutesLeft: number | null = null;
  let isUrgent = false;
  let urgencyLevel: "critical" | "warning" | "healthy" = "healthy";

  if (hourlyDemand <= 0) {
    if (currentStock === 0) {
      hoursLeft = 0;
      minutesLeft = 0;
      isUrgent = true;
      urgencyLevel = "critical";
    } else {
      hoursLeft = null;
      minutesLeft = null;
      isUrgent = false;
      urgencyLevel = "healthy";
    }
  } else {
    hoursLeft = Number((currentStock / hourlyDemand).toFixed(2));
    minutesLeft = Math.round((currentStock / hourlyDemand) * 60);
    isUrgent = hoursLeft < 1.5;
    urgencyLevel = hoursLeft < 1.5 ? "critical" : hoursLeft < 4.0 ? "warning" : "healthy";
  }

  // Sales velocity at risk in Rupees/minute (PRD Section 6 Edge Case 2)
  const burnRatePerMinute = Number(((hourlyDemand * unitMrp) / 60).toFixed(2));

  return {
    hoursLeft,
    minutesLeft,
    isUrgent,
    urgencyLevel,
    burnRatePerMinute,
  };
}

/**
 * Extracts hour of day from Time Clock string (e.g. "08:00" -> 8, "00:00" -> 0).
 */
export function parseClockHour(currentTime: string): number {
  const parts = currentTime.split(":");
  const parsed = parseInt(parts[0], 10);
  return Number.isNaN(parsed) ? 8 : parsed;
}

async function resolveClockOptions(options?: { hour?: number; asOfTime?: string | Date }): Promise<{
  hour: number;
  asOfTime: string;
}> {
  const clock = await getTimeClock();
  const hour = options?.hour ?? parseClockHour(clock.currentTime);
  const asOfTime = options?.asOfTime
    ? (options.asOfTime instanceof Date ? options.asOfTime.toISOString() : options.asOfTime)
    : `${clock.dayDate}T${clock.currentTime}:00Z`;

  return { hour, asOfTime };
}

function mapUrgencyRow(row: UrgencyDbRow): UrgencyItem {
  const unitMrp = parseFloat(row.unit_mrp);
  const hourlyDemand = parseFloat(row.hourly_demand);
  const currentStock = row.current_stock;
  const metrics = computeUrgencyMetrics(currentStock, hourlyDemand, unitMrp);

  return {
    storeId: row.store_id,
    storeName: row.store_name,
    productId: row.product_id,
    productName: row.product_name,
    unitMrp,
    currentStock,
    hourlyDemand,
    ...metrics,
  };
}

/**
 * Calculates stockout urgency for a single store & product.
 */
export async function calculateItemUrgency(
  storeId: string,
  productId: string,
  options?: { hour?: number; asOfTime?: string | Date }
): Promise<UrgencyItem | null> {
  const { hour, asOfTime } = await resolveClockOptions(options);

  const rows = await query<UrgencyDbRow>(
    `SELECT 
       s.id AS store_id,
       s.name AS store_name,
       p.id AS product_id,
       p.name AS product_name,
       p.unit_mrp,
       COALESCE(b.total_stock, 0)::INTEGER AS current_stock,
       COALESCE(demand_curves.units_demanded, 0)::NUMERIC AS hourly_demand
     FROM stores s
     JOIN products p ON p.id = $2
     LEFT JOIN (
       SELECT store_id, product_id, SUM(current_qty) AS total_stock
       FROM batches
       WHERE status = 'active' AND expires_at > $3
       GROUP BY store_id, product_id
     ) b ON b.store_id = s.id AND b.product_id = p.id
     LEFT JOIN real_demand_curves demand_curves 
       ON demand_curves.store_id = s.id AND demand_curves.product_id = p.id AND demand_curves.hour_of_day = $4
     WHERE s.id = $1`,
    [storeId, productId, asOfTime, hour]
  );

  if (rows.length === 0) return null;
  return mapUrgencyRow(rows[0]);
}

/**
 * Returns prioritized risk cards for all stores & products, sorted by Hours Left ascending.
 * Tie-breaker: higher sales velocity at risk (Rupees/minute) first (ADR 0006 & PRD Section 6).
 */
export async function getUrgencyQueue(
  options?: { hour?: number; asOfTime?: string | Date }
): Promise<UrgencyItem[]> {
  const { hour, asOfTime } = await resolveClockOptions(options);

  const rows = await query<UrgencyDbRow>(
    `SELECT 
       s.id AS store_id,
       s.name AS store_name,
       p.id AS product_id,
       p.name AS product_name,
       p.unit_mrp,
       COALESCE(b.total_stock, 0)::INTEGER AS current_stock,
       COALESCE(demand_curves.units_demanded, 0)::NUMERIC AS hourly_demand
     FROM stores s
     CROSS JOIN products p
     LEFT JOIN (
       SELECT store_id, product_id, SUM(current_qty) AS total_stock
       FROM batches
       WHERE status = 'active' AND expires_at > $1
       GROUP BY store_id, product_id
     ) b ON b.store_id = s.id AND b.product_id = p.id
     LEFT JOIN real_demand_curves demand_curves 
       ON demand_curves.store_id = s.id AND demand_curves.product_id = p.id AND demand_curves.hour_of_day = $2`,
    [asOfTime, hour]
  );

  const items = rows.map(mapUrgencyRow);

  // Sort strictly by Hours Left ascending, placing null (no demand) at bottom,
  // tie-breaking by highest burn rate per minute
  return items.sort((a, b) => {
    if (a.hoursLeft === null && b.hoursLeft === null) {
      return b.burnRatePerMinute - a.burnRatePerMinute;
    }
    if (a.hoursLeft === null) return 1;
    if (b.hoursLeft === null) return -1;

    if (a.hoursLeft !== b.hoursLeft) {
      return a.hoursLeft - b.hoursLeft;
    }
    return b.burnRatePerMinute - a.burnRatePerMinute;
  });
}
