/**
 * Outpost Domain & UI Types
 *
 * Implements Spec Sections 2, 3 (decisions 3, 10, 11), 5 and Phase 3 Step 3.
 * Carries real backend UUIDs.
 */

export type HubStatusType = "critical" | "warning" | "surplus" | "normal";

export interface StoreHub {
  id: string; // Store UUID
  code: string; // Store UUID
  name: string;
  locality: string;
  milkUnits: number;
  capacity: number;
  status: string;
  statusType: HubStatusType;
  nextExpiryHours: number;
  activeOrders: number;
}

export type TransferStatus = "In Transit" | "Completed" | "Staged";

export interface TransferRecord {
  id: string; // Shipment UUID
  sku: string;
  fromCode: string; // Source Store UUID
  fromName: string;
  toCode: string; // Destination Store UUID
  toName: string;
  units: number;
  vanId: string;
  eta: string;
  status: TransferStatus;
  corridor: string;
  currentStep: number; // 1 to 6
  etaPassed?: boolean;
  dispatchedAt?: string;
  batchId?: string;
}

export type AlertUrgency = "urgent" | "moderate" | "low";
export type AlertActionCategory = "TRANSFER" | "DISCOUNT" | "PO_WAIT" | "MONITOR";
export type AlertStatus =
  | "Needs Your Approval"
  | "Watching"
  | "Scheduled"
  | "Van on the Way"
  | "Rejected"
  | "Discount Active"
  | "Acknowledged";

export interface AlertItem {
  id: string; // Recommendation UUID or Risk UUID
  productName: string;
  category: string;
  storeCode: string; // Destination/Target Store UUID
  storeName: string;
  stockOnShelves?: number;
  runsOutInHours?: number;
  runsOutAtTime?: string;
  orderSpeedPerHour?: number;
  urgency: AlertUrgency;
  suggestedAction: string;
  status: AlertStatus;
  sendingStoreCode: string; // Donor/Source Store UUID
  sendingStoreName: string;
  transferQuantity: number;
  senderStartingStock?: number;
  senderLocalDemand?: number;
  simpleDescription: string;
  actionCategory: AlertActionCategory;
  recommendationId?: string;
  riskId?: string;
  alternatives?: Array<Record<string, any>>;
}

export type OutcomeStatus =
  | "Stockout prevented"
  | "Worse than expected"
  | "Residual loss"
  | "Rejected"
  | "Success";

export interface OutcomeRecordItem {
  id: string; // Outcome UUID
  exceptionTitle: string;
  storeName: string;
  productName: string;
  actionTaken: string;
  outcomeStatus: OutcomeStatus;
  expectedLostUnits: number;
  actualLostUnits: number;
  measuredVsExpected: string;
  wasteUnits: number;
  wasteValueInr: number;
  notes: string;
  evaluatedAt: string;
}

export interface HistorySummary {
  resolvedCount: number;
  stockoutsPreventedCount: number;
  totalLostSalesUnits: number;
  totalLostSalesInr: number;
  totalWasteUnits: number;
  totalWasteInr: number;
  forecastMaeUnits: number;
  forecastWapePct: number;
  records: OutcomeRecordItem[];
  disclaimer?: string;
}

export interface RunRecordData {
  run_id: string;
  simulation_id: string;
  policy: string;
  lost_sales_units: number;
  waste_units: number;
  rupee_loss: number;
  availability_pct: number;
  created_at?: string | null;
}

export interface RunRecordDeltas {
  lost_sales_units_delta: number;
  waste_units_delta: number;
  rupee_loss_delta: number;
  availability_pct_delta: number;
}

export interface ReplayComparison {
  has_runs?: boolean;
  seed?: number;
  window_hours?: number;
  deterministic_note?: string;
  rupee_price_assumption: string;
  baseline: RunRecordData | null;
  outpost: RunRecordData | null;
  deltas: RunRecordDeltas | null;
  report?: string;
}

export interface LogEvent {
  time: string;
  title: string;
  detail: string;
  type: "info" | "action" | "arrival";
}

export type DeckTab = "queue" | "inflight" | "outcomes";
