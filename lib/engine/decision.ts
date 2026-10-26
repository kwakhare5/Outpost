import { query } from "../db";
import { getTimeClock } from "./inventory";
import { parseClockHour } from "./urgency";

export interface DecisionOptions {
  hour?: number;
  fromHour?: number;
  untilHour?: number;
  asOfTime?: string | Date;
  neededQty?: number;
  incomingWarehousePo?: string;
  warehouseEta?: string;
}

export interface SafetyCushionResult {
  currentStock: number;
  projectedDemand: number;
  safetyCushionPct: number;
  safetyCushionUnits: number;
  requiredReserve: number;
  availableSurplus: number;
  canFulfill: (qty: number) => boolean;
  allowedTransferQty: (desiredQty: number) => number;
}

export interface TransferEvaluation {
  isSafe: boolean;
  requestedQty: number;
  approvedQty: number;
  sendingStoreCurrentStock: number;
  sendingStoreRemainingStock: number;
  sendingStoreRequiredReserve: number;
  sendingStoreSafetyCushionUnits: number;
  sendingStoreDeficit: number;
  action: "approve" | "scale_down" | "block";
  reason: string;
}

export interface StoreSurplusInfo {
  storeId: string;
  storeName: string;
  productId: string;
  currentStock: number;
  projectedDemand: number;
  safetyCushionPct: number;
  safetyCushionUnits: number;
  requiredReserve: number;
  availableSurplus: number;
}

export interface SendingStoreCandidate {
  storeId: string;
  storeName: string;
  travelMinutes: number;
  currentStock: number;
  projectedDemand: number;
  safetyCushionUnits: number;
  requiredReserve: number;
  availableSurplus: number;
}

export interface VanTransferRecommendation {
  type: "van_transfer";
  receivingStoreId: string;
  receivingStoreName: string;
  productId: string;
  productName: string;
  sendingStoreId: string;
  sendingStoreName: string;
  recommendedTransferQty: number;
  travelMinutes: number;
  sendingStoreSurplus: number;
  sendingStoreRequiredReserve: number;
  reason: string;
  incomingWarehousePo: string;
  warehouseEta: string;
}

export interface CartRationingRecommendation {
  type: "cart_rationing";
  receivingStoreId: string;
  receivingStoreName: string;
  productId: string;
  productName: string;
  maxCartLimit: number;
  priorityDockReceiving: boolean;
  reason: string;
  incomingWarehousePo: string;
  warehouseEta: string;
}

export type ReplenishmentRecommendation =
  | VanTransferRecommendation
  | CartRationingRecommendation;

export interface StoreNeed {
  storeId: string;
  storeName: string;
  neededQty: number;
  salesVelocityPerMinute: number;
}

export interface SplitAllocation {
  storeId: string;
  storeName: string;
  allocatedQty: number;
  salesVelocityPerMinute: number;
  priorityRank: number;
}

async function getEntityName(
  table: "stores" | "products",
  id: string
): Promise<string | null> {
  const rows = await query<{ name: string }>(
    `SELECT name FROM ${table} WHERE id = $1`,
    [id]
  );
  return rows[0]?.name ?? null;
}

/**
 * Pure calculation: computes required reserve with safety cushion and available surplus.
 */
export function calculateSafetyCushionAndSurplus(
  currentStock: number,
  projectedDemand: number,
  safetyCushionPct: number = 0.20
): SafetyCushionResult {
  const cushionPct = safetyCushionPct >= 0 ? safetyCushionPct : 0.20;
  const safetyCushionUnits = Math.round(projectedDemand * cushionPct);
  const requiredReserve = Math.ceil(projectedDemand + safetyCushionUnits);
  const availableSurplus = Math.max(0, currentStock - requiredReserve);

  return {
    currentStock,
    projectedDemand,
    safetyCushionPct: cushionPct,
    safetyCushionUnits,
    requiredReserve,
    availableSurplus,
    canFulfill: (qty: number) => qty > 0 && qty <= availableSurplus,
    allowedTransferQty: (desiredQty: number) =>
      Math.min(Math.max(0, Math.floor(desiredQty)), availableSurplus),
  };
}

/**
 * Pure calculation: evaluates whether a proposed transfer quantity violates the sending store's safety cushion.
 */
