import { db, query } from "../db";

export interface BatchRecord {
  id: string;
  store_id: string;
  product_id: string;
  batch_code: string;
  initial_qty: number;
  current_qty: number;
  expires_at: string;
  status: "active" | "expired" | "depleted";
}

export interface BatchDeduction {
  batchId: string;
  batchCode: string;
  unitsDeducted: number;
  remainingQty: number;
  expiresAt: string;
}

export interface DeductionResult {
  storeId: string;
  productId: string;
  unitsRequested: number;
  fulfilledUnits: number;
  unfulfilledUnits: number;
  deductions: BatchDeduction[];
}

export interface ExpiryLockResult {
  lockedBatchesCount: number;
  expiredUnitsTotal: number;
  totalRupeeLoss: number;
  lockedBatchCodes: string[];
}

export interface ExpiringBatchInfo {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  batchCode: string;
  currentQty: number;
  unitMrp: number;
  expiresAt: string;
  hoursUntilExpiry: number;
}

/**
 * Returns current operational time and date from the database clock table.
 * Follows GLOSSARY.md domain term: "Time Clock".
 */
export async function getTimeClock(): Promise<{ currentTime: string; dayDate: string }> {
  const rows = await query<{ current_time: string; day_date: string }>(
    `SELECT "current_time", day_date FROM time_clock WHERE id = 1`
  );
  if (rows.length > 0) {
    return { currentTime: rows[0].current_time, dayDate: rows[0].day_date };
  }
  return { currentTime: "08:00", dayDate: "2026-10-25" };
}

// Deprecated alias retained for backward compatibility
export const getSimulationClock = getTimeClock;

function normalizeTimestamp(time?: string | Date): string {
  if (!time) return new Date().toISOString();
  return time instanceof Date ? time.toISOString() : time;
}

/**
 * Automatically locks any active batch that has reached or passed its expiration timestamp.
 * Expired units are removed from available stock and logged directly to the waste ledger.
 */
