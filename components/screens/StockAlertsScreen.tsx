"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FastForward,
  ShieldCheck,
  Tag,
  XCircle,
} from "lucide-react";
import type { DeckTab, AlertItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/ui";
import { DemandChart } from "./DemandChart";

interface StockAlertsScreenProps {
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

export function StockAlertsScreen({
  alerts,
  onApproveTransfer,
  onRejectTransfer,
  onUndoAlert,
  onApplyDiscount,
  onAcknowledgeAlert,
  onNavigateTab,
  selectedStoreCode = "",
  onSelectStore,
}: StockAlertsScreenProps) {
  const [localFilter, setLocalFilter] = useState<string>("ALL");
  const [urgentOnly, setUrgentOnly] = useState<boolean>(false);
  const activeStore = selectedStoreCode || localFilter;
  const [selectedAlertId, setSelectedAlertId] = useState<string>("ALERT-01");

  const filteredAlerts = alerts.filter((a) => {
    if (urgentOnly && a.urgency !== "urgent") return false;
    if (activeStore && activeStore !== "ALL") {
      if (a.storeCode !== activeStore) return false;
    }
    return true;
  });

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || alerts[0];
  const senderPostStock = Math.max(0, selectedAlert.senderStartingStock - selectedAlert.transferQuantity);
  const senderSafeMargin = Math.max(0, senderPostStock - selectedAlert.senderLocalDemand);

  const getStatusBadge = (status: AlertItem["status"]) => {
    switch (status) {
      case "Van on the Way":
        return <Badge variant="success" dot size="sm">Van Sent</Badge>;
      case "Rejected":
        return <Badge variant="neutral" dot size="sm">Rejected</Badge>;
      case "Discount Active":
        return <Badge variant="warning" dot size="sm">Discount On</Badge>;
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

  const getActionPreview = (item: AlertItem) => {
    if (item.actionCategory === "TRANSFER") {
      return `Transfer ${item.transferQuantity}u from ${item.sendingStoreName.replace("Dark Store ", "")}`;
    }
    if (item.actionCategory === "DISCOUNT") {
      return "Apply 20% in-app price markdown";
    }
    if (item.actionCategory === "PO_WAIT") {
      return "Track incoming warehouse delivery";
    }
    return "Regular reorder buffer";
  };

  const getActionLabel = (cat?: string) => {
    switch (cat) {
      case "TRANSFER":
        return "Stock Transfer";
      case "DISCOUNT":
        return "Markdown";
      case "PO_WAIT":
        return "Incoming Order";
      default:
        return "Stock Alert";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full items-stretch">
      {/* 1. Left Column (5 cols / 41.7%): Stock Alerts List */}
      <div className="lg:col-span-5 h-auto lg:h-full lg:overflow-y-auto space-y-4 pr-0 lg:pr-1">
        <section className="bg-white rounded-2xl border border-[#EAE6DF] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#EAE6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#1C1917] tracking-tight">
                Stock Alerts
              </h2>
              <p className="text-xs text-[#57534E]">
                {filteredAlerts.length} items needing your decision
              </p>
            </div>

            {/* Dropdown Filter + Urgent Toggle */}
            <div className="flex items-center gap-2">
              <select
                aria-label="Filter alerts by store"
                value={activeStore}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalFilter(val);
                  onSelectStore?.(val === "ALL" ? "" : val);
                }}
                className="h-8 text-xs font-semibold bg-[#FAF8F5] border border-[#EAE6DF] rounded-lg px-2.5 py-1 text-[#1C1917] focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer"
              >
                <option value="ALL">All Stores (3)</option>
                <option value="ST-01">Andheri West</option>
                <option value="ST-02">Bandra</option>
                <option value="ST-03">Powai</option>
              </select>

              <button
                type="button"
                onClick={() => setUrgentOnly((prev) => !prev)}
                className={cn(
                  "h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border",
                  urgentOnly
                    ? "bg-rose-50 border-rose-300 text-rose-700 shadow-xs"
                    : "bg-white border-[#EAE6DF] text-[#57534E] hover:bg-[#FAF8F5]"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", urgentOnly ? "bg-rose-600" : "bg-[#A8A29E]")} />
                Urgent Only
              </button>
            </div>
          </div>

          {/* List Rows with Action Previews */}
          <div className="divide-y divide-[#EAE6DF]">
            {filteredAlerts.map((item) => {
              const isSelected = item.id === selectedAlertId;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedAlertId(item.id)}
                  className={cn(
                    "w-full px-4 py-3.5 text-left transition-all cursor-pointer space-y-1.5 focus-visible:outline-hidden",
                    isSelected
                      ? "bg-[#F5F2EB]/80 border-l-4 border-l-[#2563EB]"
                      : "hover:bg-[#FAF8F5] border-l-4 border-l-transparent"
                  )}
                >
                  {/* Top Line: Product Name + Single Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#1C1917] truncate">
                      {item.productName}
                    </span>
                    <div className="shrink-0">
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  {/* Middle Line: Store + Numbers */}
                  <div className="flex items-center justify-between text-xs text-[#57534E]">
                    <span className="font-semibold text-[#1C1917]">
                      {item.storeName.replace("Dark Store ", "")}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span>Stock: <strong className="text-[#1C1917]">{item.stockOnShelves}u</strong></span>
                      <span>·</span>
                      <span>Runs out: <strong className="text-[#C2410C]">~{item.runsOutInHours}h</strong></span>
                    </div>
                  </div>

                  {/* Bottom Line: Zero-Click Action Preview */}
                  <div className="pt-0.5">
                    <p className="text-xs font-semibold text-[#2563EB] truncate flex items-center gap-1">
                      <span>↳</span>
                      <span>{getActionPreview(item)}</span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* 2. Right Column (7 cols / 58.3%): Decision-First Dossier */}
      <div className="lg:col-span-7 h-auto lg:h-full lg:overflow-y-auto space-y-4 pr-0 lg:pr-1">
        <section className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs space-y-4">
          {/* Header & Meta */}
          <div className="border-b border-[#EAE6DF] pb-3 space-y-1">
            <div className="flex items-center justify-between">
              <Badge variant="neutral" size="sm" className="uppercase tracking-wider">
                {getActionLabel(selectedAlert.actionCategory)}
              </Badge>
              <span className="text-xs font-mono text-[#78716C]">
                {selectedAlert.id}
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#1C1917] tracking-tight">
              {selectedAlert.productName}
            </h3>
            <p className="text-xs text-[#57534E] font-medium">
              {selectedAlert.storeName.replace("Dark Store ", "")} · Needs replenishment
            </p>
          </div>

          {/* Key Telemetry Strip (Large Numbers) */}
          <div className="grid grid-cols-3 gap-2.5 p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] text-center">
            <div>
              <span className="text-xs text-[#57534E] font-bold block">Current Stock</span>
              <span className="text-lg font-bold text-[#1C1917] font-mono">{selectedAlert.stockOnShelves} units</span>
            </div>
            <div>
              <span className="text-xs text-[#57534E] font-bold block">Demand</span>
              <span className="text-lg font-bold text-[#C2410C] font-mono">{selectedAlert.orderSpeedPerHour} / hr</span>
            </div>
            <div>
              <span className="text-xs text-[#57534E] font-bold block">Runs Out In</span>
              <span className="text-lg font-bold text-[#C2410C] font-mono">~{selectedAlert.runsOutInHours} hrs</span>
            </div>
          </div>

          {/* DECISION-FIRST: Recommended Action Card & Action Buttons at the Top */}
          {selectedAlert.actionCategory === "TRANSFER" ? (
            <div className="space-y-3 p-4 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#57534E] uppercase tracking-wider block">Recommended Decision</span>
                  <p className="text-sm font-bold text-[#1C1917] mt-0.5">
                    Send {selectedAlert.transferQuantity} units from {selectedAlert.sendingStoreName.replace("Dark Store ", "")}
                  </p>
                </div>
                <Badge variant="info" size="sm">Lateral Transfer</Badge>
              </div>

              <div className="text-xs text-[#57534E] space-y-0.5">
                <p>· Delivery Van: #MH-02 (Western Express Highway)</p>
                <p>· Travel Time: ~35 mins (Expected arrival: 10:15 AM)</p>
                <p>· Van Cost: Rs 180</p>
              </div>

              {/* Financial Impact */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EAE6DF] text-xs">
                <div>
                  <span className="text-[#57534E] block">Sales at risk:</span>
                  <strong className="text-sm font-bold text-[#C2410C] font-mono">Rs {selectedAlert.moneyAtRisk}</strong>
                </div>
                <div>
                  <span className="text-[#57534E] block">Protected revenue:</span>
                  <strong className="text-sm font-bold text-[#059669] font-mono">+Rs {selectedAlert.moneySaved}</strong>
                </div>
              </div>

              {/* Immediate Trade-Offs: Approve vs Deny */}
              <div className="p-3 bg-white rounded-xl border border-[#EAE6DF] space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold shrink-0">✓ If You Approve:</span>
                  <span className="text-[#1C1917]">
                    0 empty shelves all day · Protects Rs {selectedAlert.moneySaved} in sales · Costs Rs 180 van trip
                  </span>
                </div>
                <div className="flex items-start gap-2 pt-1 border-t border-[#F5F2EB]">
                  <span className="text-rose-700 font-bold shrink-0">✕ If You Deny:</span>
                  <span className="text-[#1C1917]">
                    Shelves empty in ~{selectedAlert.runsOutInHours}h (~{selectedAlert.runsOutAtTime}) · Loses Rs {selectedAlert.moneyAtRisk} in sales today · {selectedAlert.sendingStoreName.replace("Dark Store ", "")} keeps all {selectedAlert.senderStartingStock} units
                  </span>
                </div>
              </div>

              {/* Action Buttons & States */}
              <div className="pt-1">
                {selectedAlert.status === "Van on the Way" ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Transfer Approved · Van En Route</span>
                      </div>
                      <Badge variant="success" dot size="sm">DISPATCHED</Badge>
                    </div>

                    {/* Next-Step Guidance Banner */}
                    <div className="p-2.5 bg-white/80 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                      <FastForward className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span><strong>Next step:</strong> Click <strong>+1h</strong> in the top header to advance the van to the loading dock.</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {onUndoAlert && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 justify-center"
                          onClick={() => onUndoAlert(selectedAlert.id)}
                        >
                          Undo Approval
                        </Button>
                      )}
                      <Button
                        variant="dark"
                        size="sm"
                        className="flex-1 justify-center"
                        onClick={() => onNavigateTab("inflight")}
                      >
                        Track in Live Deliveries
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                ) : selectedAlert.status === "Rejected" ? (
                  <div className="p-3 bg-stone-50 border border-[#EAE6DF] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1917]">
                        <XCircle className="h-4 w-4 text-[#78716C]" />
                        <span>Action Rejected · Keeping Stock at Donor</span>
                      </div>
                      <Badge variant="neutral" size="sm">REJECTED</Badge>
                    </div>
                    <p className="text-xs text-[#57534E]">
                      Retained units at Bandra. Emergency purchase order queued for evening warehouse truck.
                    </p>
                    {onUndoAlert && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full justify-center mt-1"
                        onClick={() => onUndoAlert(selectedAlert.id)}
                      >
                        Undo Rejection
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      variant="success"
                      size="md"
                      onClick={() => onApproveTransfer(selectedAlert.id)}
                      className="w-full justify-center text-sm font-bold shadow-xs active:scale-95"
                    >
                      <ShieldCheck className="h-4 w-4 mr-1" />
                      Approve Transfer
                    </Button>

                    <Button
                      variant="danger-outline"
                      size="md"
                      onClick={() => onRejectTransfer(selectedAlert.id)}
                      className="w-full justify-center text-sm font-bold active:scale-95"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject Action
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : selectedAlert.actionCategory === "DISCOUNT" ? (
            <div className="space-y-3 p-4 bg-amber-50/60 border border-amber-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">Recommended Decision</span>
                  <p className="text-sm font-bold text-amber-950 mt-0.5">
                    Apply 20% in-app price markdown to clear expiring stock
                  </p>
                </div>
                <Badge variant="warning" size="sm">DISCOUNT</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-amber-800 block">Stock value at risk:</span>
                  <strong className="text-sm font-bold text-[#C2410C] font-mono">Rs {selectedAlert.moneyAtRisk}</strong>
                </div>
                <div>
                  <span className="text-amber-800 block">Protected sales:</span>
                  <strong className="text-sm font-bold text-[#059669] font-mono">+Rs {selectedAlert.moneySaved}</strong>
                </div>
              </div>

              {/* Immediate Trade-Offs: Approve Discount vs Deny */}
              <div className="p-3 bg-white rounded-xl border border-amber-200/80 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold shrink-0">✓ If You Approve:</span>
                  <span className="text-[#1C1917]">
                    Clears expiring batch fast · Protects Rs {selectedAlert.moneySaved} revenue · Zero landfill waste
                  </span>
                </div>
                <div className="flex items-start gap-2 pt-1 border-t border-amber-100">
                  <span className="text-rose-700 font-bold shrink-0">✕ If You Deny:</span>
                  <span className="text-[#1C1917]">
                    Full price remains · Up to Rs {selectedAlert.moneyAtRisk} in spoiled unsold goods at end of shelf life
                  </span>
                </div>
              </div>

              <div className="pt-1">
                {selectedAlert.status === "Discount Active" ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs">
                      <Tag className="h-4 w-4 text-emerald-600" />
                      <span>20% Discount Active in App</span>
                    </div>
                    {onUndoAlert && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full justify-center"
                        onClick={() => onUndoAlert(selectedAlert.id)}
                      >
                        Undo Discount
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="warning"
                    size="md"
                    className="w-full justify-center text-sm font-bold active:scale-95"
                    onClick={() => onApplyDiscount(selectedAlert.id)}
                  >
                    Apply 20% In-App Discount
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-2">
              <span className="text-xs font-bold text-[#57534E] uppercase tracking-wider block">Routine Reorder Status</span>
              <p className="text-xs text-[#57534E]">
                {selectedAlert.simpleDescription}
              </p>
              {selectedAlert.status !== "Acknowledged" && (
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full justify-center text-sm font-bold mt-2"
                  onClick={() => onAcknowledgeAlert(selectedAlert.id)}
                >
                  Acknowledge Order
                </Button>
              )}
            </div>
          )}

          {/* Dynamic Hourly Demand Timeline & Depletion Chart (Supporting Evidence Below Decision) */}
          <DemandChart
            currentStock={selectedAlert.stockOnShelves}
            burnRate={selectedAlert.orderSpeedPerHour}
            productName={selectedAlert.productName}
            runsOutAtTime={selectedAlert.runsOutAtTime}
            runsOutInHours={selectedAlert.runsOutInHours}
          />

          {/* Donor Balance Proof & Other Options Considered */}
          {selectedAlert.actionCategory === "TRANSFER" && (
            <div className="space-y-3 pt-2 border-t border-[#EAE6DF]">
              {/* Donor Stock Check */}
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] space-y-1">
                <span className="text-xs font-bold uppercase text-[#57534E] block">
                  Donor Store Stock Check:
                </span>
                <p className="text-xs text-[#1C1917]">
                  {selectedAlert.sendingStoreName.replace("Dark Store ", "")} has <strong>{selectedAlert.senderStartingStock} units</strong> and only needs {selectedAlert.senderLocalDemand}.
                </p>
                <p className="text-xs text-[#059669] font-medium">
                  Sending {selectedAlert.transferQuantity} leaves {senderPostStock} units (a safe extra buffer of +{senderSafeMargin} units).
                </p>
              </div>

              {/* Other Options Considered */}
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] space-y-2">
                <span className="text-xs font-bold uppercase text-[#57534E] block">
                  Other Options Considered:
                </span>
                <ul className="space-y-1.5 text-xs text-[#57534E]">
                  <li className="flex items-start justify-between gap-2">
                    <span>1. Wait for warehouse truck:</span>
                    <span className="text-rose-600 font-semibold shrink-0">Too late (arrives 6:40 PM)</span>
                  </li>
                  <li className="flex items-start justify-between gap-2">
                    <span>2. Transfer smaller 20 units:</span>
                    <span className="text-rose-600 font-semibold shrink-0">Runs out again by 2:30 PM</span>
                  </li>
                  <li className="flex items-start justify-between gap-2">
                    <span>3. Do nothing:</span>
                    <span className="text-rose-600 font-semibold shrink-0">Loses Rs 1,390 in sales today</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Backward compatibility alias
export const QueueScreen = StockAlertsScreen;
