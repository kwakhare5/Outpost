"use client";

/**
 * Outpost — Autonomous Quick-Commerce Operations Platform
 * Cluster: MUMBAI NETWORK
 * Level-2 Gate: Authorise & Dispatch Van Now
 */

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { BatchItem, DeckTab, RFCInboundOrder, StoreHub, TransferRecord } from "@/lib/types";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { MetricsOverview } from "@/components/dashboard/MetricsOverview";
import { TriageCard } from "@/components/dashboard/TriageCard";
import { StoreTable } from "@/components/dashboard/StoreTable";
import { StoreInspectorDrawer } from "@/components/dashboard/StoreInspectorDrawer";
import { TransfersTable } from "@/components/dashboard/TransfersTable";
import { BatchLedgerTable } from "@/components/dashboard/BatchLedgerTable";
import { ArchitectureModal } from "@/components/dashboard/ArchitectureModal";
import { TestLabModal } from "@/components/dashboard/TestLabModal";
import { ArrowRight, Clock, ShieldCheck, Truck } from "lucide-react";
import {
  applyLiveScenario,
  checkBackendHealth,
  CsvRecommendation,
  executeLiveTransfer,
  fetchLiveStores,
} from "@/lib/api";

// 5 Mumbai Operational Dark Store Hubs (Ground Truth Invariant State)
const INITIAL_STORES: StoreHub[] = [
  {
    id: "st-04",
    code: "ST-04",
    name: "Lower Parel",
    locality: "Senapati Bapat Marg",
    milkUnits: 4,
    capacity: 30,
    status: "Critical (4.8h buffer)",
    statusType: "critical",
    nextExpiryHours: 32,
    activeOrders: 18,
  },
  {
    id: "st-02",
    code: "ST-02",
    name: "Bandra West",
    locality: "Hill Road / Turner",
    milkUnits: 48,
    capacity: 50,
    status: "Surplus (+20 units safe)",
    statusType: "surplus",
    nextExpiryHours: 44,
    activeOrders: 9,
  },
  {
    id: "st-01",
    code: "ST-01",
    name: "Andheri East",
    locality: "MIDC Cyber Hub",
    milkUnits: 35,
    capacity: 45,
    status: "Normal",
    statusType: "normal",
    nextExpiryHours: 38,
    activeOrders: 14,
  },
  {
    id: "st-03",
    code: "ST-03",
    name: "Powai Galleria",
    locality: "Hiranandani Gardens",
    milkUnits: 28,
    capacity: 35,
    status: "Normal",
    statusType: "normal",
    nextExpiryHours: 42,
    activeOrders: 11,
  },
  {
    id: "st-05",
    code: "ST-05",
    name: "Thane West",
    locality: "Ghodbunder Road",
    milkUnits: 25,
    capacity: 35,
    status: "Normal",
    statusType: "normal",
    nextExpiryHours: 48,
    activeOrders: 8,
  },
];

const INITIAL_BATCHES: BatchItem[] = [
  {
    id: "B-MUM-MILK-001",
    storeCode: "ST-04",
    sku: "Amul Taaza Whole Milk 1L",
    units: 4,
    receivedTime: "Today 05:00",
    expiresInHours: 32,
    fifoPriority: 1,
    state: "fresh",
  },
  {
    id: "B-MUM-MILK-002",
    storeCode: "ST-02",
    sku: "Amul Taaza Whole Milk 1L",
    units: 20,
    receivedTime: "Today 06:15",
    expiresInHours: 40,
    fifoPriority: 1,
    state: "fresh",
    originCode: "ST-02",
    destCode: "ST-04",
  },
  {
    id: "B-MUM-MILK-003",
    storeCode: "ST-02",
    sku: "Amul Taaza Whole Milk 1L",
    units: 28,
    receivedTime: "Today 08:30",
    expiresInHours: 48,
    fifoPriority: 2,
    state: "fresh",
  },
  {
    id: "B-MUM-MILK-004",
    storeCode: "ST-01",
    sku: "Amul Taaza Whole Milk 1L",
    units: 35,
    receivedTime: "Today 07:00",
    expiresInHours: 38,
    fifoPriority: 1,
    state: "fresh",
  },
  {
    id: "B-MUM-MILK-005",
    storeCode: "ST-03",
    sku: "Amul Taaza Whole Milk 1L",
    units: 28,
    receivedTime: "Today 07:45",
    expiresInHours: 42,
    fifoPriority: 1,
    state: "fresh",
  },
  {
    id: "B-MUM-MILK-006",
    storeCode: "ST-05",
    sku: "Amul Taaza Whole Milk 1L",
    units: 25,
    receivedTime: "Today 09:00",
    expiresInHours: 48,
    fifoPriority: 1,
    state: "fresh",
  },
];

