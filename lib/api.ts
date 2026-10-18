/**
 * Outpost Live REST API Client
 *
 * Implements Spec Sections 2, 3 (decisions 3, 10, 11), 5 and Phase 3 Step 1.
 * Connects directly to FastAPI backend (default http://localhost:8000).
 * No call returns fake success when the server failed.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export interface BackendStatus {
  online: boolean;
  service: string;
}

export interface SimulationStateResponse {
  simulation_id: string;
  status: string;
  current_time: string;
  seed: number;
  configuration: Record<string, any>;
}

export interface RawStore {
  store_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  operating_status?: string | null;
}

export interface RawStoreInventoryItem {
  product_id: string;
  product_name: string;
  category: string;
  quantity: number;
  unit: string;
}

export interface RawBatchItem {
  batch_id: string;
  product_id: string;
  quantity: number;
  received_at: string;
  expires_at: string;
  hours_remaining: number;
}

export interface RawStoreInventory {
  store_id: string;
  store_name: string;
  inventory: RawStoreInventoryItem[];
  batches: RawBatchItem[];
}

export interface RawRisk {
  risk_id: string;
  store_id: string;
  product_id: string;
  risk_type: string;
  severity: string;
  probability: number;
  expected_time: string;
  status: string;
  created_at: string;
}

export interface RawRecommendation {
  recommendation_id: string;
  risk_id: string;
  action_type: string;
  quantity: number;
  source_store_id?: string | null;
  destination_store_id?: string | null;
  score: number;
  confidence: number;
  reason_codes: string[];
  alternatives: Array<Record<string, any>>;
  status: string;
  created_at: string;
}

export interface AgentRunResponse {
  run_id: string;
  recommendation_id: string;
  status: string;
  action_type: string;
  events: Array<Record<string, any>>;
  error?: string | null;
  new_recommendation_id?: string | null;
  requires_human_review: boolean;
  started_at: string;
  finished_at: string;
}

export interface RawShipment {
  shipment_id: string;
  recommendation_id?: string | null;
  source_store_id: string;
  source_store_name: string;
  destination_store_id: string;
  destination_store_name: string;
  product_id: string;
  product_name: string;
  quantity: number;
  status: string;
  dispatched_at: string;
  arrival_eta: string;
  confirmed_at?: string | null;
  van_id: string;
  distance_km: number;
}

export interface RawReceiptConfirmation {
  confirmation_id: string;
  shipment_id: string;
  sent_units: number;
  received_units: number;
  discrepancy_units: number;
  status: string;
}

export interface RawOutcomeItem {
  outcome_id: string;
  exception_title: string;
  store_name: string;
  product_name: string;
  action_taken: string;
  outcome_status: string;
  expected_lost_sales_units: number;
  actual_lost_sales_units: number;
  measured_vs_expected: string;
  waste_units: number;
  waste_value_inr: number;
  notes: string;
  evaluated_at: string;
}

export interface RawOutcomesSummary {
  resolved_count: number;
  stockout_prevented_count: number;
  total_lost_sales_units: number;
  total_lost_sales_inr: number;
  total_waste_units: number;
  total_waste_inr: number;
  forecast_mae_units: number;
  forecast_wape_pct: number;
  records: RawOutcomeItem[];
  disclaimer: string;
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

export interface LatestRunsResponse {
  has_runs: boolean;
  seed?: number;
  window_hours?: number;
  deterministic_note?: string;
  rupee_price_assumption: string;
  baseline: RunRecordData | null;
  outpost: RunRecordData | null;
  deltas: RunRecordDeltas | null;
}

export interface ReplayResponse {
  seed: number;
  window_hours: number;
  deterministic_note: string;
  rupee_price_assumption: string;
  baseline: RunRecordData;
  outpost: RunRecordData;
  deltas: RunRecordDeltas;
  report: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Server error ${res.status}`;
    try {
      const errData = await res.json();
      if (errData?.detail) {
        errorMsg = typeof errData.detail === "string" ? errData.detail : JSON.stringify(errData.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}

export async function checkBackendHealth(): Promise<BackendStatus> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
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

export async function getActiveSimulation(): Promise<SimulationStateResponse> {
  const res = await fetch(`${BACKEND_URL}/api/simulations/active`, {
    headers: { Accept: "application/json" },
  });
  return handleResponse<SimulationStateResponse>(res);
}

export async function advanceSimulationTime(hours: number = 1, simId?: string): Promise<any> {
  let id = simId;
  if (!id) {
    const active = await getActiveSimulation();
    id = active.simulation_id;
  }
  const res = await fetch(`${BACKEND_URL}/api/simulations/${id}/advance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ hours, auto_execute: false }),
  });
  return handleResponse(res);
}

export async function applyLiveScenario(scenarioName: string, simId?: string): Promise<any> {
  let id = simId;
  if (!id) {
    const active = await getActiveSimulation();
    id = active.simulation_id;
  }
  const res = await fetch(`${BACKEND_URL}/api/simulations/${id}/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ scenario: scenarioName }),
  });
  return handleResponse(res);
}

export async function resetLiveSimulation(simId?: string): Promise<any> {
  let id = simId;
  if (!id) {
    const active = await getActiveSimulation();
    id = active.simulation_id;
  }
  const res = await fetch(`${BACKEND_URL}/api/simulations/${id}/reset`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  return handleResponse(res);
}

export async function fetchStores(): Promise<RawStore[]> {
  const res = await fetch(`${BACKEND_URL}/api/stores`, {
    headers: { Accept: "application/json" },
  });
  return handleResponse<RawStore[]>(res);
}

export async function fetchStoreInventory(storeId: string): Promise<RawStoreInventory> {
  const res = await fetch(`${BACKEND_URL}/api/stores/${storeId}/inventory`, {
    headers: { Accept: "application/json" },
  });
  return handleResponse<RawStoreInventory>(res);
}

export async function fetchRisks(storeId?: string): Promise<RawRisk[]> {
  const url = new URL(`${BACKEND_URL}/api/risks`);
  if (storeId) url.searchParams.set("store_id", storeId);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  return handleResponse<RawRisk[]>(res);
}

export async function fetchRecommendations(
  status?: string,
  storeId?: string
): Promise<RawRecommendation[]> {
  const url = new URL(`${BACKEND_URL}/api/recommendations`);
  if (status) url.searchParams.set("status", status);
  if (storeId) url.searchParams.set("store_id", storeId);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  return handleResponse<RawRecommendation[]>(res);
}

export async function approveRecommendation(id: string): Promise<any> {
  const res = await fetch(`${BACKEND_URL}/api/recommendations/${id}/approve`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  return handleResponse(res);
}

export async function rejectRecommendation(id: string): Promise<any> {
  const res = await fetch(`${BACKEND_URL}/api/recommendations/${id}/reject`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  return handleResponse(res);
}

export async function executeAgentRun(recommendationId: string): Promise<AgentRunResponse> {
  const res = await fetch(`${BACKEND_URL}/api/agent/execute/${recommendationId}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  return handleResponse<AgentRunResponse>(res);
}

/**
 * Execute real transfer flow (Phase 3 Step 1):
 * Fetch pending recommendations, approve recommendation, then execute agent run.
 */