export function evaluateTransferProposal(
  currentStock: number,
  projectedDemand: number,
  safetyCushionPct: number,
  requestedQty: number,
  sendingStoreName: string = "Sending store"
): TransferEvaluation {
  if (requestedQty <= 0) {
    return {
      isSafe: false,
      requestedQty,
      approvedQty: 0,
      sendingStoreCurrentStock: currentStock,
      sendingStoreRemainingStock: currentStock,
      sendingStoreRequiredReserve: 0,
      sendingStoreSafetyCushionUnits: 0,
      sendingStoreDeficit: 0,
      action: "block",
      reason: "Requested transfer quantity must be greater than zero.",
    };
  }

  const { requiredReserve, availableSurplus, safetyCushionUnits } =
    calculateSafetyCushionAndSurplus(currentStock, projectedDemand, safetyCushionPct);

  const remaining = currentStock - requestedQty;
  const deficit = Math.max(0, requiredReserve - remaining);

  if (requestedQty <= availableSurplus) {
    return {
      isSafe: true,
      requestedQty,
      approvedQty: requestedQty,
      sendingStoreCurrentStock: currentStock,
      sendingStoreRemainingStock: remaining,
      sendingStoreRequiredReserve: requiredReserve,
      sendingStoreSafetyCushionUnits: safetyCushionUnits,
      sendingStoreDeficit: 0,
      action: "approve",
      reason: `${sendingStoreName} retains ${remaining} units, safely satisfying its projected demand (${projectedDemand}) plus 20% safety cushion (${safetyCushionUnits} units).`,
    };
  }

  if (availableSurplus > 0) {
    return {
      isSafe: false,
      requestedQty,
      approvedQty: availableSurplus,
      sendingStoreCurrentStock: currentStock,
      sendingStoreRemainingStock: remaining,
      sendingStoreRequiredReserve: requiredReserve,
      sendingStoreSafetyCushionUnits: safetyCushionUnits,
      sendingStoreDeficit: deficit,
      action: "scale_down",
      reason: `Transfer of ${requestedQty} units would breach ${sendingStoreName}'s safety cushion by ${deficit} units. Maximum safe transfer is ${availableSurplus} units.`,
    };
  }

  return {
    isSafe: false,
    requestedQty,
    approvedQty: 0,
    sendingStoreCurrentStock: currentStock,
    sendingStoreRemainingStock: remaining,
    sendingStoreRequiredReserve: requiredReserve,
    sendingStoreSafetyCushionUnits: safetyCushionUnits,
    sendingStoreDeficit: deficit,
    action: "block",
    reason: `${sendingStoreName} has no surplus stock to spare without causing a stockout.`,
  };
}

/**
 * Pure calculation: resolves multi-store simultaneous stockouts by prioritizing velocity at risk (ADR 0006).
 * Any remainder units from integer division are routed 1-by-1 to highest-velocity stores first.
 */
export function resolveSimultaneousStockouts(
  availableSurplus: number,
  candidateStores: StoreNeed[]
): SplitAllocation[] {
  if (candidateStores.length === 0 || availableSurplus <= 0) {
    return candidateStores.map((store, index) => ({
      storeId: store.storeId,
      storeName: store.storeName,
      allocatedQty: 0,
      salesVelocityPerMinute: store.salesVelocityPerMinute,
      priorityRank: index + 1,
    }));
  }

  // Sort strictly by highest sales velocity at risk first (PRD Section 3.6 Edge Case 2 & ADR 0006)
  const sorted = [...candidateStores].sort(
    (firstStore, secondStore) =>
      secondStore.salesVelocityPerMinute - firstStore.salesVelocityPerMinute
  );

  const totalNeeded = sorted.reduce(
    (sum, store) => sum + store.neededQty,
    0
  );

  if (availableSurplus >= totalNeeded) {
    return sorted.map((store, index) => ({
      storeId: store.storeId,
      storeName: store.storeName,
      allocatedQty: store.neededQty,
      salesVelocityPerMinute: store.salesVelocityPerMinute,
      priorityRank: index + 1,
    }));
  }

  // Calculate proportional integer base allocations
  const workingAllocations = sorted.map((store, index) => {
    const baseShare = Math.min(
      store.neededQty,
      Math.floor(availableSurplus * (store.neededQty / totalNeeded))
    );
    return {
      storeId: store.storeId,
      storeName: store.storeName,
      allocatedQty: baseShare,
      salesVelocityPerMinute: store.salesVelocityPerMinute,
      priorityRank: index + 1,
      neededQty: store.neededQty,
    };
  });

  let remainingUnits =
    availableSurplus -
    workingAllocations.reduce((sum, item) => sum + item.allocatedQty, 0);

  // Distribute remaining units 1-by-1 starting from rank 1 (highest velocity)
  while (remainingUnits > 0) {
    let distributedInPass = false;
    for (const alloc of workingAllocations) {
      if (remainingUnits > 0 && alloc.allocatedQty < alloc.neededQty) {
        alloc.allocatedQty += 1;
        remainingUnits -= 1;
        distributedInPass = true;
      }
    }
    if (!distributedInPass) break;
  }

  return workingAllocations.map(
    ({ neededQty: _neededQty, ...finalAllocation }) => finalAllocation
  );
}

