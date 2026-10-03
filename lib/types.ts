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

export interface RFCInboundOrder {
  id: string;
  storeCode: string;
  storeName: string;
  units: number;
  status: string;
  eta: string;
  sku: string;
}

export type DeckTab = "feed" | "stores" | "transfers" | "batches";

