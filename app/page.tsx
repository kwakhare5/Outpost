"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { BatchItem, DeckTab, StoreHub, TransferRecord } from "@/lib/types";
import { INITIAL_STORES, INITIAL_BATCHES, INITIAL_TRANSFERS } from "@/lib/mockData";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { ArchitectureModal } from "@/components/dashboard/ArchitectureModal";
import { AlertsScreen } from "@/components/alerts/AlertsScreen";
import { DeliveriesScreen } from "@/components/deliveries/DeliveriesScreen";
import { HistoryScreen } from "@/components/history/HistoryScreen";
import { InventoryScreen } from "@/components/inventory/InventoryScreen";
import { SandboxScreen } from "@/components/sandbox/SandboxScreen";
import {
  advanceSimulationTime,
  applyLiveScenario,
  checkBackendHealth,
  confirmShipmentReceipt,
  executeLiveTransfer,
  fetchLiveStores,
} from "@/lib/api";

function advanceClockString(currentTime: string, hoursToAdd: number = 1): string {
  const match = currentTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "09:15 AM";
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  let period = match[3].toUpperCase();

  hour = hour + hoursToAdd;
  if (hour >= 12) {
    if (hour > 12) hour = hour - 12;
    period = period === "AM" ? "PM" : "AM";
  }
  const formattedHour = hour.toString().padStart(2, "0");
  return `${formattedHour}:${minute} ${period}`;
}

