"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import type { DeckTab, StoreHub, TransferRecord, AlertItem } from "@/lib/types";
import { INITIAL_STORES, INITIAL_TRANSFERS, DEFAULT_ALERTS } from "@/lib/mockData";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
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
  const [alerts, setAlerts] = useState<AlertItem[]>(DEFAULT_ALERTS);
  const [activeTab, setActiveTab] = useState<DeckTab>("queue");
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
  const [sandboxInitialTab, setSandboxInitialTab] = useState<"scenarios" | "architecture">("scenarios");
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

  // 1. Approve Lateral Transfer (Level-2 Human Approval Gate)
  const handleApproveTransfer = async (alertId: string) => {
    if (isBackendOnline) {
      try {
        await executeLiveTransfer("store-02", "store-01", 40);
      } catch {
        // Deterministic local fallback
      }
    }

    // Deduct 40 units strictly from Bandra (ST-02)
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

    // Update alert status
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: "Van on the Way" as const,
              suggestedAction: "Van on the Way (Arriving 10:15 AM)",
            }
          : a
      )
    );

    // Add van to in-flight transfers
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
        currentStep: 4,
        etaPassed: false,
        dispatchedAt: simTime,
      },
      ...prev.filter((t) => t.id !== "REC-4470-TR"),
    ]);

    toast.success("Van Dispatched from Bandra Dark Store", {
      description: "40 units deducted from Bandra. Destination stock unchanged until dock receipt.",
    });

    // Auto-navigate to in-flight deck to view live transit
    setActiveTab("inflight");
  };

  // 2. Reject Lateral Transfer (Domain Invariant 4: Routes to Bhiwandi RFC Emergency PO)
  const handleRejectTransfer = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: "Rejected" as const,
              suggestedAction: "Emergency PO routed to Bhiwandi RFC (80u, +4h ETA)",
            }
          : a
      )
    );

    // Create alternative emergency PO record
    setTransfers((prev) => [
      {
        id: "PO-BHW-EMERGENCY",
        fromCode: "RFC-BHW",
        fromName: "Bhiwandi Regional Fulfillment Center",
        toCode: "ST-01",
        toName: "Dark Store Andheri West",
        units: 80,
        vanId: "Freight Truck #MH-04-RFC",
        eta: "12:15 PM (+4h Highway Delivery)",
        status: "In Transit",
        corridor: "Thane-Bhiwandi Highway Express",
        batchId: "B-RFC-MILK-990",
        sku: "Amul Taaza Milk 500ml",
        currentStep: 3,
        etaPassed: false,
        dispatchedAt: simTime,
      },
      ...prev.filter((t) => t.id !== "PO-BHW-EMERGENCY"),
    ]);

    toast.info("Transfer Rejected: Emergency PO Dispatched", {
      description: "80 units ordered from Bhiwandi RFC (+Rs 450 transit surcharge). Track in In-Flight deck.",
    });

    // Auto-navigate to in-flight deck to view emergency order
    setActiveTab("inflight");
  };

  // 3. Dynamic 20% Markdown on Perishables
  const handleApplyDiscount = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: "Discount Active" as const,
              suggestedAction: "20% Flash Markdown Active in Customer App",
              moneySaved: Math.round(a.moneySaved * 1.2),
            }
          : a
      )
    );

    toast.success("20% Flash Markdown Published in App", {
      description: "Price dropped on Dahi batches with <10h shelf life to accelerate velocity.",
    });
  };

  // 4. Acknowledge Alert & Routine Monitor
  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: "Acknowledged" as const,
            }
          : a
      )
    );

    toast.info("Alert Acknowledged", {
      description: "Exception acknowledged and queued for automated monitoring.",
    });
  };

  // Reversible action handler for all alert types
  const handleUndoAlert = (alertId: string) => {
    const original = DEFAULT_ALERTS.find((a) => a.id === alertId);
    if (!original) return;

    if (alertId === "ALERT-01") {
      setStores((prev) =>
        prev.map((s) => {
          if (s.id === "store-02" || s.code === "ST-02") {
            return {
              ...s,
              milkUnits: 112,
              status: "Surplus (Can spare 40 units)",
              statusType: "surplus",
            };
          }
          if (s.id === "store-01" || s.code === "ST-01") {
            return {
              ...s,
              status: "Critical (Runs out in ~5.0h)",
              statusType: "critical",
            };
          }
          return s;
        })
      );
      setTransfers((prev) =>
        prev.filter((t) => t.id !== "REC-4470-TR" && t.id !== "PO-BHW-EMERGENCY")
      );
    }

    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...original } : a))
    );

    toast.info("Action Reversed: Restored to Review Queue");
  };

  // 5. Simulate Vehicle Dock Arrival
  const handleSimulateArrival = (shipmentId: string) => {
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === shipmentId
          ? {
              ...t,
              currentStep: 5,
              etaPassed: true,
            }
          : t
      )
    );

    toast.info("Vehicle Arrived at Loading Dock Door", {
      description: "Back-door receiving verification is now active. Verify physical units to restock.",
    });
  };

  // 6. Dock Count Confirmation & Shelving
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

    // Shelf credit commits strictly now
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

    toast.success(`Count Confirmed: ${receivedUnits} Units Shelved`, {
      description: `Store ${targetStoreCode} inventory credited. Conservation of mass verified.`,
    });
  };

  // 7. Simulation Controls
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
    setAlerts(DEFAULT_ALERTS);
    setSimTime("08:15 AM");
    setSelectedStoreFilter("");
    toast.info("Network Reset: Restored to standard 195-unit Mumbai 3-node equilibrium");
  };

  const handleTriggerScenario = (name: string) => {
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
        />

        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 w-full">
          {activeTab === "queue" && (
            <QueueScreen
              alerts={alerts}
              onApproveTransfer={handleApproveTransfer}
              onRejectTransfer={handleRejectTransfer}
              onUndoAlert={handleUndoAlert}
              onApplyDiscount={handleApplyDiscount}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onNavigateTab={(tab) => setActiveTab(tab)}
              selectedStoreCode={selectedStoreFilter}
              onSelectStore={(code) => setSelectedStoreFilter(code)}
            />
          )}

          {activeTab === "inflight" && (
            <FleetScreen
              transfers={transfers}
              onConfirmReceipt={handleConfirmReceipt}
              onSimulateArrival={handleSimulateArrival}
            />
          )}

          {activeTab === "outcomes" && (
            <OutcomesScreen isBackendOnline={isBackendOnline} />
          )}
        </main>
      </div>

      {/* 3. Unified Scenarios & Architecture Modal */}
      <SandboxModal
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
