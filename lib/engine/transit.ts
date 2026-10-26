import { db, query } from "../db";
import { getTimeClock, lockExpiredBatches } from "./inventory";
import { getStoreSurplus } from "./decision";
import { parseClockHour } from "./urgency";

export interface VanTransferRecord {
  id: string;
  fromStoreId: string;
  toStoreId: string;
  productId: string;
  dispatchedQty: number;
  receivedQty: number;
  damagedQty: number;
  status: "approved" | "dispatched" | "in_transit" | "arrived" | "received";
  dispatchedAt: string | null;
  expectedArrivalAt: string | null;
  receivedAt: string | null;
  batchExpiresAt: string | null;
  createdAt: string;
}

export interface DetailedVanTransferRecord extends VanTransferRecord {
  fromStoreName: string;
  toStoreName: string;
  productName: string;
  unitMrp: number;
}

export interface DispatchVanOptions {
  fromStoreId: string;
  toStoreId: string;
  productId: string;
  quantity: number;
  clockTime?: string;
  asOfTime?: string | Date;
  overrideSafetyCushion?: boolean;
}

export interface DoorstepCountOptions {
  transferId: string;
  receivedQty: number;
  damagedQty?: number;
  clockTime?: string;
  asOfTime?: string | Date;
}

export interface RawVanTransferRow {
  id: string;
  from_store_id: string;
  to_store_id: string;
  product_id: string;
  dispatched_qty: number;
  received_qty: number;
  damaged_qty: number;
  status: "approved" | "dispatched" | "in_transit" | "arrived" | "received";
  dispatched_at: string | null;
  expected_arrival_at: string | null;
  received_at: string | null;
  batch_expires_at: string | null;
  created_at: string;
}

interface RawDetailedVanTransferRow extends RawVanTransferRow {
  from_store_name: string;
  to_store_name: string;
  product_name: string;
  unit_mrp: string;
}

export function mapTransferRow(row: RawVanTransferRow): VanTransferRecord {
  return {
    id: row.id,
    fromStoreId: row.from_store_id,
    toStoreId: row.to_store_id,
    productId: row.product_id,
    dispatchedQty: row.dispatched_qty,
    receivedQty: row.received_qty,
    damagedQty: row.damaged_qty,
    status: row.status,
    dispatchedAt: row.dispatched_at,
    expectedArrivalAt: row.expected_arrival_at,
    receivedAt: row.received_at,
    batchExpiresAt: row.batch_expires_at,
    createdAt: row.created_at,
  };
}

function mapDetailedTransferRow(row: RawDetailedVanTransferRow): DetailedVanTransferRecord {
  return {
    ...mapTransferRow(row),
    fromStoreName: row.from_store_name,
    toStoreName: row.to_store_name,
    productName: row.product_name,
    unitMrp: parseFloat(row.unit_mrp),
  };
}

function normalizeDate(time?: string | Date): Date {
  if (!time) return new Date();
  return time instanceof Date ? time : new Date(time);
}

/**
 * Dispatches a Van Transfer from a sending store to a receiving store.
 * - Enforces sending store safety cushion unless explicitly overridden.
 * - Fails fast if Mumbai route travel time is missing.
 * - Immediately deducts stock from sending store batches using Oldest-First.
 * - Captures true batch expiration timestamp to preserve Batches as Absolute Truth.
 * - Gives ZERO in-transit stock to the receiving store (Conservation of Mass & No Teleportation).
 */
