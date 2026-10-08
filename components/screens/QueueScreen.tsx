"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { StoreHub, DeckTab, AlertItem } from "@/lib/types";
import { DEFAULT_ALERTS } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { Badge, Button, SegmentedControl } from "@/components/ui";

interface QueueScreenProps {
  stores: StoreHub[];
  isTransferred: boolean;
  onExecuteTransfer: () => void;
  onReset: () => void;
  onTriggerScenario: (name: string) => void;
  activeScenario?: string;
  onOpenTestLab: () => void;
  onNavigateTab: (tab: DeckTab) => void;
  isBackendOnline?: boolean;
  selectedStoreCode?: string;
  onSelectStore?: (code: string) => void;
}

export function QueueScreen({
  stores,
  isTransferred,
  onExecuteTransfer,
  onNavigateTab,
  selectedStoreCode = "",
  onSelectStore,
}: QueueScreenProps) {
  const [localFilter, setLocalFilter] = useState<string>("ALL");
  const selectedFilter = selectedStoreCode ? selectedStoreCode : localFilter;
  const [selectedAlertId, setSelectedAlertId] = useState<string>("ALERT-01");
  const [isRejected, setIsRejected] = useState(false);

  const alerts = useMemo<AlertItem[]>(() => {
    const andheri = stores.find((s) => s.code === "ST-01" || s.name.includes("Andheri")) || stores[0];
    const bandra = stores.find((s) => s.code === "ST-02" || s.name.includes("Bandra")) || stores[1];
    const powai = stores.find((s) => s.code === "ST-03" || s.name.includes("Powai")) || stores[2];

    return DEFAULT_ALERTS.map((a) => {
      if (a.id === "ALERT-01") {
        return {
          ...a,
          storeCode: andheri?.code || a.storeCode,
          storeName: andheri?.name || a.storeName,
          stockOnShelves: andheri?.milkUnits ?? a.stockOnShelves,
          suggestedAction: isTransferred ? "Van on the Way (Arriving 10:15 AM)" : a.suggestedAction,
          status: isTransferred ? ("Van on the Way" as const) : a.status,
          sendingStoreCode: bandra?.code || a.sendingStoreCode,
          sendingStoreName: bandra?.name || a.sendingStoreName,
          senderStartingStock: isTransferred ? (bandra?.milkUnits ?? 72) + 40 : (bandra?.milkUnits ?? 112),
        };
      }
      if (a.id === "ALERT-02" && powai) {
        return {
          ...a,
          storeName: powai.name,
        };
      }
      return a;
    });
  }, [stores, isTransferred]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (selectedFilter === "ALL") return true;
      if (selectedFilter === "URGENT") return a.urgency === "urgent";
      if (selectedFilter === "ST-01") return a.storeCode === "ST-01";
      if (selectedFilter === "ST-02") return a.storeCode === "ST-02";
      if (selectedFilter === "ST-03") return a.storeCode === "ST-03";
      return true;
    });
  }, [alerts, selectedFilter]);

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || alerts[0];
  const senderPostStock = Math.max(0, selectedAlert.senderStartingStock - selectedAlert.transferQuantity);
  const senderSafeMargin = Math.max(0, senderPostStock - selectedAlert.senderLocalDemand);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* =========================================================
          LEFT COLUMN (7 cols): EXCEPTION QUEUE TABLE
      ========================================================= */}
      <div className="lg:col-span-7 space-y-4">
        <section className="bg-white rounded-2xl border border-[#EAE6DF] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#EAE6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#1C1917] tracking-tight">
                Exception Review Queue
              </h2>
              <p className="text-[11px] text-[#78716C]">
                Sorted by earliest actionable stockout impact
              </p>
            </div>

            {/* Store Filter Track */}
            <SegmentedControl
              items={[
                { id: "ALL", label: "All Stores" },
                { id: "URGENT", label: "Urgent" },
                { id: "ST-01", label: "Andheri W" },
                { id: "ST-02", label: "Bandra" },
                { id: "ST-03", label: "Powai" },
              ]}
              value={selectedFilter}
              onChange={(val) => {
                setLocalFilter(val);
                onSelectStore?.(val === "ALL" || val === "URGENT" ? "" : val);
              }}
            />
          </div>

          {/* Queue Rows */}
          <div className="divide-y divide-[#EAE6DF]">
            {filteredAlerts.map((item) => {
              const isSelected = item.id === selectedAlertId;
              const isItemResolved = item.id === "ALERT-01" && isTransferred;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedAlertId(item.id);
                    setIsRejected(false);
                  }}
                  className={cn(
                    "w-full p-3.5 transition-all text-left grid grid-cols-12 items-center gap-2 cursor-pointer active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:outline-hidden",
                    isSelected
                      ? "bg-[#EFF6FF] ring-1 ring-inset ring-[#2563EB]/30 shadow-xs"
                      : "hover:bg-[#FAF8F5]"
                  )}
                >
                  <div className="col-span-12 sm:col-span-6 min-w-0 flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1C1917] truncate">
                      {item.productName}
                    </span>
                    <span className="text-[11px] text-[#78716C]">·</span>
                    <span className="text-[11px] font-semibold text-[#57534E] shrink-0">
                      {item.storeName}
                    </span>
                    <Badge
                      variant={
                        item.urgency === "urgent"
                          ? "urgent"
                          : item.urgency === "moderate"
                          ? "warning"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {item.urgency.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="col-span-7 sm:col-span-3 flex items-center gap-2 text-[11px] text-[#78716C] font-mono">
                    <span>Stock: <strong className="text-[#1C1917]">{item.stockOnShelves}u</strong></span>
                    <span>·</span>
                    <span>Runout: <strong className="text-[#C2410C]">~{item.runsOutInHours}h</strong></span>
                  </div>

                  <div className="col-span-5 sm:col-span-3 text-right">
                    {isItemResolved ? (
                      <Badge variant="success" dot>
                        Van Dispatched
                      </Badge>
                    ) : item.status === "Needs Your Approval" ? (
                      <Badge variant="urgent" dot>
                        Needs Review
                      </Badge>
                    ) : item.status === "Scheduled" ? (
                      <Badge variant="warning">Scheduled</Badge>
                    ) : (
                      <Badge variant="neutral">Watching</Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* =========================================================
          RIGHT COLUMN (5 cols): SELECTED RISK & DISPATCH DOSSIER
      ========================================================= */}
      <div className="lg:col-span-5 space-y-4">
        <section className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs space-y-4">
          {/* Header & Meta */}
          <div className="border-b border-[#EAE6DF] pb-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <Badge variant="neutral" className="uppercase tracking-wider text-[10px]">
                {selectedAlert.actionCategory || "INVENTORY EXCEPTION"}
              </Badge>
              <span className="text-[11px] font-mono text-[#78716C]">
                {selectedAlert.id}
              </span>
            </div>
            <h3 className="text-base font-bold text-[#1C1917] tracking-tight">
              {selectedAlert.productName}
            </h3>
            <p className="text-xs text-[#57534E] font-medium">
              {selectedAlert.storeName} · Category: {selectedAlert.category}
            </p>
          </div>

          {/* Telemetry Summary Strip */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] text-center">
            <div>
              <span className="text-[10px] text-[#78716C] uppercase font-bold block">On-Shelf</span>
              <span className="text-base font-bold text-[#1C1917] font-mono">{selectedAlert.stockOnShelves}u</span>
            </div>
            <div>
              <span className="text-[10px] text-[#78716C] uppercase font-bold block">Burn Rate</span>
              <span className="text-base font-bold text-[#C2410C] font-mono">{selectedAlert.orderSpeedPerHour} u/h</span>
            </div>
            <div>
              <span className="text-[10px] text-[#78716C] uppercase font-bold block">Runout</span>
              <span className="text-base font-bold text-[#C2410C] font-mono">~{selectedAlert.runsOutInHours}h</span>
            </div>
          </div>

          {/* Shelf Depletion Horizon */}
          <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#1C1917]">Depletion Horizon</span>
              <span className="text-[11px] font-mono text-[#C2410C] font-semibold">
                Runs out at {selectedAlert.runsOutAtTime} (~{selectedAlert.runsOutInHours}h)
              </span>
            </div>
            <div className="h-2 w-full bg-[#EAE6DF] rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  selectedAlert.runsOutInHours <= 5
                    ? "bg-rose-500"
                    : selectedAlert.runsOutInHours <= 8
                    ? "bg-amber-500"
                    : "bg-[#2563EB]"
                )}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      12,
                      (selectedAlert.stockOnShelves /
                        (selectedAlert.stockOnShelves + selectedAlert.orderSpeedPerHour * 4)) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#78716C] font-mono">
              <span>Current Stock: <strong className="text-[#1C1917]">{selectedAlert.stockOnShelves}u</strong></span>
              <span>Burn Rate: <strong className="text-[#1C1917]">{selectedAlert.orderSpeedPerHour} u/h</strong></span>
            </div>
          </div>

          {/* Contextual Action Dossier */}
          {selectedAlert.actionCategory === "TRANSFER" ? (
            <>
              {/* Inbound Context */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Clock className="h-3.5 w-3.5 text-amber-700" />
                  <span>Inbound PO-4471 Context</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-snug">
                  Evening truck from Bhiwandi RFC arrives at <strong>18:40</strong> (5.6h after projected shelf runout). Lateral transfer required to prevent stockout.
                </p>
              </div>

              {/* Transfer Recommendation & Donor Proof */}
              <div className="p-3.5 bg-white border border-[#EAE6DF] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1917]">Proposed Transfer</span>
                  <Badge variant="info">LATERAL TRANSFER</Badge>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-[#1C1917] font-semibold">
                    Transfer {selectedAlert.transferQuantity} units from {selectedAlert.sendingStoreName}
                  </p>
                  <div className="text-[11px] text-[#78716C] space-y-0.5">
                    <p>· Fleet: Van #MH-02 (Tata Ace) via Western Express Highway</p>
                    <p>· Lead Time: ~35 mins (Expected: 10:15 AM)</p>
                    <p>· Transit Cost: Rs 180</p>
                  </div>
                </div>

                {/* Donor Verification Proof */}
                <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#78716C] block">
                    Donor Balance Verification:
                  </span>
                  <p className="text-[11px] text-[#1C1917]">
                    {selectedAlert.sendingStoreName} opening stock: <strong>{selectedAlert.senderStartingStock}u</strong> − Transfer: <strong>{selectedAlert.transferQuantity}u</strong> = <strong>{senderPostStock}u</strong> remaining.
                  </p>
                  <p className="text-[11px] text-[#059669] font-medium">
                    Local demand: ~{selectedAlert.senderLocalDemand}u (+{senderSafeMargin}u safe buffer retained). Zero donor shortage created.
                  </p>
                </div>
              </div>

              {/* Financial Impact */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[#78716C]">
                  <span>Projected sales at risk:</span>
                  <strong className="text-[#C2410C]">Rs {selectedAlert.moneyAtRisk}</strong>
                </div>
                <div className="flex justify-between text-[#78716C]">
                  <span>Net modeled recovery:</span>
                  <strong className="text-[#059669]">+Rs {selectedAlert.moneySaved}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-[#EAE6DF]">
                {isTransferred ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Transfer Approved &amp; Dispatched</span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      {selectedAlert.transferQuantity} units deducted from {selectedAlert.sendingStoreName}. Van #MH-02 is en route to {selectedAlert.storeName}.
                    </p>
                    <Button
                      variant="dark"
                      size="sm"
                      className="mt-2"
                      onClick={() => onNavigateTab("inflight")}
                    >
                      Track in In-Flight Deck
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                ) : isRejected ? (
                  <div className="p-3 bg-stone-50 border border-[#EAE6DF] rounded-xl text-center space-y-1">
                    <p className="text-xs font-semibold text-[#1C1917]">Action Rejected</p>
                    <p className="text-[11px] text-[#78716C]">Lateral transfer dismissed by operator.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="success"
                      size="md"
                      onClick={onExecuteTransfer}
                      className="w-full justify-center"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Approve Transfer
                    </Button>

                    <Button
                      variant="danger-outline"
                      size="md"
                      onClick={() => {
                        setIsRejected(true);
                        toast.info("Transfer action rejected by operator");
                      }}
                      className="w-full justify-center"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Action
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : selectedAlert.actionCategory === "DISCOUNT" ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950">In-App Dynamic Markdown</span>
                  <Badge variant="warning">DISCOUNT</Badge>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  {selectedAlert.simpleDescription}
                </p>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[#78716C]">
                  <span>Perishable value at risk:</span>
                  <strong className="text-[#C2410C]">Rs {selectedAlert.moneyAtRisk}</strong>
                </div>
                <div className="flex justify-between text-[#78716C]">
                  <span>Expected recovery with 20% discount:</span>
                  <strong className="text-[#059669]">+Rs {selectedAlert.moneySaved}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-[#EAE6DF]">
                <Button
                  variant="warning"
                  size="md"
                  className="w-full justify-center"
                  onClick={() => toast.success(`20% Flash Markdown Applied to ${selectedAlert.productName} in App`)}
                >
                  Apply 20% In-App Markdown
                </Button>
              </div>
            </div>
          ) : selectedAlert.actionCategory === "PO_WAIT" ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950">Regional Supplier PO in Transit</span>
                  <Badge variant="info">INBOUND</Badge>
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  {selectedAlert.simpleDescription}
                </p>
              </div>

              <div className="pt-2 border-t border-[#EAE6DF]">
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full justify-center"
                  onClick={() => toast.info(`Acknowledged highway transit for ${selectedAlert.productName}`)}
                >
                  Acknowledge &amp; Monitor
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1C1917]">Routine Replenishment Queued</span>
                  <Badge variant="neutral">MONITOR</Badge>
                </div>
                <p className="text-[11px] text-[#78716C] leading-relaxed">
                  {selectedAlert.simpleDescription}
                </p>
              </div>

              <div className="pt-2 border-t border-[#EAE6DF]">
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full justify-center"
                  onClick={() => toast.info(`Routine replenishment active for ${selectedAlert.productName}`)}
                >
                  Acknowledge Routine Replenishment
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