export default function OperationsDeckPage() {
  const [stores, setStores] = useState<StoreHub[]>(INITIAL_STORES);
  const [transfers, setTransfers] = useState<TransferRecord[]>(INITIAL_TRANSFERS);
  const [batches, setBatches] = useState<BatchItem[]>(INITIAL_BATCHES);
  const [activeTab, setActiveTab] = useState<DeckTab>("alerts");
  const [isTransferred, setIsTransferred] = useState(false);
  const [activeScenario, setActiveScenario] = useState("nominal");
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [simTime, setSimTime] = useState<string>("08:15 AM");
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>("");

  // Poll backend health
  useEffect(() => {
    let mounted = true;
    const probe = async () => {
      const status = await checkBackendHealth();
      if (mounted) {
        setIsBackendOnline(status.online);
        if (status.online) {
          const liveStores = await fetchLiveStores();
          if (mounted && liveStores && liveStores.length > 0) {
            setStores(liveStores);
          }
        }
      }
    };
    probe();
    const interval = setInterval(probe, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const totalStock = stores.reduce((acc, s) => acc + s.milkUnits, 0);

  // Send Van Now Handler (Human approval gate)
  const handleExecuteTransfer = async () => {
    if (isTransferred) return;

    if (isBackendOnline) {
      try {
        await executeLiveTransfer("st-02", "st-04", 20);
      } catch {
        // Fallback to local deterministic execution
      }
    }

    setStores((prev) =>
      prev.map((s) => {
        if (s.id === "st-02" || s.code === "ST-02") {
          return {
            ...s,
            milkUnits: s.milkUnits - 20,
            status: "Normal (Safe buffer kept)",
            statusType: "normal",
          };
        }
        if (s.id === "st-04" || s.code === "ST-04") {
          return {
            ...s,
            status: "Van on the Way (20 units en route)",
            statusType: "warning",
          };
        }
        return s;
      })
    );

    setTransfers((prev) => [
      {
        id: `TR-${Date.now().toString().slice(-4)}`,
        fromCode: "ST-02",
        fromName: "Bandra West",
        toCode: "ST-04",
        toName: "Lower Parel",
        units: 20,
        vanId: "Van #MH-02 (Tata Ace)",
        eta: "10:15 AM (25m via Sea Link)",
        status: "In Transit",
        corridor: "Sea Link Express Route",
        batchId: "B-MUM-MILK-002",
        sku: "Amul Taaza Milk 500ml",
        currentStep: 3,
        etaPassed: true,
        dispatchedAt: simTime,
      },
      ...prev,
    ]);

    setBatches((prev) =>
      prev.map((b) =>
        b.id === "B-MUM-MILK-002"
          ? {
              ...b,
              state: "in_transit",
              transferNote: "En Route to Lower Parel via Sea Link (Van #MH-02)",
            }
          : b
      )
    );

    setIsTransferred(true);
    toast.success("Van Dispatched from Bandra West Store", {
      description: "20 units deducted from Bandra. Van is on the road; empty shelf risk avoided!",
    });
  };

  // Back-door Store Receipt Confirmation Handler
  const handleConfirmReceipt = async (
    shipmentId: string,
    receivedUnits: number,
    notes?: string,
    destCode?: string
  ) => {
    if (isBackendOnline) {
      try {
        await confirmShipmentReceipt(shipmentId, receivedUnits, notes);
      } catch {
        // Local fallback
      }
    }

    const targetStoreCode = destCode || "ST-04";

    setStores((prev) =>
      prev.map((s) => {
        if (s.id.toLowerCase() === targetStoreCode.toLowerCase() || s.code === targetStoreCode) {
          return {
            ...s,
            milkUnits: s.milkUnits + receivedUnits,
            status: "Restocked & Safe",
            statusType: "normal",
          };
        }
        return s;
      })
    );

    setTransfers((prev) =>
      prev.map((t) => (t.id === shipmentId ? { ...t, status: "Completed" } : t))
    );

    setBatches((prev) =>
      prev.map((b) =>
        b.destCode === targetStoreCode || b.id.includes(shipmentId.slice(-4))
          ? {
              ...b,
              state: "fresh",
              storeCode: targetStoreCode,
              units: receivedUnits,
              transferNote: undefined,
            }
          : b
      )
    );

    toast.success(`Count Verified: ${receivedUnits} Units Added to Shelves`, {
      description: `Store ${targetStoreCode} inventory safely restocked. Exact stock count preserved.`,
    });
  };

  const handleAdvanceTime = async () => {
    try {
      if (isBackendOnline) {
        await advanceSimulationTime(1);
      }
      setSimTime((prev) => advanceClockString(prev, 1));
      setStores((prev) =>
        prev.map((s) => ({
          ...s,
          nextExpiryHours: Math.max(1, s.nextExpiryHours - 1),
          activeOrders: Math.max(1, s.activeOrders + Math.floor(Math.random() * 3) - 1),
        }))
      );
      toast.success("Clock Advanced: +1 Hour Elapsed", {
        description: "Shelf life timers updated; customer order rates refreshed.",
      });
    } catch {
      setSimTime((prev) => advanceClockString(prev, 1));
      toast.info("Time advanced (local simulation)");
    }
  };

  const handleApplyStores = (newStores: StoreHub[]) => {
    setStores(newStores);
    setIsTransferred(false);
  };

  const handleReset = () => {
    setStores(INITIAL_STORES);
    setTransfers(INITIAL_TRANSFERS);
    setBatches(INITIAL_BATCHES);
    setIsTransferred(false);
    setActiveScenario("nominal");
    setSimTime("08:15 AM");
    setSelectedStoreFilter("");
    toast.info("Network Reset: Restored to standard 140-unit Mumbai equilibrium");
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
      toast.warning("Scenario Activated: Bhiwandi RFC Supply Delay (+4h ETA)");
    } else if (name === "imbalance") {
      handleReset();
      toast.warning("Scenario Activated: Critical Stock Imbalance");
    } else {
      handleReset();
    }
  };

  const handleUpdateStore = (storeId: string, updates: Partial<StoreHub>) => {
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, ...updates } : s))
    );
  };

  const handleApplyScenarioMultiplier = (demandMultiplier: number, delayHours: number) => {
    if (demandMultiplier > 1) {
      setStores((prev) =>
        prev.map((s) => ({
          ...s,
          activeOrders: Math.round(s.activeOrders * demandMultiplier),
        }))
      );
      toast.warning(`Cricket Match Rush: Demand Multiplier set to ${demandMultiplier}x`);
    }
    if (delayHours > 0) {
      toast.warning(`Highway Delay: Warehouse Truck delayed by +${delayHours} hours`);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#FAF8F5] text-[#1C1917] font-sans flex flex-row">
      {/* ─────────────────────────────────────────────────────────────
          1. SIDEBAR (w-64 Permanent Left Rail)
      ───────────────────────────────────────────────────────────── */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        queueCount={6}
        inFlightCount={transfers.filter((t) => t.status !== "Completed").length}
        outcomesCount={5}
        batchesCount={batches.length}
        stores={stores}
        selectedStoreCode={selectedStoreFilter}
        onSelectStore={(code) => setSelectedStoreFilter(code)}
        simTime={simTime}
        onAdvanceHour={handleAdvanceTime}
        isBackendOnline={isBackendOnline}
      />

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN OPERATIONS AREA (Full-Width Isolated Scroll)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 h-full min-w-0 flex flex-col overflow-hidden">
        <Header
          activeTab={activeTab}
          totalStock={totalStock}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
          onSelectSandbox={() => setActiveTab("sandbox")}
          onAdvanceTime={handleAdvanceTime}
        />

        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 space-y-4 w-full">
          {activeTab === "alerts" && (
            <AlertsScreen
              stores={stores}
              isTransferred={isTransferred}
              onExecuteTransfer={handleExecuteTransfer}
              onReset={handleReset}
              onTriggerScenario={handleTriggerScenario}
              activeScenario={activeScenario}
              onOpenTestLab={() => setActiveTab("sandbox")}
              onNavigateTab={(tab) => setActiveTab(tab)}
              isBackendOnline={isBackendOnline}
            />
          )}

          {activeTab === "deliveries" && (
            <DeliveriesScreen
              transfers={transfers}
              isTransferred={isTransferred}
              onConfirmReceipt={handleConfirmReceipt}
              isBackendOnline={isBackendOnline}
            />
          )}

          {activeTab === "history" && (
            <HistoryScreen isBackendOnline={isBackendOnline} />
          )}

          {activeTab === "inventory" && (
            <InventoryScreen
              batches={batches}
              stores={stores}
              selectedStoreCode={selectedStoreFilter}
              onSelectStore={(code) => setSelectedStoreFilter(code)}
            />
          )}

          {activeTab === "sandbox" && (
            <SandboxScreen
              stores={stores}
              onUpdateStore={handleUpdateStore}
              onApplyScenario={handleTriggerScenario}
              onApplyMultiplierShock={handleApplyScenarioMultiplier}
              onApplyCustomStores={handleApplyStores}
              onReset={handleReset}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          3. ARCHITECTURE MODAL
      ───────────────────────────────────────────────────────────────── */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />
    </div>
  );
}
