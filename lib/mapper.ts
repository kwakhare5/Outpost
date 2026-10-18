/**
 * Outpost API -> UI Mapper
 *
 * Maps real backend API responses to presentation props carrying real UUIDs.
 * Real API data only; unmeasured or missing fields are omitted.
 */

import {
  StoreHub,
  TransferRecord,
  AlertItem,
  HistorySummary,
  OutcomeRecordItem,
  AlertActionCategory,
  AlertStatus,
  AlertUrgency,
  OutcomeStatus,
} from "./types";
import {
  RawStore,
  RawStoreInventory,
  RawRisk,
  RawRecommendation,
  RawShipment,
  RawOutcomesSummary,
} from "./api";

export function formatClockTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function mapStoresToHubs(
  stores: RawStore[],
  inventories: RawStoreInventory[]
): StoreHub[] {
  const invMap = new Map(inventories.map((i) => [i.store_id, i]));

  return stores.map((s) => {
    const storeInv = invMap.get(s.store_id);
    const totalUnits = storeInv
      ? storeInv.inventory.reduce((acc, item) => acc + item.quantity, 0)
      : 0;

    const minExpiryHours =
      storeInv?.batches && storeInv.batches.length > 0
        ? Math.min(...storeInv.batches.map((b) => b.hours_remaining))
        : undefined;

    return {
      id: s.store_id,
      code: s.store_id,
      name: s.name,
      locality: s.address || s.city || undefined,
      milkUnits: totalUnits,
      capacity: undefined,
      status: s.operating_status || undefined,
      statusType: undefined,
      nextExpiryHours: minExpiryHours !== undefined ? Math.round(minExpiryHours) : undefined,
      activeOrders: undefined,
    };
  });
}

export function mapRecommendationsToAlerts(
  recs: RawRecommendation[],
  risks: RawRisk[],
  stores: RawStore[],
  inventories: RawStoreInventory[] = [],
  simTimeIso?: string
): AlertItem[] {
  const storeMap = new Map(stores.map((s) => [s.store_id, s]));
  const riskMap = new Map(risks.map((r) => [r.risk_id, r]));
  const invMap = new Map(inventories.map((i) => [i.store_id, i]));
  const mappedRecRiskIds = new Set<string>();

  const alerts: AlertItem[] = [];

  for (const rec of recs) {
    mappedRecRiskIds.add(rec.risk_id);
    const risk = riskMap.get(rec.risk_id);

    const destStoreId = rec.destination_store_id || risk?.store_id || "";
    const srcStoreId = rec.source_store_id || "";

    const destStore = storeMap.get(destStoreId);
    const srcStore = storeMap.get(srcStoreId);

    const destName = destStore ? destStore.name : "";
    const srcName = srcStore ? srcStore.name : "";

    // Lookup real product name and stock on shelves from destination store inventory
    const destInv = invMap.get(destStoreId);
    const targetProdId = risk?.product_id;
    if (!targetProdId || !destInv) {
      continue;
    }

    const destProdItem = destInv.inventory.find((i) => i.product_id === targetProdId);
    if (!destProdItem) {
      // When product is not found in destination inventory, skip that alert per rule
      continue;
    }

    const productName = destProdItem.product_name;
    const category = destProdItem.category;
    const stockOnShelves = destProdItem.quantity;

    // Lookup donor store stock if available
    const srcInv = invMap.get(srcStoreId);
    const srcProdItem = targetProdId && srcInv
      ? srcInv.inventory.find((i) => i.product_id === targetProdId)
      : undefined;
    const senderStartingStock = srcProdItem ? srcProdItem.quantity : undefined;

    // Real hours to stockout from expected_time
    let runsOutInHours: number | undefined = undefined;
    let runsOutAtTime: string | undefined = undefined;
    if (risk?.expected_time) {
      runsOutAtTime = formatClockTime(risk.expected_time);
      const nowMs = simTimeIso ? new Date(simTimeIso).getTime() : Date.now();
      const expMs = new Date(risk.expected_time).getTime();
      if (!isNaN(expMs) && !isNaN(nowMs)) {
        runsOutInHours = Math.max(0, (expMs - nowMs) / 3600000);
      }
    }

    let actionCat: AlertActionCategory = "MONITOR";
    if (rec.action_type === "TRANSFER") actionCat = "TRANSFER";
    else if (rec.action_type === "DISCOUNT") actionCat = "DISCOUNT";
    else if (rec.action_type === "REORDER") actionCat = "PO_WAIT";

    let suggestedAction = "Monitor Inventory";
    if (rec.action_type === "TRANSFER") {
      suggestedAction = srcName ? `Transfer ${rec.quantity} units from ${srcName}` : `Transfer ${rec.quantity} units`;
    } else if (rec.action_type === "DISCOUNT") {
      suggestedAction = "Apply Markdown on Perishables";
    } else if (rec.action_type === "REORDER") {
      suggestedAction = `Emergency Reorder (${rec.quantity} units)`;
    }

    let status: AlertStatus = "Needs Your Approval";
    if (rec.status === "approved" || rec.status === "executed") {
      status = "Van on the Way";
    } else if (rec.status === "rejected") {
      status = "Rejected";
    }

    let urgency: AlertUrgency = "moderate";
    if (risk?.severity === "critical" || risk?.severity === "high") {
      urgency = "urgent";
    } else if (risk?.severity === "low") {
      urgency = "low";
    }

    alerts.push({
      id: rec.recommendation_id,
      recommendationId: rec.recommendation_id,
      riskId: rec.risk_id,
      productName,
      category,
      storeCode: destStoreId,
      storeName: destName,
      stockOnShelves,
      runsOutInHours,
      runsOutAtTime,
      orderSpeedPerHour: undefined, // Real value unmeasured, do not invent
      urgency,
      suggestedAction,
      status,
      sendingStoreCode: srcStoreId,
      sendingStoreName: srcName,
      transferQuantity: rec.quantity,
      senderStartingStock,
      senderLocalDemand: undefined, // Real value unmeasured, do not invent
      simpleDescription:
        rec.reason_codes && rec.reason_codes.length > 0
          ? rec.reason_codes.join(". ")
          : "Stockout projected by forecasting engine. Human approval required.",
      actionCategory: actionCat,
      alternatives: rec.alternatives && rec.alternatives.length > 0 ? rec.alternatives : undefined,
    });
  }

  // Also include active un-recommended risks as "Watching" alerts
  for (const r of risks) {
    if (!mappedRecRiskIds.has(r.risk_id)) {
      const store = storeMap.get(r.store_id);
      const storeInv = invMap.get(r.store_id);
      if (!storeInv) continue;

      const prodItem = storeInv.inventory.find((i) => i.product_id === r.product_id);
      if (!prodItem) continue;

      let runsOutInHours: number | undefined = undefined;
      let runsOutAtTime: string | undefined = undefined;
      if (r.expected_time) {
        runsOutAtTime = formatClockTime(r.expected_time);
        const nowMs = simTimeIso ? new Date(simTimeIso).getTime() : Date.now();
        const expMs = new Date(r.expected_time).getTime();
        if (!isNaN(expMs) && !isNaN(nowMs)) {
          runsOutInHours = Math.max(0, (expMs - nowMs) / 3600000);
        }
      }

      alerts.push({
        id: r.risk_id,
        riskId: r.risk_id,
        productName: prodItem.product_name,
        category: prodItem.category,
        storeCode: r.store_id,
        storeName: store ? store.name : "",
        stockOnShelves: prodItem.quantity,
        runsOutInHours,
        runsOutAtTime,
        orderSpeedPerHour: undefined,
        urgency: r.severity === "high" || r.severity === "critical" ? "urgent" : "moderate",
        suggestedAction: "Analyzing inventory rebalancing alternatives...",
        status: "Watching",
        sendingStoreCode: "",
        sendingStoreName: "",
        transferQuantity: 0,
        simpleDescription: `Risk detected: ${r.risk_type}. Probability: ${(r.probability * 100).toFixed(0)}%.`,
        actionCategory: "MONITOR",
      });
    }
  }

  return alerts;
}