export async function dispatchVanTransfer(options: DispatchVanOptions): Promise<VanTransferRecord> {
  const { fromStoreId, toStoreId, productId, quantity, overrideSafetyCushion = false } = options;

  if (quantity <= 0) {
    throw new Error("Dispatched quantity must be greater than zero");
  }

  if (fromStoreId === toStoreId) {
    throw new Error("Sending store and receiving store cannot be the same");
  }

  const asOf = normalizeDate(options.asOfTime);
  const clock = options.clockTime || (await getTimeClock()).currentTime;

  // 1. Get travel minutes for this Mumbai transit corridor (fail fast if route not configured)
  const routeRows = await query<{ travel_minutes: number }>(
    `SELECT travel_minutes FROM store_routes WHERE from_store_id = $1 AND to_store_id = $2`,
    [fromStoreId, toStoreId]
  );
  if (routeRows.length === 0) {
    throw new Error(`Transit route not configured between sending store ${fromStoreId} and receiving store ${toStoreId}`);
  }
  const travelMinutes = routeRows[0].travel_minutes;
  const expectedArrival = new Date(asOf.getTime() + travelMinutes * 60 * 1000);

  // 2. Enforce Sending Store Safety Cushion
  if (!overrideSafetyCushion) {
    const surplus = await getStoreSurplus(fromStoreId, productId, {
      hour: parseClockHour(clock),
      asOfTime: asOf,
    });
    if (!surplus) {
      throw new Error(`Sending store ${fromStoreId} or product ${productId} not found for surplus evaluation`);
    }
    if (quantity > surplus.availableSurplus) {
      throw new Error(
        `Dispatch blocked: sending store ${fromStoreId} requires a safety cushion. Available surplus: ${surplus.availableSurplus}, requested: ${quantity}`
      );
    }
  }

  // 3. Lock expired stock before touching inventory
  await lockExpiredBatches(asOf, clock);

  // 4. Connect client for atomic deduction and transfer creation
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Fetch active batches from sending store with row-level locks
    const batchRows = await client.query<{
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
       ORDER BY expires_at ASC, id ASC
       FOR UPDATE`,
      [fromStoreId, productId, asOf.toISOString()]
    );

    const availableTotal = batchRows.rows.reduce((sum, b) => sum + b.current_qty, 0);
    if (availableTotal < quantity) {
      throw new Error(
        `Insufficient stock at sending store ${fromStoreId}: requested ${quantity}, available ${availableTotal}`
      );
    }

    // Deduct quantity using Oldest-First and capture source batch expiration
    let remainingToDeduct = quantity;
    let preservedExpiresAt: string | null = null;

    for (const batch of batchRows.rows) {
      if (remainingToDeduct <= 0) break;
      if (!preservedExpiresAt) {
        preservedExpiresAt = batch.expires_at;
      }
      const deduct = Math.min(remainingToDeduct, batch.current_qty);
      const newQty = batch.current_qty - deduct;
      const newStatus = newQty === 0 ? "depleted" : "active";

      await client.query(
        `UPDATE batches SET current_qty = $1, status = $2 WHERE id = $3`,
        [newQty, newStatus, batch.id]
      );

      remainingToDeduct -= deduct;
    }

    // Insert into van_transfers with status 'in_transit' and preserved batch expiration
    const transferResult = await client.query<RawVanTransferRow>(
      `INSERT INTO van_transfers (
         from_store_id, to_store_id, product_id,
         dispatched_qty, received_qty, damaged_qty,
         status, dispatched_at, expected_arrival_at,
         batch_expires_at
       )
       VALUES ($1, $2, $3, $4, 0, 0, 'in_transit', $5, $6, $7)
       RETURNING *`,
      [
        fromStoreId,
        toStoreId,
        productId,
        quantity,
        asOf.toISOString(),
        expectedArrival.toISOString(),
        preservedExpiresAt,
      ]
    );

    await client.query("COMMIT");
    return mapTransferRow(transferResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Confirms Doorstep Count when the van reaches the receiving dark store shutter door.
 * - Asserts the van has arrived (status === 'arrived' or transit time has elapsed).
 * - Enforces conservation of mass: receivedQty + damagedQty === dispatchedQty.
 * - Carries over the source batch's true expiration timestamp (Batches as Absolute Truth).
 * - Logs leaking/broken units directly to outcomes_ledger as 'damaged_transit' (Damaged on the Road).
 * - Completely idempotent: duplicate calls do not double-credit stock or double-log damage.
 */
export async function confirmDoorstepCount(options: DoorstepCountOptions): Promise<VanTransferRecord> {
  const { transferId, receivedQty } = options;
  const asOf = normalizeDate(options.asOfTime);
  const clock = options.clockTime || (await getTimeClock()).currentTime;

  // 1. Connect client for atomic transactional verification & commit
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Fetch transfer with row-level lock
    const lockedTransferRows = await client.query<RawVanTransferRow>(
      `SELECT * FROM van_transfers WHERE id = $1 FOR UPDATE`,
      [transferId]
    );

    if (lockedTransferRows.rows.length === 0) {
      throw new Error(`Van transfer not found: ${transferId}`);
    }

    const transfer = lockedTransferRows.rows[0];

    // Idempotency Gate: if already received, return without modifying state
    if (transfer.status === "received") {
      await client.query("COMMIT");
      return mapTransferRow(transfer);
    }

    // 2. Van Arrival Gate: Ensure van has arrived before allowing doorstep count
    const isArrivedStatus = transfer.status === "arrived";
    const expectedArrivalMs = transfer.expected_arrival_at ? new Date(transfer.expected_arrival_at).getTime() : 0;
    const isArrivalTimeReached = asOf.getTime() >= expectedArrivalMs;

    if (!isArrivedStatus && !isArrivalTimeReached) {
      throw new Error(
        `Van is still in transit on the road; doorstep count cannot be confirmed before arrival (ETA: ${transfer.expected_arrival_at})`
      );
    }

    // 3. Resolve damaged quantity and validate conservation of mass
    const damagedQty = options.damagedQty !== undefined
      ? options.damagedQty
      : transfer.dispatched_qty - receivedQty;

    if (receivedQty < 0 || damagedQty < 0) {
      throw new Error("Received quantity and damaged quantity cannot be negative");
    }

    if (receivedQty + damagedQty !== transfer.dispatched_qty) {
      throw new Error(
        `Conservation of Mass violation: received quantity (${receivedQty}) + damaged quantity (${damagedQty}) must equal dispatched quantity (${transfer.dispatched_qty})`
      );
    }

    // 4. Fetch product MRP for honest damage ledger entry
    const productRows = await client.query<{ unit_mrp: string }>(
      `SELECT unit_mrp FROM products WHERE id = $1`,
      [transfer.product_id]
    );
    if (productRows.rows.length === 0) {
      throw new Error(`Product not found: ${transfer.product_id}`);
    }
    const unitMrp = parseFloat(productRows.rows[0].unit_mrp);

    // 5. Batches as Absolute Truth: carry over source batch expiration
    const batchExpiresAt = transfer.batch_expires_at || new Date(asOf.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

    // A. Credit received stock into a new active batch at the receiving dark store
    if (receivedQty > 0) {
      const batchCode = `BAT-ARRIV-${transfer.product_id.toUpperCase().slice(0, 4)}-${Date.now().toString().slice(-6)}`;
      await client.query(
        `INSERT INTO batches (store_id, product_id, batch_code, initial_qty, current_qty, expires_at, status)
         VALUES ($1, $2, $3, $4, $4, $5, 'active')`,
        [
          transfer.to_store_id,
          transfer.product_id,
          batchCode,
          receivedQty,
          batchExpiresAt,
        ]
      );
    }

    // B. Log damaged units directly to outcomes_ledger
    if (damagedQty > 0) {
      const rupeeImpact = -(damagedQty * unitMrp);
      await client.query(
        `INSERT INTO outcomes_ledger (clock_time, store_id, product_id, event_type, units, unit_price, rupee_impact, is_baseline)
         VALUES ($1, $2, $3, 'damaged_transit', $4, $5, $6, 0)`,
        [clock, transfer.to_store_id, transfer.product_id, damagedQty, unitMrp, rupeeImpact]
      );
    }

    // C. Update transfer record status to 'received'
    const updatedTransferResult = await client.query<RawVanTransferRow>(
      `UPDATE van_transfers
       SET received_qty = $1, damaged_qty = $2, status = 'received', received_at = $3
       WHERE id = $4
       RETURNING *`,
      [receivedQty, damagedQty, asOf.toISOString(), transferId]
    );

    await client.query("COMMIT");
    return mapTransferRow(updatedTransferResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Returns a van transfer by its UUID.
 */
export async function getVanTransfer(transferId: string): Promise<VanTransferRecord | null> {
  const rows = await query<RawVanTransferRow>(
    `SELECT * FROM van_transfers WHERE id = $1`,
    [transferId]
  );
  if (rows.length === 0) return null;
  return mapTransferRow(rows[0]);
}

/**
 * Marks a van transfer as arrived at the dark store door (unlocks doorstep counting).
 */
export async function markVanArrived(transferId: string): Promise<VanTransferRecord> {
  const rows = await query<RawVanTransferRow>(
    `UPDATE van_transfers SET status = 'arrived' WHERE id = $1 AND status = 'in_transit' RETURNING *`,
    [transferId]
  );
  if (rows.length === 0) {
    const existing = await getVanTransfer(transferId);
    if (!existing) throw new Error(`Van transfer not found: ${transferId}`);
    return existing;
  }
  return mapTransferRow(rows[0]);
}

/**
 * Automatically transitions in-transit vans to 'arrived' if their expected arrival timestamp
 * has elapsed relative to the target time.
 */
export async function updateArrivedTransfers(asOfTime: string | Date): Promise<VanTransferRecord[]> {
  const timestamp = normalizeDate(asOfTime).toISOString();
  const rows = await query<RawVanTransferRow>(
    `UPDATE van_transfers
     SET status = 'arrived'
     WHERE status = 'in_transit'
       AND expected_arrival_at <= $1
     RETURNING *`,
    [timestamp]
  );
  return rows.map(mapTransferRow);
}

/**
 * Returns all van transfers with human-readable store and product names.
 */
export async function getAllTransfers(): Promise<DetailedVanTransferRecord[]> {
  const rows = await query<RawDetailedVanTransferRow>(
    `SELECT t.*, 
            sf.name as from_store_name, 
            st.name as to_store_name,
            p.name as product_name,
            p.unit_mrp
     FROM van_transfers t
     JOIN stores sf ON t.from_store_id = sf.id
     JOIN stores st ON t.to_store_id = st.id
     JOIN products p ON t.product_id = p.id
     ORDER BY t.created_at DESC`
  );
  return rows.map(mapDetailedTransferRow);
}