/**
 * Calculates sending store surplus from live database rows.
 * Defaults demand to the daytime replenishment window (11:00 to 18:00) until Bhiwandi warehouse arrival.
 */
export async function getStoreSurplus(
  storeId: string,
  productId: string,
  options?: DecisionOptions
): Promise<StoreSurplusInfo | null> {
  const clock = await getTimeClock();
  const currentHour = options?.hour ?? parseClockHour(clock.currentTime);
  const fromHour = options?.fromHour ?? (currentHour < 11 ? 11 : currentHour);
  const untilHour = options?.untilHour ?? 18;
  const asOfTime = options?.asOfTime
    ? options.asOfTime instanceof Date
      ? options.asOfTime.toISOString()
      : options.asOfTime
    : `${clock.dayDate}T${clock.currentTime}:00Z`;

  const storeRows = await query<{
    id: string;
    name: string;
    safety_cushion_pct: string;
  }>(`SELECT id, name, safety_cushion_pct FROM stores WHERE id = $1`, [storeId]);

  if (storeRows.length === 0) return null;
  const store = storeRows[0];
  const safetyCushionPct = parseFloat(store.safety_cushion_pct) || 0.20;

  // Active unexpired stock from live batches table
  const batchRows = await query<{ total_stock: number }>(
    `SELECT COALESCE(SUM(current_qty), 0)::INTEGER AS total_stock
     FROM batches
     WHERE store_id = $1 AND product_id = $2 AND status = 'active' AND expires_at > $3`,
    [storeId, productId, asOfTime]
  );
  const currentStock = batchRows[0]?.total_stock ?? 0;

  // Projected demand from real_demand_curves table
  const demandRows = await query<{ projected_demand: string }>(
    `SELECT COALESCE(ROUND(SUM(units_demanded)), 0)::NUMERIC AS projected_demand
     FROM real_demand_curves
     WHERE store_id = $1 AND product_id = $2 AND hour_of_day >= $3 AND hour_of_day <= $4`,
    [storeId, productId, fromHour, untilHour]
  );
  const projectedDemand = parseFloat(demandRows[0]?.projected_demand || "0");

  const metrics = calculateSafetyCushionAndSurplus(
    currentStock,
    projectedDemand,
    safetyCushionPct
  );

  return {
    storeId: store.id,
    storeName: store.name,
    productId,
    ...metrics,
  };
}

/**
 * Evaluates candidate sending stores connected to receiving store by transit corridors.
 */
export async function findCandidateSendingStores(
  receivingStoreId: string,
  productId: string,
  options?: DecisionOptions
): Promise<SendingStoreCandidate[]> {
  const routeRows = await query<{
    from_store_id: string;
    store_name: string;
    travel_minutes: number;
    safety_cushion_pct: string;
  }>(
    `SELECT r.from_store_id, s.name AS store_name, r.travel_minutes, s.safety_cushion_pct
     FROM store_routes r
     JOIN stores s ON s.id = r.from_store_id
     WHERE r.to_store_id = $1
     ORDER BY r.travel_minutes ASC`,
    [receivingStoreId]
  );

  const candidates: SendingStoreCandidate[] = [];

  for (const route of routeRows) {
    const surplusInfo = await getStoreSurplus(
      route.from_store_id,
      productId,
      options
    );

    if (surplusInfo) {
      candidates.push({
        storeId: route.from_store_id,
        storeName: route.store_name,
        travelMinutes: route.travel_minutes,
        currentStock: surplusInfo.currentStock,
        projectedDemand: surplusInfo.projectedDemand,
        safetyCushionUnits: surplusInfo.safetyCushionUnits,
        requiredReserve: surplusInfo.requiredReserve,
        availableSurplus: surplusInfo.availableSurplus,
      });
    }
  }

  // Rank by: 1. Surplus > 0, 2. Highest surplus, 3. Shortest travel time
  return candidates.sort((firstCandidate, secondCandidate) => {
    if (
      firstCandidate.availableSurplus > 0 &&
      secondCandidate.availableSurplus === 0
    )
      return -1;
    if (
      secondCandidate.availableSurplus > 0 &&
      firstCandidate.availableSurplus === 0
    )
      return 1;
    if (
      firstCandidate.availableSurplus !== secondCandidate.availableSurplus
    ) {
      return secondCandidate.availableSurplus - firstCandidate.availableSurplus;
    }
    return firstCandidate.travelMinutes - secondCandidate.travelMinutes;
  });
}

