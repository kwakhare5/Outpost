import { describe, it, expect, beforeEach } from "vitest";
import { query } from "../lib/db";
import {
  dispatchVanTransfer,
  confirmDoorstepCount,
  markVanArrived,
  getVanTransfer,
  getAllTransfers,
  VanTransferRecord,
} from "../lib/engine/transit";
import { getAvailableStock } from "../lib/engine/inventory";
import { POST } from "../app/api/transfers/[id]/confirm-doorstep/route";
import { GET as getTransfersRoute } from "../app/api/transfers/route";
import { NextRequest } from "next/server";

describe("Van Transfers & Doorstep Confirmation Engine (Task 3.1)", () => {
  const sendingStoreId = "bandra";
  const receivingStoreId = "andheri-west";
  const productId = "amul-taaza-500";
  const knownExpiry = "2026-10-27T12:00:00.000Z";

  beforeEach(async () => {
    // Clean up test transfers and test batches for isolation
    await query(`DELETE FROM outcomes_ledger WHERE product_id = $1`, [productId]);
    await query(`DELETE FROM van_transfers WHERE product_id = $1`, [productId]);
    await query(`DELETE FROM batches WHERE product_id = $1`, [productId]);

    // Seed clean known batches
    // Bandra: 112 units (Amul Milk) with explicit known expiry
    await query(
      `INSERT INTO batches (store_id, product_id, batch_code, initial_qty, current_qty, expires_at, status)
       VALUES ($1, $2, 'BAT-TEST-BANDRA-01', 112, 112, $3, 'active')`,
      [sendingStoreId, productId, knownExpiry]
    );

    // Andheri: 38 units (Amul Milk)
    await query(
      `INSERT INTO batches (store_id, product_id, batch_code, initial_qty, current_qty, expires_at, status)
       VALUES ($1, $2, 'BAT-TEST-ANDHERI-01', 38, 38, $3, 'active')`,
      [receivingStoreId, productId, knownExpiry]
    );

    // Ensure route exists
    await query(
      `INSERT INTO store_routes (from_store_id, to_store_id, travel_minutes)
       VALUES ($1, $2, 45)
       ON CONFLICT (from_store_id, to_store_id) DO UPDATE SET travel_minutes = 45`,
      [sendingStoreId, receivingStoreId]
    );
  });

  async function createStandardTransfer(qty: number = 40): Promise<VanTransferRecord> {
    return dispatchVanTransfer({
      fromStoreId: sendingStoreId,
      toStoreId: receivingStoreId,
      productId,
      quantity: qty,
      clockTime: "08:00",
      asOfTime: new Date("2026-10-25T08:00:00Z"),
    });
  }

  it("enforces conservation of mass: sending store deducted, receiving store gets zero in-transit credit", async () => {
    const initialBandraStock = await getAvailableStock(sendingStoreId, productId);
    const initialAndheriStock = await getAvailableStock(receivingStoreId, productId);

    expect(initialBandraStock).toBe(112);
    expect(initialAndheriStock).toBe(38);

    const transfer = await createStandardTransfer(40);

    expect(transfer.id).toBeDefined();
    expect(transfer.dispatchedQty).toBe(40);
    expect(transfer.status).toBe("in_transit");

    // Bandra must be deducted immediately
    const bandraStockAfter = await getAvailableStock(sendingStoreId, productId);
    expect(bandraStockAfter).toBe(72);

    // Andheri must have ZERO in-transit credit (Conservation of Mass & No Teleportation)
    const andheriStockAfter = await getAvailableStock(receivingStoreId, productId);
    expect(andheriStockAfter).toBe(38);
  });

  it("preserves source batch expiration date on received batch (Batches as Absolute Truth)", async () => {
    const transfer = await createStandardTransfer(40);
    expect(transfer.batchExpiresAt).toBeDefined();

    // Confirm doorstep count at arrival time
    await confirmDoorstepCount({
      transferId: transfer.id,
      receivedQty: 38,
      damagedQty: 2,
      clockTime: "08:45",
      asOfTime: new Date("2026-10-25T08:45:00Z"),
    });

    // Check the new batch created in Andheri
    const newBatches = await query<{ batch_code: string; expires_at: string; current_qty: number }>(
      `SELECT batch_code, expires_at, current_qty FROM batches 
       WHERE store_id = $1 AND product_id = $2 AND batch_code LIKE 'BAT-ARRIV%'`,
      [receivingStoreId, productId]
    );

    expect(newBatches.length).toBe(1);
    expect(newBatches[0].current_qty).toBe(38);
    // Preserves the source batch's exact expiration timestamp
    expect(new Date(newBatches[0].expires_at).toISOString()).toBe(new Date(knownExpiry).toISOString());
  });

  it("blocks doorstep confirmation while van is still driving mid-transit before ETA", async () => {
    const transfer = await createStandardTransfer(40);

    // Attempting to confirm at 08:20 (ETA is 08:45)
    await expect(
      confirmDoorstepCount({
        transferId: transfer.id,
        receivedQty: 38,
        damagedQty: 2,
        clockTime: "08:20",
        asOfTime: new Date("2026-10-25T08:20:00Z"),
      })
    ).rejects.toThrow(/still in transit on the road/i);
  });

  it("doorstep count credits receiving store and logs transit damage to outcomes ledger upon arrival", async () => {
    const transfer = await createStandardTransfer(40);

    // Doorstep count: 38 intact, 2 damaged at 08:45 AM
    const result = await confirmDoorstepCount({
      transferId: transfer.id,
      receivedQty: 38,
      damagedQty: 2,
      clockTime: "08:45",
      asOfTime: new Date("2026-10-25T08:45:00Z"),
    });

    expect(result.status).toBe("received");
    expect(result.receivedQty).toBe(38);
    expect(result.damagedQty).toBe(2);

    // Andheri stock now has 38 + 38 = 76 units
    const andheriStock = await getAvailableStock(receivingStoreId, productId);
    expect(andheriStock).toBe(76);

    // Outcomes ledger must log the 2 damaged units
    const damageRows = await query<{
      event_type: string;
      units: number;
      unit_price: string;
      rupee_impact: string;
    }>(
      `SELECT event_type, units, unit_price, rupee_impact 
       FROM outcomes_ledger 
       WHERE store_id = $1 AND product_id = $2 AND event_type = 'damaged_transit'`,
      [receivingStoreId, productId]
    );

    expect(damageRows.length).toBe(1);
    expect(damageRows[0].units).toBe(2);
    expect(parseFloat(damageRows[0].unit_price)).toBe(27.0);
    expect(parseFloat(damageRows[0].rupee_impact)).toBe(-54.0);
  });

  it("markVanArrived transitions van status and unlocks doorstep counting", async () => {
    const transfer = await createStandardTransfer(40);

    const arrivedTransfer = await markVanArrived(transfer.id);
    expect(arrivedTransfer.status).toBe("arrived");

    // Doorstep count succeeds immediately when marked arrived
    const result = await confirmDoorstepCount({
      transferId: transfer.id,
      receivedQty: 40,
      damagedQty: 0,
      clockTime: "08:45",
      asOfTime: new Date("2026-10-25T08:45:00Z"),
    });
    expect(result.status).toBe("received");
  });

  it("enforces sending store safety cushion on dispatch", async () => {
    // Bandra has 112 units; projected demand to 18:40 is 60 units + 20% cushion (12 units) = 72 reserve.
    // Available surplus is 112 - 72 = 40 units.
    // Attempting to dispatch 60 units exceeds the 40-unit surplus.
    await expect(
      dispatchVanTransfer({
        fromStoreId: sendingStoreId,
        toStoreId: receivingStoreId,
        productId,
        quantity: 60,
        clockTime: "08:00",
        asOfTime: new Date("2026-10-25T08:00:00Z"),
      })
    ).rejects.toThrow(/safety cushion/i);
  });

  it("fails fast if transit route is not configured between stores", async () => {
    await expect(
      dispatchVanTransfer({
        fromStoreId: "unknown-store-a",
        toStoreId: "unknown-store-b",
        productId,
        quantity: 10,
        clockTime: "08:00",
      })
    ).rejects.toThrow(/route not configured/i);
  });

  it("rejects count when sum of good and damaged units does not equal dispatched quantity", async () => {
    const transfer = await createStandardTransfer(40);
    await markVanArrived(transfer.id);

    // 35 + 2 = 37 != 40
    await expect(
      confirmDoorstepCount({
        transferId: transfer.id,
        receivedQty: 35,
        damagedQty: 2,
        asOfTime: new Date("2026-10-25T08:45:00Z"),
      })
    ).rejects.toThrow(/conservation of mass/i);
  });

  it("is idempotent: calling confirmation twice does not double-credit stock or double-log damage", async () => {
    const transfer = await createStandardTransfer(40);
    await markVanArrived(transfer.id);

    // First confirmation
    const firstResult = await confirmDoorstepCount({
      transferId: transfer.id,
      receivedQty: 38,
      damagedQty: 2,
      clockTime: "08:45",
      asOfTime: new Date("2026-10-25T08:45:00Z"),
    });

    expect(firstResult.status).toBe("received");
    const stockAfterFirst = await getAvailableStock(receivingStoreId, productId);
    expect(stockAfterFirst).toBe(76);

    // Second confirmation (e.g. associate refreshed page or double-clicked)
    const secondResult = await confirmDoorstepCount({
      transferId: transfer.id,
      receivedQty: 38,
      damagedQty: 2,
      clockTime: "08:45",
      asOfTime: new Date("2026-10-25T08:45:00Z"),
    });

    expect(secondResult.status).toBe("received");
    const stockAfterSecond = await getAvailableStock(receivingStoreId, productId);
    expect(stockAfterSecond).toBe(76);

    // Ledger damage rows must remain 1
    const damageRows = await query(
      `SELECT id FROM outcomes_ledger WHERE event_type = 'damaged_transit' AND store_id = $1`,
      [receivingStoreId]
    );
    expect(damageRows.length).toBe(1);
  });

  it("API route POST /api/transfers/[id]/confirm-doorstep confirms count idempotently", async () => {
    const transfer = await createStandardTransfer(40);
    await markVanArrived(transfer.id);

    const request = new NextRequest(
      `http://localhost:3000/api/transfers/${transfer.id}/confirm-doorstep`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receivedQty: 38,
          damagedQty: 2,
          asOfTime: "2026-10-25T08:45:00.000Z",
          clockTime: "08:45",
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ id: transfer.id }) });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.transfer.status).toBe("received");
    expect(data.transfer.receivedQty).toBe(38);
    expect(data.transfer.damagedQty).toBe(2);

    // Repeat request via API (idempotent)
    const secondRequest = new NextRequest(
      `http://localhost:3000/api/transfers/${transfer.id}/confirm-doorstep`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receivedQty: 38,
          damagedQty: 2,
          asOfTime: "2026-10-25T08:45:00.000Z",
          clockTime: "08:45",
        }),
      }
    );
    const secondResponse = await POST(secondRequest, { params: Promise.resolve({ id: transfer.id }) });
    expect(secondResponse.status).toBe(200);
    const secondData = await secondResponse.json();
    expect(secondData.success).toBe(true);
    expect(secondData.transfer.status).toBe("received");

    // Total stock is 76
    const andheriStock = await getAvailableStock(receivingStoreId, productId);
    expect(andheriStock).toBe(76);
  });

  it("API route GET /api/transfers lists transfers with human-readable store names", async () => {
    const transfer = await createStandardTransfer(40);
    const fetched = await getVanTransfer(transfer.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(transfer.id);

    const allTransfers = await getAllTransfers();
    expect(allTransfers.length).toBeGreaterThan(0);
    expect(allTransfers[0].fromStoreName).toBeDefined();

    const response = await getTransfersRoute();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.transfers).toBeDefined();
    expect(Array.isArray(body.transfers)).toBe(true);
  });
});
