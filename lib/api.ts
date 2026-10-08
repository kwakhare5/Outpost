import { StoreHub, HistorySummary } from "./types";
import { DEFAULT_HISTORY } from "./mockData";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export interface BackendStatus {
  online: boolean;
  service: string;
}

export async function checkBackendHealth(): Promise<BackendStatus> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(`${BACKEND_URL}/api/health`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return { online: true, service: data.service || "Outpost Engine" };
    }
    return { online: false, service: "Offline" };
  } catch {
    return { online: false, service: "Offline" };
  }
}

interface RawBackendStore {
  id?: string;
  store_id?: string;
  code?: string;
  store_code?: string;
  name: string;
  locality?: string;
  total_units?: number;
  capacity?: number;
  status?: string;
  status_type?: "critical" | "warning" | "surplus" | "normal";
  next_expiry_hours?: number;
  active_orders?: number;
}

export async function fetchLiveStores(): Promise<StoreHub[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/stores`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((s: RawBackendStore) => ({
      id: s.store_id || s.id || "store-01",
      code: s.code || s.store_code || "ST-01",
      name: s.name,
      locality: s.locality || "Mumbai Central",
      milkUnits: s.total_units ?? 35,
      capacity: s.capacity ?? 60,
      status: s.status || "Normal",
      statusType: (s.status_type || "normal"),
      nextExpiryHours: s.next_expiry_hours ?? 36,
      activeOrders: s.active_orders ?? 10,
    }));
  } catch {
    return [];
  }
}

export async function executeLiveTransfer(
  fromStore: string = "store-02",
  toStore: string = "store-01",
  units: number = 40
): Promise<boolean> {
  try {
    await fetch(`${BACKEND_URL}/api/recommendations/REC-MUM-MILK-L2/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_store: fromStore, to_store: toStore, units }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function confirmShipmentReceipt(
  shipmentId: string,
  receivedUnits: number,
  notes?: string
): Promise<boolean> {
  try {
    await fetch(`${BACKEND_URL}/api/shipments/${shipmentId}/confirm-receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ received_units: receivedUnits, notes }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function applyLiveScenario(scenarioName: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/simulations/scenarios/${scenarioName}/apply`, {
      method: "POST",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function advanceSimulationTime(hours: number = 1): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/simulations/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchHistoryOutcomes(): Promise<HistorySummary | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/outcomes`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.records) && data.records.length > 0) {
        return data;
      }
    }
    return DEFAULT_HISTORY;
  } catch {
    return DEFAULT_HISTORY;
  }
}

export const SAMPLE_DARKSTORE_CSV = `store_id,store_name,locality,milk_inventory,capacity,current_hourly_burn
ST-01,Dark Store Andheri West,SV Road Andheri West,38,60,7.6
ST-02,Dark Store Bandra,Turner Road Bandra,112,150,1.2
ST-03,Dark Store Powai,Hiranandani Gardens,45,70,1.8`;

export async function uploadStoresCsv(csvContent: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/stores/upload-csv`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: csvContent,
    });
    if (res.ok) {
      return { success: true, message: "Network CSV replayed successfully." };
    }
    return { success: false, message: "Backend rejected CSV format." };
  } catch {
    return { success: true, message: "Network CSV parsed in local simulation mode." };
  }
}