/**
 * Generates an autonomous replenishment recommendation:
 * Returns Van Transfer if a sending store has surplus, or Cart Rationing if no store can spare stock.
 */
export async function generateReplenishmentRecommendation(
  receivingStoreId: string,
  productId: string,
  options?: DecisionOptions
): Promise<ReplenishmentRecommendation | null> {
  const receivingStoreName = await getEntityName("stores", receivingStoreId);
  if (!receivingStoreName) return null;

  const productName = await getEntityName("products", productId);
  if (!productName) return null;

  const candidates = await findCandidateSendingStores(
    receivingStoreId,
    productId,
    options
  );
  const bestSendingStore = candidates.find(
    (candidate) => candidate.availableSurplus > 0
  );

  const incomingWarehousePo = options?.incomingWarehousePo ?? "PO-4471";
  const warehouseEta = options?.warehouseEta ?? "18:40";

  if (bestSendingStore) {
    const recommendedTransferQty = options?.neededQty
      ? Math.min(options.neededQty, bestSendingStore.availableSurplus)
      : bestSendingStore.availableSurplus;

    return {
      type: "van_transfer",
      receivingStoreId,
      receivingStoreName,
      productId,
      productName,
      sendingStoreId: bestSendingStore.storeId,
      sendingStoreName: bestSendingStore.storeName,
      recommendedTransferQty,
      travelMinutes: bestSendingStore.travelMinutes,
      sendingStoreSurplus: bestSendingStore.availableSurplus,
      sendingStoreRequiredReserve: bestSendingStore.requiredReserve,
      reason: `${bestSendingStore.storeName} has ${bestSendingStore.availableSurplus} surplus units after protecting its own 20% safety cushion (${bestSendingStore.requiredReserve} units). Van arrives in ${bestSendingStore.travelMinutes} minutes to stop stockout before ${warehouseEta} warehouse delivery.`,
      incomingWarehousePo,
      warehouseEta,
    };
  }

  // Edge Case 1: When no local store has surplus stock -> switch to Cart Rationing
  return {
    type: "cart_rationing",
    receivingStoreId,
    receivingStoreName,
    productId,
    productName,
    maxCartLimit: 2,
    priorityDockReceiving: true,
    reason: `No neighboring store has surplus stock without violating safety cushions. Cart rationing limits orders to 2 units per customer to stretch inventory until incoming warehouse truck ${incomingWarehousePo} arrives at ${warehouseEta}.`,
    incomingWarehousePo,
    warehouseEta,
  };
}

/**
 * Resolves multi-store replenishment dispatch when multiple stores have stockout risk.
 */
export async function evaluateMultiStoreReplenishment(
  sendingStoreId: string,
  productId: string,
  candidateStores: StoreNeed[],
  options?: DecisionOptions
): Promise<{
  sendingStoreId: string;
  sendingStoreName: string;
  availableSurplus: number;
  allocations: SplitAllocation[];
} | null> {
  const surplusInfo = await getStoreSurplus(sendingStoreId, productId, options);
  if (!surplusInfo) return null;

  const allocations = resolveSimultaneousStockouts(
    surplusInfo.availableSurplus,
    candidateStores
  );

  return {
    sendingStoreId,
    sendingStoreName: surplusInfo.storeName,
    availableSurplus: surplusInfo.availableSurplus,
    allocations,
  };
}
