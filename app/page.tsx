"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { DeckTab, StoreHub, TransferRecord } from "@/lib/types";
import { INITIAL_STORES, INITIAL_TRANSFERS } from "@/lib/mockData";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { ArchitectureModal } from "@/components/dashboard/ArchitectureModal";
import { SandboxModal } from "@/components/dashboard/SandboxModal";
import { QueueScreen } from "@/components/screens/QueueScreen";
import { FleetScreen } from "@/components/screens/FleetScreen";
import { OutcomesScreen } from "@/components/screens/OutcomesScreen";
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
  const [activeTab, setActiveTab] = useState<DeckTab>("queue");
  const [isTransferred, setIsTransferred] = useState(false);
  const [activeScenario, setActiveScenario] = useState("nominal");
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
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

  // Send Van Handler (Level-2 Human Gate)
  const handleExecuteTransfer = async () => {
    if (isTransferred) return;

    if (isBackendOnline) {
      try {
        await executeLiveTransfer("store-02", "store-01", 40);
      } catch {
        // Fallback to local deterministic execution
      }
    }

    // Deduct 40 units strictly from Bandra source; destination remains uncredited while in transit
    setStores((prev) =>
      prev.map((s) => {
        if (s.id === "store-02" || s.code === "ST-02") {
          return {
            ...s,
            milkUnits: s.milkUnits - 40,
            status: "Normal (Safe buffer retained: 72u)",
            statusType: "normal",
          };
        }
        if (s.id === "store-01" || s.code === "ST-01") {
          return {
            ...s,
            status: "Van En Route (40u arriving ~10:15)",
            statusType: "warning",
          };
        }
        return s;
      })
    );

    setTransfers((prev) => [
      {
        id: "REC-4470-TR",
        fromCode: "ST-02",
        fromName: "Dark Store Bandra",
        toCode: "ST-01",
        toName: "Dark Store Andheri West",
        units: 40,
        vanId: "Van #MH-02 (Tata Ace)",
        eta: "10:15 AM (35m via WEH)",
        status: "In Transit",
        corridor: "Bandra-Andheri Western Corridor",
        batchId: "B-MUM-MILK-002",
        sku: "Amul Taaza Milk 500ml",
        currentStep: 3,
        etaPassed: true,
        dispatchedAt: simTime,
      },
      ...prev.filter((t) => t.id !== "REC-4470-TR"),
    ]);

    setIsTransferred(true);
    toast.success("Van Dispatched from Bandra Dark Store", {
      description: "40 units deducted from Bandra. Destination stock unchanged until dock arrival confirmation.",
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
        // Fallback
      }
    }

    const targetStoreCode = destCode || "ST-01";

    // Physical stock credited ONLY upon committed count confirmation
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
      prev.map((t) => (t.id === shipmentId ? { ...t, status: "Completed", currentStep: 6 } : t))
    );

    toast.success(`Count Verified: ${receivedUnits} Units Shelved at Dock`, {
      description: `Store ${targetStoreCode} inventory safely restocked. Exact mass conservation preserved.`,
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
      toast.info("Time advanced (local simulation preview)");
    }
  };

  const handleReset = () => {
    setStores(INITIAL_STORES);
    setTransfers(INITIAL_TRANSFERS);
    setIsTransferred(false);
    setActiveScenario("nominal");
    setSimTime("08:15 AM");
    setSelectedStoreFilter("");
    toast.info("Network Reset: Restored to standard 195-unit Mumbai 3-node equilibrium");
  };

  const handleTriggerScenario = (name: string) => {
    setActiveScenario(name);
    if (isBackendOnline) {
      applyLiveScenario(name).catch(() => {});
    }

    if (name === "demand_spike") {
      setStores((prev) =>
        prev.map((s) =>
          s.id === "store-01" || s.code === "ST-01"
            ? { ...s, activeOrders: 38, status: "Critical Surge Underway", statusType: "critical" }
            : s
        )
      );
      toast.warning("Scenario Activated: Andheri West Demand Surge (38 orders)");
    } else if (name === "supplier_delay") {
      toast.warning("Scenario Activated: Bhiwandi RFC Supply Delay (+4h ETA)");
    } else {
      handleReset();
    }
  };

  const handleApplyScenarioMultiplier = (demandMultiplier: number, delayHours: number) => {
    if (demandMultiplier > 1) {
      setStores((prev) =>
        prev.map((s) => ({
          ...s,
          activeOrders: Math.round(s.activeOrders * demandMultiplier),
        }))
      );
      toast.warning(`Demand Multiplier set to ${demandMultiplier}x`);
    }
    if (delayHours > 0) {
      toast.warning(`Highway Delay: Warehouse Truck delayed by +${delayHours} hours`);
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-[#FAF8F5] text-[#1C1917] font-sans flex flex-row">
      {/* 1. Permanent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        queueCount={4}
        inFlightCount={transfers.filter((t) => t.status !== "Completed").length}
        outcomesCount={5}
        stores={stores}
        selectedStoreCode={selectedStoreFilter}
        onSelectStore={(code) => setSelectedStoreFilter(code)}
        simTime={simTime}
        isBackendOnline={isBackendOnline}
      />

      {/* 2. Main Operations Area */}
      <div className="flex-1 h-full min-w-0 flex flex-col overflow-hidden">
        <Header
          activeTab={activeTab}
          totalStock={totalStock}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
          onSelectSandbox={() => setIsSandboxModalOpen(true)}
          onAdvanceTime={handleAdvanceTime}
        />

        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 w-full">
          {activeTab === "queue" && (
            <QueueScreen
              stores={stores}
              isTransferred={isTransferred}
              onExecuteTransfer={handleExecuteTransfer}
              onReset={handleReset}
              onTriggerScenario={handleTriggerScenario}
              activeScenario={activeScenario}
              onOpenTestLab={() => setIsSandboxModalOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              isBackendOnline={isBackendOnline}
              selectedStoreCode={selectedStoreFilter}
              onSelectStore={(code) => setSelectedStoreFilter(code)}
            />
          )}

          {activeTab === "inflight" && (
            <FleetScreen
              transfers={transfers}
              isTransferred={isTransferred}
              onConfirmReceipt={handleConfirmReceipt}
              isBackendOnline={isBackendOnline}
            />
          )}

          {activeTab === "outcomes" && (
            <OutcomesScreen isBackendOnline={isBackendOnline} />
          )}
        </main>
      </div>

      {/* 3. Architecture Spec Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      {/* 4. Scenarios & Data Ingestion Modal */}
      <SandboxModal
        isOpen={isSandboxModalOpen}
        onClose={() => setIsSandboxModalOpen(false)}
        stores={stores}
        onTriggerScenario={handleTriggerScenario}
        onApplyScenarioMultiplier={handleApplyScenarioMultiplier}
        onReset={handleReset}
        isBackendOnline={isBackendOnline}
      />
    </div>
  );
}