export async function lockExpiredBatches(
  asOfTime?: string | Date,
  clockTime?: string
): Promise<ExpiryLockResult> {
  const timestamp = normalizeTimestamp(asOfTime);
  const clock = clockTime || (await getSimulationClock()).currentTime;

  // 1. Find all active batches that have expired
  const expiredBatches = await query<{
    id: string;
    store_id: string;
    product_id: string;
    batch_code: string;
    current_qty: number;
    unit_mrp: string;
  }>(
    `SELECT b.id, b.store_id, b.product_id, b.batch_code, b.current_qty, p.unit_mrp
     FROM batches b
     JOIN products p ON b.product_id = p.id
     WHERE b.status = 'active'
       AND b.expires_at <= $1
     ORDER BY b.expires_at ASC`,
    [timestamp]
  );

  if (expiredBatches.length === 0) {
    return {
      lockedBatchesCount: 0,
      expiredUnitsTotal: 0,
      totalRupeeLoss: 0,
      lockedBatchCodes: [],
    };
  }

  const client = await db.connect();
  let expiredUnitsTotal = 0;
  let totalRupeeLoss = 0;
  const lockedBatchCodes: string[] = [];

  try {
    await client.query("BEGIN");

    for (const batch of expiredBatches) {
      const units = batch.current_qty;
      const unitPrice = parseFloat(batch.unit_mrp);
      const rupeeImpact = -(units * unitPrice);

      // Lock batch status to expired
      await client.query(
        `UPDATE batches 
         SET status = 'expired', current_qty = 0 
         WHERE id = $1`,
        [batch.id]
      );

      // Log to outcomes waste ledger if there were remaining units
      if (units > 0) {
        await client.query(
          `INSERT INTO outcomes_ledger (clock_time, store_id, product_id, event_type, units, unit_price, rupee_impact, is_baseline)
           VALUES ($1, $2, $3, 'expired_waste', $4, $5, $6, 0)`,
          [clock, batch.store_id, batch.product_id, units, unitPrice, rupeeImpact]
        );

        expiredUnitsTotal += units;
        totalRupeeLoss += Math.abs(rupeeImpact);
      }

      lockedBatchCodes.push(batch.batch_code);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return {
    lockedBatchesCount: expiredBatches.length,
    expiredUnitsTotal,
    totalRupeeLoss,
    lockedBatchCodes,
  };
}

/**
 * Returns sellable stock for a product at a store (only active, unexpired batches).
 */
export async function getAvailableStock(
  storeId: string,
  productId: string,
  asOfTime?: string | Date
): Promise<number> {
  const timestamp = normalizeTimestamp(asOfTime);

  const rows = await query<{ total_stock: string }>(
    `SELECT COALESCE(SUM(current_qty), 0) as total_stock
     FROM batches
     WHERE store_id = $1
       AND product_id = $2
       AND status = 'active'
       AND expires_at > $3`,
    [storeId, productId, timestamp]
  );

  return parseInt(rows[0]?.total_stock || "0", 10);
}

/**
 * Returns active, unexpired batches for a store and product, sorted Oldest-First.
 */
export async function getActiveBatches(
  storeId: string,
  productId: string,
  asOfTime?: string | Date
): Promise<BatchRecord[]> {
  const timestamp = normalizeTimestamp(asOfTime);

  return query<BatchRecord>(
    `SELECT id, store_id, product_id, batch_code, initial_qty, current_qty, expires_at, status
     FROM batches
     WHERE store_id = $1
       AND product_id = $2
       AND status = 'active'
       AND current_qty > 0
       AND expires_at > $3
     ORDER BY expires_at ASC, id ASC`,
    [storeId, productId, timestamp]
  );
}

/**
 * Spots active batches expiring within the specified horizon (default 24 hours).
 * Used by Price Cuts and Spoilage Rescue recommendations.
 */
export async function getExpiringBatches(
  storeId?: string,
  hoursAhead: number = 24,
  asOfTime?: string | Date
): Promise<ExpiringBatchInfo[]> {
  const asOf = asOfTime instanceof Date ? asOfTime : new Date(asOfTime || "2026-10-25T08:00:00Z");
  const asOfIso = asOf.toISOString();
  const horizonDate = new Date(asOf.getTime() + hoursAhead * 60 * 60 * 1000);
  const horizonIso = horizonDate.toISOString();

  let sql = `
    SELECT b.id, b.store_id, b.product_id, p.name as product_name, b.batch_code,
           b.current_qty, p.unit_mrp, b.expires_at
    FROM batches b
    JOIN products p ON b.product_id = p.id
    WHERE b.status = 'active'
      AND b.current_qty > 0
      AND b.expires_at > $1
      AND b.expires_at <= $2
  `;
  const params: unknown[] = [asOfIso, horizonIso];

  if (storeId) {
    sql += ` AND b.store_id = $3`;
    params.push(storeId);
  }
  sql += ` ORDER BY b.expires_at ASC, b.id ASC`;

  const rows = await query<{
    id: string;
    store_id: string;
    product_id: string;
    product_name: string;
    batch_code: string;
    current_qty: number;
    unit_mrp: string;
    expires_at: string;
  }>(sql, params);

  return rows.map((r) => {
    const expiryMs = new Date(r.expires_at).getTime();
    const hoursUntil = Math.max(0, (expiryMs - asOf.getTime()) / (1000 * 60 * 60));
    return {
      id: r.id,
      storeId: r.store_id,
      productId: r.product_id,
      productName: r.product_name,
      batchCode: r.batch_code,
      currentQty: r.current_qty,
      unitMrp: parseFloat(r.unit_mrp),
      expiresAt: r.expires_at,
      hoursUntilExpiry: Math.round(hoursUntil * 10) / 10,
    };
  });
}

/**
 * Deducts units using strict Oldest-First priority in an atomic transaction.
 * Automatically locks any expired batches first.
 * Never leaks expired food into customer fulfillment.
 */
export async function deductOldestFirst(
  storeId: string,
  productId: string,
  unitsRequested: number,
  options?: {
    clockTime?: string;
    asOfTime?: string | Date;
    logEvents?: boolean;
  }
): Promise<DeductionResult> {
  if (unitsRequested <= 0) {
    throw new Error("Units requested must be greater than zero");
  }

  const asOf = options?.asOfTime || new Date();
  const timestamp = normalizeTimestamp(asOf);
  const clock = options?.clockTime || (await getSimulationClock()).currentTime;
  const shouldLog = options?.logEvents ?? false;

  // 1. Fetch product MRP directly from products table (guarantees non-zero pricing even if stock is 0)
  const productRows = await query<{ unit_mrp: string }>(
    `SELECT unit_mrp FROM products WHERE id = $1`,
    [productId]
  );
  if (productRows.length === 0) {
    throw new Error(`Product not found: ${productId}`);
  }
  const unitMrp = parseFloat(productRows[0].unit_mrp);

  // 2. Lock any expired stock before touching inventory
  await lockExpiredBatches(asOf, clock);

  // 3. Fetch active batches ordered by earliest expiration timestamp
  const batches = await query<{
    id: string;
    batch_code: string;
    current_qty: number;
    expires_at: string;
  }>(
    `SELECT id, batch_code, current_qty, expires_at
     FROM batches
     WHERE store_id = $1
       AND product_id = $2
       AND status = 'active'
       AND current_qty > 0
       AND expires_at > $3
     ORDER BY expires_at ASC, id ASC`,
    [storeId, productId, timestamp]
  );

  let remainingToDeduct = unitsRequested;
  const deductions: BatchDeduction[] = [];

  // 4. Execute batch deduction inside an atomic database transaction
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    for (const batch of batches) {
      if (remainingToDeduct <= 0) break;

      const deduct = Math.min(remainingToDeduct, batch.current_qty);
      const newQty = batch.current_qty - deduct;
      const newStatus = newQty === 0 ? "depleted" : "active";

      await client.query(
        `UPDATE batches 
         SET current_qty = $1, status = $2 
         WHERE id = $3`,
        [newQty, newStatus, batch.id]
      );

      deductions.push({
        batchId: batch.id,
        batchCode: batch.batch_code,
        unitsDeducted: deduct,
        remainingQty: newQty,
        expiresAt: batch.expires_at,
      });

      remainingToDeduct -= deduct;
    }

    const fulfilledUnits = unitsRequested - remainingToDeduct;
    const unfulfilledUnits = remainingToDeduct;

    // 5. Optionally log ledger outcomes
    if (shouldLog) {
      if (fulfilledUnits > 0) {
        await client.query(
          `INSERT INTO outcomes_ledger (clock_time, store_id, product_id, event_type, units, unit_price, rupee_impact, is_baseline)
           VALUES ($1, $2, $3, 'sale', $4, $5, $6, 0)`,
          [clock, storeId, productId, fulfilledUnits, unitMrp, fulfilledUnits * unitMrp]
        );
      }
      if (unfulfilledUnits > 0) {
        await client.query(
          `INSERT INTO outcomes_ledger (clock_time, store_id, product_id, event_type, units, unit_price, rupee_impact, is_baseline)
           VALUES ($1, $2, $3, 'lost_sale', $4, $5, $6, 0)`,
          [clock, storeId, productId, unfulfilledUnits, unitMrp, -(unfulfilledUnits * unitMrp)]
        );
      }
    }

    await client.query("COMMIT");

    return {
      storeId,
      productId,
      unitsRequested,
      fulfilledUnits,
      unfulfilledUnits,
      deductions,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