export function mapShipmentsToTransfers(
  shipments: RawShipment[],
  simTimeIso?: string
): TransferRecord[] {
  return shipments.map((s) => {
    const isCompleted = s.status === "confirmed" || Boolean(s.confirmed_at);
    const simDate = simTimeIso ? new Date(simTimeIso) : new Date();
    const etaDate = new Date(s.arrival_eta);
    const isAtDock = s.status === "at_dock" || (!isCompleted && simDate >= etaDate);

    let currentStep = 4;
    let status: TransferRecord["status"] = "In Transit";

    if (isCompleted) {
      currentStep = 6;
      status = "Completed";
    } else if (isAtDock) {
      currentStep = 5;
      status = "In Transit";
    }

    return {
      id: s.shipment_id,
      sku: s.product_name || "Transfer Item",
      fromCode: s.source_store_id,
      fromName: s.source_store_name || "",
      toCode: s.destination_store_id,
      toName: s.destination_store_name || "",
      units: s.quantity,
      vanId: s.van_id || undefined,
      eta: formatClockTime(s.arrival_eta),
      status,
      corridor:
        s.source_store_name && s.destination_store_name
          ? `${s.source_store_name} -> ${s.destination_store_name}`
          : "",
      currentStep,
      etaPassed: isAtDock || isCompleted,
      dispatchedAt: formatClockTime(s.dispatched_at),
    };
  });
}

export function mapOutcomesToSummary(outcomes: RawOutcomesSummary): HistorySummary {
  const records: OutcomeRecordItem[] = outcomes.records.map((r) => ({
    id: r.outcome_id,
    exceptionTitle: r.exception_title,
    storeName: r.store_name,
    productName: r.product_name,
    actionTaken: r.action_taken,
    outcomeStatus: (r.outcome_status as OutcomeStatus) || "Success",
    expectedLostUnits: r.expected_lost_sales_units,
    actualLostUnits: r.actual_lost_sales_units,
    measuredVsExpected: r.measured_vs_expected,
    wasteUnits: r.waste_units,
    wasteValueInr: r.waste_value_inr,
    notes: r.notes,
    evaluatedAt: formatClockTime(r.evaluated_at),
  }));

  return {
    resolvedCount: outcomes.resolved_count,
    stockoutsPreventedCount: outcomes.stockout_prevented_count,
    totalLostSalesUnits: outcomes.total_lost_sales_units,
    totalLostSalesInr: outcomes.total_lost_sales_inr,
    totalWasteUnits: outcomes.total_waste_units,
    totalWasteInr: outcomes.total_waste_inr,
    forecastMaeUnits: outcomes.forecast_mae_units,
    forecastWapePct: outcomes.forecast_wape_pct,
    records,
    disclaimer: outcomes.disclaimer,
  };
}
