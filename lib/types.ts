type HubStatusType = "critical" | "warning" | "surplus" | "normal";

export interface StoreHub {
  id: string;
  code: string;
  name: string;
  locality: string;
  milkUnits: number;
  capacity: number;
  status: string;
  statusType: HubStatusType;
  nextExpiryHours: number;
  activeOrders: number;
}

export interface TransferRecord {
  id: string;
  sku?: string;
  fromCode: string;
  fromName: string;
  toCode: string;
  toName: string;
  units: number;
  vanId: string;
  eta: string;
  status: "In Transit" | "Completed" | "Staged";
  corridor: string;
  batchId?: string;
  currentStep?: number;
  etaPassed?: boolean;
  dispatchedAt?: string;
}

export interface BatchItem {
  id: string;
  storeCode: string;
  sku: string;
  units: number;
  receivedTime: string;
  expiresInHours: number;
  fifoPriority: number;
  state: "fresh" | "expiring_soon" | "in_transit";
  transferNote?: string;
  originCode?: string;
  destCode?: string;
  vanId?: string;
}

export interface ShipmentItem {
  id: string;
  sku: string;
  source: string;
  sourceCode: string;
  dest: string;
  destCode: string;
  units: number;
  vanId: string;
  dispatchedAt: string;
  eta: string;
  etaPassed: boolean;
  status: "dispatched" | "in_transit" | "awaiting_confirmation" | "received";
  currentStep: number; // 1 to 5
  type: "TRANSFER" | "RFC_PO";
  corridor: string;
}

export interface OutcomeRecordItem {
  id: string;
  exceptionTitle: string;
  storeName: string;
  productName: string;
  actionTaken: string;
  outcomeStatus: "Stockout prevented" | "Worse than expected" | "Residual loss" | "Rejected" | "Success";
  expectedLostUnits: number;
  actualLostUnits: number;
  measuredVsExpected: string;
  wasteUnits: number;
  wasteValueInr: number;
  notes: string;
  evaluatedAt: string;
}

export interface HistorySummary {
  totalDecisions: number;
  stockoutsPrevented: number;
  moneySavedInr: number;
  accuracyRatePct: number;
  spoilageWasteInr: number;
  records: OutcomeRecordItem[];
}

export interface LogEvent {
  time: string;
  title: string;
  detail: string;
  type: "info" | "action" | "arrival";
}

export interface AlertItem {
  id: string;
  productName: string;
  category: string;
  storeCode: string;
  storeName: string;
  stockOnShelves: number;
  runsOutInHours: number;
  runsOutAtTime: string;
  orderSpeedPerHour: number;
  urgency: "urgent" | "moderate" | "low";
  suggestedAction: string;
  status: "Needs Your Approval" | "Watching" | "Scheduled" | "Van on the Way";
  sendingStoreCode: string;
  sendingStoreName: string;
  transferQuantity: number;
  senderStartingStock: number;
  senderLocalDemand: number;
  moneyAtRisk: number;
  moneySaved: number;
  simpleDescription: string;
  actionCategory?: "TRANSFER" | "DISCOUNT" | "PO_WAIT" | "MONITOR";
}

export type DeckTab = "alerts" | "deliveries" | "history" | "inventory" | "sandbox";
