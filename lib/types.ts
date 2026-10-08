export type HubStatusType = "critical" | "warning" | "surplus" | "normal";

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

export type TransferStatus = "In Transit" | "Completed" | "Staged";

export interface TransferRecord {
  id: string;
  sku: string;
  fromCode: string;
  fromName: string;
  toCode: string;
  toName: string;
  units: number;
  vanId: string;
  eta: string;
  status: TransferStatus;
  corridor: string;
  currentStep: number; // 1 to 6
  etaPassed?: boolean;
  dispatchedAt?: string;
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
  id: string;
  productName: string;
  category: string;
  storeCode: string;
  storeName: string;
  stockOnShelves: number;
  runsOutInHours: number;
  runsOutAtTime: string;
  orderSpeedPerHour: number;
  urgency: AlertUrgency;
  suggestedAction: string;
  status: AlertStatus;
  sendingStoreCode: string;
  sendingStoreName: string;
  transferQuantity: number;
  senderStartingStock: number;
  senderLocalDemand: number;
  moneyAtRisk: number;
  moneySaved: number;
  simpleDescription: string;
  actionCategory: AlertActionCategory;
}

export type OutcomeStatus =
  | "Stockout prevented"
  | "Worse than expected"
  | "Residual loss"
  | "Rejected"
  | "Success";

export interface OutcomeRecordItem {
  id: string;
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
}

export interface LogEvent {
  time: string;
  title: string;
  detail: string;
  type: "info" | "action" | "arrival";
}

export type DeckTab = "queue" | "inflight" | "outcomes";
