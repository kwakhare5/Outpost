"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import type { DeckTab, StoreHub, TransferRecord, AlertItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { ScenariosModal } from "@/components/dashboard/ScenariosModal";
import { StockAlertsScreen } from "@/components/screens/StockAlertsScreen";
import { DeliveriesScreen } from "@/components/screens/DeliveriesScreen";
import { ResultsScreen } from "@/components/screens/ResultsScreen";
import {
  advanceSimulationTime,
  applyLiveScenario,
  checkBackendHealth,
  confirmShipmentReceipt,
  executeLiveTransfer,
  fetchLiveStores,
  fetchStores,
  fetchStoreInventory,
  fetchRisks,
  fetchRecommendations,
  fetchShipments,
  getActiveSimulation,
  rejectRecommendation,
  approveRecommendation,
  resetLiveSimulation,
  RawStoreInventory,
} from "@/lib/api";
import {
  formatClockTime,
  mapStoresToHubs,
  mapRecommendationsToAlerts,
  mapShipmentsToTransfers,
} from "@/lib/mapper";

export default function OperationsDeckPage() {
  const [stores, setStores] = useState<StoreHub[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [activeTab, setActiveTab] = useState<DeckTab>("queue");
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
  const [sandboxInitialTab, setSandboxInitialTab] = useState<"scenarios" | "architecture">("scenarios");
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [simTime, setSimTime] = useState<string>("08:00 AM");
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>("");
  const [shrinkageUnits, setShrinkageUnits] = useState<number>(0);

  const refetchAll = useCallback(async () => {
    try {
      const health = await checkBackendHealth();
      setIsBackendOnline(health.online);
      if (!health.online) return;

      const activeSim = await getActiveSimulation();
      setSimulationId(activeSim.simulation_id);
      if (activeSim.current_time) {
        setSimTime(formatClockTime(activeSim.current_time));
      }

      const [storesRaw, risksRaw, recsRaw, shipmentsRaw] = await Promise.all([
        fetchStores().catch(() => []),
        fetchRisks().catch(() => []),
        fetchRecommendations().catch(() => []),
        fetchShipments().catch(() => []),
      ]);

      const inventories = await Promise.all(
        storesRaw.map((s) => fetchStoreInventory(s.store_id).catch(() => null))
      );
      const validInventories = inventories.filter(Boolean) as RawStoreInventory[];

      const mappedStores = mapStoresToHubs(storesRaw, validInventories);
      const mappedAlerts = mapRecommendationsToAlerts(recsRaw, risksRaw, storesRaw);
      const mappedTransfers = mapShipmentsToTransfers(shipmentsRaw, activeSim.current_time);

      setStores(mappedStores);
      setAlerts(mappedAlerts);
      setTransfers(mappedTransfers);
    } catch (err: any) {
      console.error("Refetch error:", err);
    }
  }, []);

  useEffect(() => {
    refetchAll();
    const interval = setInterval(refetchAll, 10000);
    return () => clearInterval(interval);
  }, [refetchAll]);

  const totalStock = stores.reduce((acc, s) => acc + s.milkUnits, 0);

  // 1. Approve Lateral Transfer (Level-2 Human Approval Gate)
  const handleApproveTransfer = async (alertId: string) => {
    const alert = alerts.find((a) => a.id === alertId);
    try {
      await executeLiveTransfer(alert?.recommendationId || alertId);
      toast.success("Transfer Approved and Dispatched", {
        description: "Units deducted from donor. Destination stock commits on dock receipt.",
      });
      await refetchAll();
      setActiveTab("inflight");
    } catch (err: any) {
      toast.error("Transfer Approval Failed", {
        description: err.message || "Failed to execute transfer recommendation",
      });
    }
  };

  // 2. Reject Lateral Transfer
  const handleRejectTransfer = async (alertId: string) => {
    const alert = alerts.find((a) => a.id === alertId);
    try {
      await rejectRecommendation(alert?.recommendationId || alertId);
      toast.info("Transfer Recommendation Rejected", {
        description: "Units retained at donor dark store.",
      });
      await refetchAll();
    } catch (err: any) {
      toast.error("Rejection Failed", {
        description: err.message || "Failed to reject recommendation",
      });
    }
  };

  // 3. Dynamic Markdown on Perishables
  const handleApplyDiscount = async (alertId: string) => {
    const alert = alerts.find((a) => a.id === alertId);
    try {
      await approveRecommendation(alert?.recommendationId || alertId);
      toast.success("Discount Recommendation Approved", {
        description: "20% markdown published in customer app.",
      });
      await refetchAll();
    } catch (err: any) {
      toast.error("Discount Approval Failed", {
        description: err.message || "Failed to approve discount",
      });
    }
  };

  // 4. Acknowledge Alert & Routine Monitor
  const handleAcknowledgeAlert = async (alertId: string) => {
    toast.info("Alert Acknowledged", {
      description: "Exception queued for routine monitoring.",
    });
    await refetchAll();
  };

  // 5. Simulate Vehicle Dock Arrival (Advance simulation time toward ETA)
  const handleSimulateArrival = async (shipmentId: string) => {
    try {
      await advanceSimulationTime(1, simulationId || undefined);
      toast.info("Advanced Simulation Clock (+1h)", {
        description: "Vehicle reached dock door. Count physical crates to restock.",
      });
      await refetchAll();
    } catch (err: any) {
      toast.error("Failed to advance time for arrival", {
        description: err.message,
      });
    }
  };

  // 6. Dock Count Confirmation & Shelving
  const handleConfirmReceipt = async (
    shipmentId: string,
    receivedUnits: number,
    notes?: string
  ) => {
    try {
      const res = await confirmShipmentReceipt(shipmentId, receivedUnits, notes);
      if (res.discrepancy_units > 0) {
        setShrinkageUnits((prev) => prev + res.discrepancy_units);
        toast.warning(
          `Count Confirmed with Discrepancy: ${res.received_units}/${res.sent_units} Shelved`,
          {
            description: `${res.discrepancy_units} units missing logged to transit loss ledger.`,
          }
        );
      } else {
        toast.success(`Count Confirmed: ${res.received_units} Units Shelved`, {
          description: "Destination inventory credited. Conservation of mass verified.",
        });
      }
      await refetchAll();
    } catch (err: any) {
      toast.error("Receipt Confirmation Failed", {
        description: err.message || "Failed to confirm shipment receipt",
      });
    }
  };

  // 7. Advance Simulation Clock
  const handleAdvanceTime = async () => {
    try {
      await advanceSimulationTime(1, simulationId || undefined);
      toast.success("Clock Advanced: +1 Hour Elapsed", {
        description: "Batch shelf life timers updated; customer demand processed.",
      });
      await refetchAll();
    } catch (err: any) {
      toast.error("Advance Time Failed", {
        description: err.message || "Could not advance simulation time",
      });
    }
  };

  // 8. Reset Simulation State
  const handleReset = async () => {
    try {
      await resetLiveSimulation(simulationId || undefined);
      setShrinkageUnits(0);
      setSelectedStoreFilter("");
      toast.info("Simulation Reset", {
        description: "Restored to initial dark store network equilibrium.",
      });
      await refetchAll();
    } catch (err: any) {
      toast.error("Reset Failed", {
        description: err.message || "Could not reset simulation state",
      });
    }
  };

  // 9. Operational Scenarios
  const handleTriggerScenario = async (name: string) => {
    try {
      await applyLiveScenario(name, simulationId || undefined);
      toast.warning(`Scenario Activated: ${name}`, {
        description: "Network stress applied. Observe forecast shifts and risk alerts.",
      });
      await refetchAll();
    } catch (err: any) {
      toast.error("Failed to Apply Scenario", {
        description: err.message || "Could not apply scenario to simulation",
      });
    }
  };

  const handleApplyScenarioMultiplier = async (
    demandMultiplier: number,
    delayHours: number
  ) => {
    try {
      if (demandMultiplier >= 2.0) {
        await applyLiveScenario("demand_spike", simulationId || undefined);
      }
      if (delayHours > 0) {
        await applyLiveScenario("supplier_delay", simulationId || undefined);
      }
      toast.warning("Parametric Shocks Applied", {
        description: `Demand Multiplier: ${demandMultiplier}x | Supplier Delay: +${delayHours}h`,
      });
      await refetchAll();
    } catch (err: any) {
      toast.error("Failed to Apply Shock Multipliers", {
        description: err.message,
      });
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-[#FAF8F5] text-[#1C1917] font-sans flex flex-row">
      {/* 1. Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        queueCount={alerts.filter((a) => a.status === "Needs Your Approval").length}
        inFlightCount={transfers.filter((t) => t.status !== "Completed").length}
        outcomesCount={5}
        stores={stores}
        selectedStoreCode={selectedStoreFilter}
        onSelectStore={(code) => setSelectedStoreFilter(code)}
        simTime={simTime}
      />

      {/* 2. Main Operations Area */}
      <div className="flex-1 h-full min-w-0 flex flex-col overflow-hidden">
        <Header
          activeTab={activeTab}
          totalStock={totalStock}
          onOpenArchitecture={() => {
            setSandboxInitialTab("architecture");
            setIsSandboxModalOpen(true);
          }}
          onSelectSandbox={() => {
            setSandboxInitialTab("scenarios");
            setIsSandboxModalOpen(true);
          }}
          onAdvanceTime={handleAdvanceTime}
          onResetDay={handleReset}
          simTime={simTime}
          isBackendOnline={isBackendOnline}
          shrinkageUnits={shrinkageUnits}
        />

        <main
          className={cn(
            "flex-1 min-h-0 w-full p-4 md:p-5",
            activeTab === "outcomes" ? "overflow-y-auto" : "overflow-y-auto lg:overflow-hidden"
          )}
        >
          {activeTab === "queue" && (
            <StockAlertsScreen
              alerts={alerts}
              onApproveTransfer={handleApproveTransfer}
              onRejectTransfer={handleRejectTransfer}
              onApplyDiscount={handleApplyDiscount}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onNavigateTab={(tab) => setActiveTab(tab)}
              selectedStoreCode={selectedStoreFilter}
              onSelectStore={(code) => setSelectedStoreFilter(code)}
            />
          )}

          {activeTab === "inflight" && (
            <DeliveriesScreen
              transfers={transfers}
              onConfirmReceipt={handleConfirmReceipt}
              onSimulateArrival={handleSimulateArrival}
            />
          )}

          {activeTab === "outcomes" && (
            <ResultsScreen isBackendOnline={isBackendOnline} />
          )}
        </main>
      </div>

      {/* 3. Unified Scenarios & Architecture Modal */}
      <ScenariosModal
        isOpen={isSandboxModalOpen}
        onClose={() => setIsSandboxModalOpen(false)}
        stores={stores}
        initialTab={sandboxInitialTab}
        onTriggerScenario={handleTriggerScenario}
        onApplyScenarioMultiplier={handleApplyScenarioMultiplier}
        onReset={handleReset}
        isBackendOnline={isBackendOnline}
      />
    </div>
  );
}