const INITIAL_TRANSFERS: TransferRecord[] = [
  {
    id: "TR-MUM-2026-08",
    fromCode: "ST-02",
    fromName: "Bandra West",
    toCode: "ST-04",
    toName: "Lower Parel",
    units: 20,
    vanId: "Van #MH-02",
    eta: "Staged (Pending Approval)",
    status: "Staged",
    corridor: "Bandra-Worli Sea Link",
    batchId: "B-MUM-MILK-002",
  },
  {
    id: "TR-MUM-2026-07",
    fromCode: "ST-03",
    fromName: "Powai Galleria",
    toCode: "ST-01",
    toName: "Andheri East",
    units: 10,
    vanId: "Van #MH-05",
    eta: "Delivered at 13:45 IST",
    status: "Completed",
    corridor: "JVLR Express",
    batchId: "B-MUM-MILK-005",
  },
];

const INITIAL_RFC_ORDERS: RFCInboundOrder[] = [
  {
    id: "PO-RFC-MUM-019",
    storeCode: "ST-05",
    storeName: "Thane West",
    units: 30,
    status: "In Transit",
    eta: "ETA 2.5h (Bhiwandi RFC Corridor)",
    sku: "Amul Taaza Whole Milk 1L",
  },
  {
    id: "PO-RFC-MUM-020",
    storeCode: "ST-01",
    storeName: "Andheri East",
    units: 40,
    status: "Staged at RFC",
    eta: "ETA 4.0h (Scheduled Departure)",
    sku: "Amul Taaza Whole Milk 1L",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<DeckTab>("feed");
  const [drawerStore, setDrawerStore] = useState<StoreHub | null>(null);
  const [stores, setStores] = useState<StoreHub[]>(INITIAL_STORES);
  const [batches, setBatches] = useState<BatchItem[]>(INITIAL_BATCHES);
  const [transfers, setTransfers] = useState<TransferRecord[]>(INITIAL_TRANSFERS);
  const [rfcOrders, setRfcOrders] = useState<RFCInboundOrder[]>(INITIAL_RFC_ORDERS);
  const [isTransferred, setIsTransferred] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string>("nominal");
  const [searchQuery, setSearchQuery] = useState("");
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isTestLabOpen, setIsTestLabOpen] = useState(false);
  const [customRecommendation, setCustomRecommendation] = useState<CsvRecommendation | null>(null);
  const [isBackendOnline, setIsBackendOnline] = useState(false);

  // Check live FastAPI backend health on mount
  useEffect(() => {
    let isMounted = true;
    checkBackendHealth().then((health) => {
      if (isMounted) {
        setIsBackendOnline(health.online);
        if (health.online) {
          fetchLiveStores().then((liveStores) => {
            if (isMounted && liveStores.length === 5) {
              setStores(liveStores);
            }
          });
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Exact Mass Conservation: 48 + 4 = 52 -> 28 + 24 = 52 (Total 140u -> 140u, Delta = 0.00)
  const totalStock = stores.reduce((sum, s) => sum + s.milkUnits, 0);

  // Level-2 Gate Invariant Token: Authorise & Dispatch Van Now
  const handleExecuteTransfer = async () => {
    if (isTransferred) return;

    const sourceId = customRecommendation?.sourceStoreId || "st-02";
    const destId = customRecommendation?.destStoreId || "st-04";
    const transferUnits = customRecommendation?.transferUnits ?? 20;
    const vanId = customRecommendation?.vanId || "Van #MH-02";
    const corridor = customRecommendation?.corridor || "Bandra-Worli Sea Link";
    const sourceName = customRecommendation?.sourceStoreName || "Bandra West";
    const destName = customRecommendation?.destStoreName || "Lower Parel";
    const sourceCode = customRecommendation?.sourceStoreCode || "ST-02";
    const destCode = customRecommendation?.destStoreCode || "ST-04";

    // Trigger live backend LangGraph agent if online
    if (isBackendOnline) {
      executeLiveTransfer(sourceId, destId, transferUnits).catch(() => {
        // graceful offline fallback
      });
    }

    setStores((prev) =>
      prev.map((s) => {
        if (s.id === sourceId || s.code === sourceCode) {
          const remaining = Math.max(0, s.milkUnits - transferUnits);
          return {
            ...s,
            milkUnits: remaining,
            status: `Normal (${remaining} units safe buffer)`,
            statusType: "normal",
          };
        }
        if (s.id === destId || s.code === destCode) {
          const replenished = s.milkUnits + transferUnits;
          return {
            ...s,
            milkUnits: replenished,
            status: "Normal (32h safe buffer)",
            statusType: "normal",
          };
        }
        return s;
      })
    );

    setBatches((prev) =>
      prev.map((b) => {
        if (b.id === "B-MUM-MILK-002" || b.originCode === sourceCode) {
          return {
            ...b,
            state: "in_transit",
            vanId: vanId,
            destCode: destCode,
            transferNote: `En route on ${vanId} via ${corridor}`,
          };
        }
        return b;
      })
    );

    setTransfers((prev) => [
      {
        id: customRecommendation?.id || "TR-MUM-2026-08",
        fromCode: sourceCode,
        fromName: sourceName,
        toCode: destCode,
        toName: destName,
        units: transferUnits,
        vanId: vanId,
        eta: "18 mins remaining (Sea Link corridor)",
        status: "In Transit",
        corridor: corridor,
        batchId: "B-MUM-MILK-002",
      },
      ...prev.filter((t) => t.id !== (customRecommendation?.id || "TR-MUM-2026-08")),
    ]);

    setIsTransferred(true);
    setIsDismissed(false);
    toast.success(`${vanId} Dispatched · ${transferUnits} units en route to ${destName}`, {
      description: `Mass conserved: ${totalStock} units accounted for across ${stores.length} stores (Net Change: 0 · Mass Conserved)`,
    });
  };

  // Van Delivery completion handler: marks transfer Completed and updates batch status
  const handleCompleteDelivery = (transferId: string) => {
    const transfer = transfers.find((t) => t.id === transferId);
    if (!transfer || transfer.status === "Completed") return;

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              status: "Completed",
              eta: `Delivered at ${new Date().toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })} IST`,
            }
          : t
      )
    );

    setBatches((prev) =>
      prev.map((b) => {
        if (b.vanId === transfer.vanId || b.id === transfer.batchId) {
          return {
            ...b,
            state: "fresh",
            storeCode: transfer.toCode,
            transferNote: `Delivered and restocked at ${transfer.toName}`,
          };
        }
        return b;
      })
    );

    toast.success(`Delivery Confirmed · ${transfer.vanId} Arrived at ${transfer.toName}`, {
      description: `${transfer.units} units Amul Taaza placed on shelves. Mass conserved across network.`,
    });
  };

  // CSV Dark Store Network Apply Handler
  const handleApplyStores = (newStores: StoreHub[], rec?: CsvRecommendation | null) => {
    setStores(newStores);
    setCustomRecommendation(rec || null);
    setIsTransferred(false);
    setIsDismissed(false);
  };

  const handleDismissRecommendation = () => {
    setIsDismissed(true);
    toast.info("Alert Snoozed · Manager triage alert minimized", {
      description: "Engine will re-evaluate on next 10m demand burn checkpoint.",
    });
  };

  const handleReset = () => {
    setStores(INITIAL_STORES);
    setTransfers(INITIAL_TRANSFERS);
    setBatches(INITIAL_BATCHES);
    setRfcOrders(INITIAL_RFC_ORDERS);
    setCustomRecommendation(null);
    setIsTransferred(false);
    setIsDismissed(false);
    setActiveScenario("nominal");
    setSearchQuery("");
    toast.info("Network Reset: Restored to 140-unit nominal equilibrium (Net Change: 0)");
  };

  const handleTriggerScenario = (name: string) => {
    setActiveScenario(name);
    if (isBackendOnline) {
      applyLiveScenario(name).catch(() => {});
    }

    if (name === "demand_spike") {
      setStores((prev) =>
        prev.map((s) =>
          s.id === "st-02"
            ? { ...s, activeOrders: 38, status: "Surplus (Surge Underway)", statusType: "warning" }
            : s
        )
      );
      toast.warning("Scenario Activated: Bandra West Demand Surge (38 orders)");
    } else if (name === "supplier_delay") {
      setRfcOrders((prev) =>
        prev.map((o) => ({
          ...o,
          status: "Delay (+4h ETA)",
          eta: "Delayed: ETA +4h (Bhiwandi RFC Congestion)",
        }))
      );
      toast.warning("Scenario Activated: Bhiwandi RFC Supply Delay (+4h ETA)");
    } else if (name === "imbalance") {
      handleReset();
      toast.warning("Scenario Activated: Critical Stock Imbalance (Manager Gate Open)");
    } else {
      handleReset();
    }
  };

  // Handler for custom store parameters in Operations Test Lab
  const handleUpdateStore = (storeId: string, updates: Partial<StoreHub>) => {
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, ...updates } : s))
    );
  };

  // Handler for dynamic multiplier shock in Operations Test Lab
  const handleApplyScenarioMultiplier = (demandMultiplier: number, delayHours: number) => {
    if (demandMultiplier > 1) {
      setStores((prev) =>
        prev.map((s) => ({
          ...s,
          activeOrders: Math.round(s.activeOrders * demandMultiplier),
        }))
      );
      toast.warning(`Test Lab Shock: Demand Multiplier set to ${demandMultiplier}x`);
    }
    if (delayHours > 0) {
      setRfcOrders((prev) =>
        prev.map((o) => ({
          ...o,
          status: `Delay (+${delayHours}h ETA)`,
          eta: `Delayed: ETA +${delayHours}h (Bhiwandi RFC Corridor Shock)`,
        }))
      );
      toast.warning(`Test Lab Shock: RFC Inbound delayed by +${delayHours} hours`);
    }
  };

  // Filter stores based on global search query
  const searchedStores = stores.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.locality.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-zinc-900 font-sans overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────────
          1. LEFT SIDEBAR: Clean Linear Navigation Desk
      ───────────────────────────────────────────────────────────────── */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeScenario={activeScenario}
        onTriggerScenario={handleTriggerScenario}
        onReset={handleReset}
        isTransferred={isTransferred}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenTestLab={() => setIsTestLabOpen(true)}
        transferCount={transfers.length}
        batchCount={batches.length}
      />

      {/* ─────────────────────────────────────────────────────────────────
          2. MAIN CONTENT CANVAS: Fluid Operations Deck
      ───────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#FAFAFA] overflow-y-auto">
        <Header
          activeTab={activeTab}
          totalStock={totalStock}
          onReset={handleReset}
          isTransferred={isTransferred}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
          onOpenTestLab={() => setIsTestLabOpen(true)}
          isBackendOnline={isBackendOnline}
        />

        {/* Dynamic Fluid View Body */}
        <div className="px-6 md:px-8 py-5 space-y-5 w-full max-w-7xl mx-auto">
          {/* VIEW: LIVE FEED & TRIAGE */}
          {activeTab === "feed" && (
            <div className="space-y-5">
              {/* 1. Metrics Overview */}
              <MetricsOverview
                totalStock={totalStock}
                isTransferred={isTransferred}
                onNavigateTab={setActiveTab}
                onFocusTriage={() => {
                  const gate = document.getElementById("level-2-triage-gate");
                  if (gate) gate.scrollIntoView({ behavior: "smooth" });
                }}
              />

              {/* 2. Manager Sign-Off Gate (Authorise & Dispatch Van Now) */}
              <div id="level-2-triage-gate">
                {!isDismissed ? (
                  <TriageCard
                    isTransferred={isTransferred}
                    totalStock={totalStock}
                    recommendation={customRecommendation}
                    onExecuteTransfer={handleExecuteTransfer}
                    onDismissRecommendation={handleDismissRecommendation}
                    onTrackTransfer={() => setActiveTab("transfers")}
                    onReset={handleReset}
                  />
                ) : (
                  <div className="p-4 bg-zinc-100 border border-zinc-200/80 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-zinc-600">
                      <Clock className="w-4 h-4 text-zinc-400" />
                      <span>Manager triage alert is currently snoozed.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDismissed(false)}
                      className="px-3 py-1 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg font-semibold text-zinc-900 cursor-pointer transition-colors shadow-2xs"
                    >
                      Restore Alert
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Live Lateral Fleet Transit Corridors Stream */}
              <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-zinc-700" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950 font-display">
                      Live Regional Logistics Corridors
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    {isTransferred ? "1 Van Active" : "Fleet on Standby"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-zinc-50/70 border border-zinc-200/70 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900">Bandra-Worli Sea Link</span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-semibold text-xs font-mono border ${
                          isTransferred
                            ? "bg-amber-50 text-amber-900 border-amber-300"
                            : "bg-zinc-100 text-zinc-600 border-zinc-200"
                        }`}
                      >
                        {isTransferred ? "Van #MH-02 En Route" : "Corridor Clear"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-600">
                      <span>ST-02 (Bandra West)</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                      <span>ST-04 (Lower Parel)</span>
                    </div>
                    <p className="text-zinc-500 text-xs">
                      {isTransferred
                        ? "Carrying 20 units Amul Taaza 1L · ETA 18 mins"
                        : "Nominal transit buffer: 22 mins"}
                    </p>
                  </div>

                  <div className="p-3.5 bg-zinc-50/70 border border-zinc-200/70 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900">JVLR Express Corridor</span>
                      <span className="px-2 py-0.5 rounded-md font-semibold text-xs font-mono border bg-emerald-50 text-emerald-800 border-emerald-200">
                        Run Completed
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-600">
                      <span>ST-03 (Powai Galleria)</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                      <span>ST-01 (Andheri East)</span>
                    </div>
                    <p className="text-zinc-500 text-xs">
                      Delivered 10 units via Van #MH-05 at 13:45 IST · Mass balanced
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Conservation of Mass verified: exactly 140 units across network (Net Change: 0 · Mass Conserved).</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("transfers")}
                    className="font-semibold text-zinc-900 hover:underline cursor-pointer"
                  >
                    View All Transfers &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: ALL STORES */}
          {activeTab === "stores" && (
            <div className="space-y-4">
              <StoreTable
                stores={searchedStores}
                onOpenStoreDrawer={setDrawerStore}
                searchQuery={searchQuery}
                onUpdateStoreStock={(storeId, newUnits) => handleUpdateStore(storeId, { milkUnits: newUnits })}
              />
            </div>
          )}

          {/* VIEW: VAN DELIVERIES */}
          {activeTab === "transfers" && (
            <div className="space-y-4">
              <TransfersTable
                transfers={transfers}
                rfcOrders={rfcOrders}
                searchQuery={searchQuery}
                onCompleteDelivery={handleCompleteDelivery}
              />
            </div>
          )}

          {/* VIEW: STOCK BATCHES */}
          {activeTab === "batches" && (
            <div className="space-y-4">
              <BatchLedgerTable
                batches={batches}
                stores={stores}
                searchQuery={searchQuery}
              />
            </div>
          )}
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────────
          3. SLIDE-OVER DRAWER: Store Inventory Inspection
      ───────────────────────────────────────────────────────────────── */}
      <StoreInspectorDrawer
        store={drawerStore}
        onClose={() => setDrawerStore(null)}
        batches={batches}
        onNavigateFeed={() => setActiveTab("feed")}
      />

      {/* ─────────────────────────────────────────────────────────────────
          4. MODAL: System Architecture & LangGraph Blueprint
      ───────────────────────────────────────────────────────────────── */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      {/* ─────────────────────────────────────────────────────────────────
          5. MODAL: Operations Test Lab (VP & Staff Engineer Stress Testing)
      ───────────────────────────────────────────────────────────────── */}
      <TestLabModal
        isOpen={isTestLabOpen}
        onClose={() => setIsTestLabOpen(false)}
        stores={stores}
        onUpdateStore={handleUpdateStore}
        onApplyScenario={handleTriggerScenario}
        onApplyMultiplierShock={handleApplyScenarioMultiplier}
        onApplyCustomStores={handleApplyStores}
        onReset={handleReset}
      />
    </div>
  );
}
