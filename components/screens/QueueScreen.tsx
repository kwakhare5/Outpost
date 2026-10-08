"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Tag,
  XCircle,
} from "lucide-react";
import type { DeckTab, AlertItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge, Button, SegmentedControl } from "@/components/ui";

interface QueueScreenProps {
  alerts: AlertItem[];
  onApproveTransfer: (alertId: string) => void;
  onRejectTransfer: (alertId: string) => void;
  onUndoAlert?: (alertId: string) => void;
  onApplyDiscount: (alertId: string) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onNavigateTab: (tab: DeckTab) => void;
  selectedStoreCode?: string;
  onSelectStore?: (code: string) => void;
}

export function QueueScreen({
  alerts,
  onApproveTransfer,
  onRejectTransfer,
  onUndoAlert,
  onApplyDiscount,
  onAcknowledgeAlert,
  onNavigateTab,
  selectedStoreCode = "",
  onSelectStore,
}: QueueScreenProps) {
  const [localFilter, setLocalFilter] = useState<string>("ALL");
  const selectedFilter = selectedStoreCode || localFilter;
  const [selectedAlertId, setSelectedAlertId] = useState<string>("ALERT-01");

  const filteredAlerts = alerts.filter((a) => {
    if (selectedFilter === "ALL") return true;
    if (selectedFilter === "URGENT") return a.urgency === "urgent";
    if (selectedFilter === "ST-01") return a.storeCode === "ST-01";
    if (selectedFilter === "ST-02") return a.storeCode === "ST-02";
    if (selectedFilter === "ST-03") return a.storeCode === "ST-03";
    return true;
  });

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || alerts[0];
  const senderPostStock = Math.max(0, selectedAlert.senderStartingStock - selectedAlert.transferQuantity);
  const senderSafeMargin = Math.max(0, senderPostStock - selectedAlert.senderLocalDemand);

  const getStatusBadge = (status: AlertItem["status"]) => {
    switch (status) {
      case "Van on the Way":
        return <Badge variant="success" dot size="sm">Van Dispatched</Badge>;
      case "Rejected":
        return <Badge variant="neutral" dot size="sm">Rejected</Badge>;
      case "Discount Active":
        return <Badge variant="warning" dot size="sm">Discount Active</Badge>;
      case "Acknowledged":
        return <Badge variant="neutral" dot size="sm">Acknowledged</Badge>;
      case "Needs Your Approval":
        return <Badge variant="urgent" dot size="sm">Needs Review</Badge>;
      case "Scheduled":
        return <Badge variant="warning" size="sm">Scheduled</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Watching</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* 1. Left Column (7 cols): Exception Queue List */}
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

          {/* List Rows */}
          <div className="divide-y divide-[#EAE6DF]">
            {filteredAlerts.map((item) => {
              const isSelected = item.id === selectedAlertId;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedAlertId(item.id)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-all cursor-pointer space-y-1.5 focus-visible:outline-hidden",
                    isSelected
                      ? "bg-[#F5F2EB]/70 border-l-4 border-l-[#2563EB]"
                      : "hover:bg-[#FAF8F5] border-l-4 border-l-transparent"
                  )}
                >
                  {/* Top Line: Product Name + Urgency Badge + Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-[#1C1917] truncate">
                        {item.productName}
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

                    <div className="shrink-0">
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  {/* Bottom Line: Store Name + Stock / Runout Telemetry */}
                  <div className="flex items-center justify-between text-[11px] text-[#78716C]">
                    <span className="font-semibold text-[#57534E]">
                      {item.storeName.replace("Dark Store ", "")}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span>Stock: <strong className="text-[#1C1917] font-semibold">{item.stockOnShelves}u</strong></span>
                      <span>·</span>
                      <span>Runout: <strong className="text-[#C2410C] font-semibold">~{item.runsOutInHours}h</strong></span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* 2. Right Column (5 cols): Selected Exception Dossier */}
      <div className="lg:col-span-5 space-y-4">
        <section className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs space-y-4">
          {/* Header & Meta */}
          <div className="border-b border-[#EAE6DF] pb-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <Badge variant="neutral" size="sm" className="uppercase tracking-wider">
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
              {selectedAlert.storeName.replace("Dark Store ", "")} · Category: {selectedAlert.category}
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

              {/* Proposed Transfer Details */}
              <div className="p-3.5 bg-white border border-[#EAE6DF] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1917]">Proposed Transfer</span>
                  <Badge variant="info" size="sm">LATERAL TRANSFER</Badge>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-[#1C1917] font-semibold">
                    Transfer {selectedAlert.transferQuantity} units from {selectedAlert.sendingStoreName.replace("Dark Store ", "")}
                  </p>
                  <div className="text-[11px] text-[#78716C] space-y-0.5">
                    <p>· Fleet: Van #MH-02 (Tata Ace) via Western Express Highway</p>
                    <p>· Lead Time: ~35 mins (Expected: 10:15 AM)</p>
                    <p>· Transit Cost: Rs 180</p>
                  </div>
                </div>

                {/* Donor Balance Proof */}
                <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#78716C] block">
                    Donor Balance Verification:
                  </span>
                  <p className="text-[11px] text-[#1C1917]">
                    {selectedAlert.sendingStoreName.replace("Dark Store ", "")} stock: <strong>{selectedAlert.senderStartingStock}u</strong> − {selectedAlert.transferQuantity}u = <strong>{senderPostStock}u</strong> remaining.
                  </p>
                  <p className="text-[11px] text-[#059669] font-medium">
                    Local demand: ~{selectedAlert.senderLocalDemand}u (+{senderSafeMargin}u safe buffer retained). Zero donor shortage.
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
                {selectedAlert.status === "Van on the Way" ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Action Accepted · Van En Route</span>
                      </div>
                      <Badge variant="success" dot size="sm">DISPATCHED</Badge>
                    </div>
                    <p className="text-[11px] text-emerald-700 leading-snug">
                      {selectedAlert.transferQuantity} units deducted from {selectedAlert.sendingStoreName}. Van #MH-02 is en route to {selectedAlert.storeName}.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      {onUndoAlert && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 justify-center"
                          onClick={() => onUndoAlert(selectedAlert.id)}
                        >
                          Undo Acceptance
                        </Button>
                      )}
                      <Button
                        variant="dark"
                        size="sm"
                        className="flex-1 justify-center"
                        onClick={() => onNavigateTab("inflight")}
                      >
                        Track in In-Flight Deck
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                ) : selectedAlert.status === "Rejected" ? (
                  <div className="p-3.5 bg-stone-50 border border-[#EAE6DF] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1917]">
                        <XCircle className="h-4 w-4 text-[#78716C]" />
                        <span>Action Rejected · Emergency PO Queued</span>
                      </div>
                      <Badge variant="neutral" size="sm">REJECTED</Badge>
                    </div>
                    <p className="text-[11px] text-[#78716C] leading-snug">
                      Operator elected to retain stock at donor store. Emergency RFC PO routed to Bhiwandi (80u, +4h ETA).
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      {onUndoAlert && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 justify-center"
                          onClick={() => onUndoAlert(selectedAlert.id)}
                        >
                          Undo Rejection
                        </Button>
                      )}
                      <Button
                        variant="dark"
                        size="sm"
                        className="flex-1 justify-center"
                        onClick={() => onNavigateTab("inflight")}
                      >
                        Track in In-Flight Deck
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="success"
                      size="md"
                      onClick={() => onApproveTransfer(selectedAlert.id)}
                      className="w-full justify-center"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Accept Action
                    </Button>

                    <Button
                      variant="danger-outline"
                      size="md"
                      onClick={() => onRejectTransfer(selectedAlert.id)}
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
                  <Badge variant="warning" size="sm">DISCOUNT</Badge>
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
                {selectedAlert.status === "Discount Active" ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs">
                      <Tag className="h-4 w-4 text-emerald-600" />
                      <span>20% Markdown Active in App</span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      In-app banner and discounted price published to quick-commerce consumers.
                    </p>
                    {onUndoAlert && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full justify-center mt-1"
                        onClick={() => onUndoAlert(selectedAlert.id)}
                      >
                        Undo Markdown
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="warning"
                    size="md"
                    className="w-full justify-center"
                    onClick={() => onApplyDiscount(selectedAlert.id)}
                  >
                    Apply 20% In-App Markdown
                  </Button>
                )}
              </div>
            </div>
          ) : selectedAlert.actionCategory === "PO_WAIT" ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950">Regional Supplier PO in Transit</span>
                  <Badge variant="info" size="sm">INBOUND</Badge>
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  {selectedAlert.simpleDescription}
                </p>
              </div>

              <div className="pt-2 border-t border-[#EAE6DF]">
                {selectedAlert.status === "Acknowledged" ? (
                  <div className="p-3.5 bg-stone-50 border border-[#EAE6DF] rounded-xl space-y-2 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-[#1C1917] font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                      <span>Acknowledged &amp; Monitored</span>
                    </div>
                    <p className="text-[11px] text-[#78716C]">
                      Order acknowledged. Fleet telemetry will alert upon dock arrival.
                    </p>
                    {onUndoAlert && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full justify-center mt-1"
                        onClick={() => onUndoAlert(selectedAlert.id)}
                      >
                        Reset Status
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full justify-center"
                    onClick={() => onAcknowledgeAlert(selectedAlert.id)}
                  >
                    Acknowledge &amp; Monitor
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1C1917]">Routine Replenishment Queued</span>
                  <Badge variant="neutral" size="sm">MONITOR</Badge>
                </div>
                <p className="text-[11px] text-[#78716C] leading-relaxed">
                  {selectedAlert.simpleDescription}
                </p>
              </div>

              <div className="pt-2 border-t border-[#EAE6DF]">
                {selectedAlert.status === "Acknowledged" ? (
                  <div className="p-3.5 bg-stone-50 border border-[#EAE6DF] rounded-xl space-y-2 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-[#1C1917] font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                      <span>Routine Replenishment Acknowledged</span>
                    </div>
                    <p className="text-[11px] text-[#78716C]">
                      Stock levels remain within automated reorder buffers.
                    </p>
                    {onUndoAlert && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full justify-center mt-1"
                        onClick={() => onUndoAlert(selectedAlert.id)}
                      >
                        Reset Status
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full justify-center"
                    onClick={() => onAcknowledgeAlert(selectedAlert.id)}
                  >
                    Acknowledge Routine Replenishment
                  </Button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