export async function executeLiveTransfer(recommendationId?: string): Promise<AgentRunResponse> {
  let targetId = recommendationId;
  if (!targetId) {
    const pending = await fetchRecommendations("pending");
    if (!pending || pending.length === 0) {
      throw new Error("No pending recommendation found to approve and execute.");
    }
    targetId = pending[0].recommendation_id;
  }
  await approveRecommendation(targetId);
  return await executeAgentRun(targetId);
}

export async function fetchShipments(): Promise<RawShipment[]> {
  const res = await fetch(`${BACKEND_URL}/api/shipments`, {
    headers: { Accept: "application/json" },
  });
  return handleResponse<RawShipment[]>(res);
}

export async function confirmShipmentReceipt(
  shipmentId: string,
  receivedUnits: number,
  notes?: string
): Promise<RawReceiptConfirmation> {
  const res = await fetch(`${BACKEND_URL}/api/shipments/${shipmentId}/confirm-receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ received_units: receivedUnits, notes }),
  });
  return handleResponse<RawReceiptConfirmation>(res);
}

export async function fetchOutcomes(): Promise<RawOutcomesSummary> {
  const res = await fetch(`${BACKEND_URL}/api/outcomes`, {
    headers: { Accept: "application/json" },
  });
  return handleResponse<RawOutcomesSummary>(res);
}

export async function fetchLatestRuns(): Promise<LatestRunsResponse> {
  const res = await fetch(`${BACKEND_URL}/api/simulations/runs/latest`, {
    headers: { Accept: "application/json" },
  });
  return handleResponse<LatestRunsResponse>(res);
}

export async function runReplay(
  seed: number = 42,
  windowHours: number = 168,
  stepHours: number = 1,
  historicalDays: number = 7
): Promise<ReplayResponse> {
  const res = await fetch(`${BACKEND_URL}/api/simulations/replay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      seed,
      window_hours: windowHours,
      step_hours: stepHours,
      historical_days: historicalDays,
    }),
  });
  return handleResponse<ReplayResponse>(res);
}

// Aliases for compatibility
export const fetchLiveStores = fetchStores;
export const fetchHistoryOutcomes = fetchOutcomes;
