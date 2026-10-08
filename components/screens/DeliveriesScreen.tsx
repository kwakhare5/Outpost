"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Clock,
  PackageCheck,
  ShieldCheck,
  Truck,
  ArrowRight,
  Check,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LogEvent, TransferRecord } from "@/lib/types";
import { Badge, Button } from "@/components/ui";

interface DeliveriesScreenProps {
  transfers: TransferRecord[];
  onConfirmReceipt: (shipmentId: string, receivedUnits: number, notes?: string, destCode?: string, sku?: string) => void;
  onSimulateArrival: (shipmentId: string) => void;
}

const STEP_LABELS = [
  "Approved",
  "Picked",
  "Dispatched",
  "In Transit",
  "At Dock",
  "Received",
];

export function DeliveriesScreen({
  transfers = [],
  onConfirmReceipt,
  onSimulateArrival,
}: DeliveriesScreenProps) {
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(transfers[0]?.id || "REC-4470-TR");
  const [activeLeftView, setActiveLeftView] = useState<"vans" | "log">("vans");

  const selectedTransfer = transfers.find((t) => t.id === selectedShipmentId) || transfers[0];
  const [receivedCount, setReceivedCount] = useState<number>(selectedTransfer?.units ?? 40);
  const [notes, setNotes] = useState<string>("");

  const events: LogEvent[] = [
    {
      time: "08:20 AM",
      title: "Van Dispatched: Bandra -> Andheri West",
      detail: "Van #MH-02 left Bandra carrying 40 packets of milk. Bandra stock deducted.",
      type: "action",
    },
    {
      time: "08:00 AM",
      title: "Arrived at Dock: Van #MH-05",
      detail: "Van reached Andheri West with 20 loaves of bread. Ready for back-door check.",
      type: "arrival",
    },
    {
      time: "07:45 AM",
      title: "Highway Congestion: Bhiwandi Route",
      detail: "Morning traffic on Thane-Bhiwandi highway adding +30m delay to regional warehouse trucks.",
      type: "info",
    },
  ];

  const currentStep = selectedTransfer?.currentStep || (selectedTransfer?.status === "Completed" ? 6 : 4);
  const isCompleted = selectedTransfer?.status === "Completed" || currentStep === 6;
  const isAtDock = currentStep === 5 && !isCompleted;
  const isInTransit = currentStep < 5 && !isCompleted;
  const discrepancy = selectedTransfer ? Math.max(0, selectedTransfer.units - receivedCount) : 0;

  const handleConfirm = () => {
    if (!selectedTransfer || isCompleted || !isAtDock) return;
    onConfirmReceipt(
      selectedTransfer.id,
      receivedCount,
      notes,
      selectedTransfer.toCode,
      selectedTransfer.sku
    );
  };

  const onTheRoadCount = transfers.filter((t) => t.status !== "Completed" && (t.currentStep || 4) < 5).length;
  const atDockCount = transfers.filter((t) => t.status !== "Completed" && (t.currentStep || 4) === 5).length;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 1. Balanced 6 : 6 Grid (50% / 50%) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column (6 cols / 50%): Active Shipments & Event Log */}
        <div className="lg:col-span-6 h-auto lg:h-full lg:overflow-y-auto space-y-4 pr-0 lg:pr-1">
          <section className="bg-white rounded-2xl border border-[#EAE6DF] shadow-xs overflow-hidden">
            {/* View Selector & Telemetry Header */}
            <div className="p-4 border-b border-[#EAE6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveLeftView("vans")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                    activeLeftView === "vans"
                      ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                      : "bg-[#FAF8F5] text-[#57534E] border-[#EAE6DF] hover:bg-white"
                  )}
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span>Active Vans ({transfers.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveLeftView("log")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                    activeLeftView === "log"
                      ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                      : "bg-[#FAF8F5] text-[#57534E] border-[#EAE6DF] hover:bg-white"
                  )}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span>Activity Log ({events.length})</span>
                </button>
              </div>

              {/* Status Counters */}
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold border border-blue-200">
                  {onTheRoadCount} on road
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200">
                  {atDockCount} at dock
                </span>
              </div>
            </div>

            {/* View 1: Active Vans List */}
            {activeLeftView === "vans" && (
              <div className="divide-y divide-[#EAE6DF]">
                {transfers.map((t) => {
                  const isSelected = t.id === selectedShipmentId;
                  const step = t.currentStep || (t.status === "Completed" ? 6 : 4);
                  const isDone = t.status === "Completed" || step === 6;
                  const isDock = step === 5 && !isDone;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedShipmentId(t.id);
                        setReceivedCount(t.units);
                      }}
                      className={cn(
                        "w-full px-4 py-3.5 text-left transition-all cursor-pointer space-y-2 focus-visible:outline-hidden",
                        isSelected
                          ? "bg-[#F5F2EB]/80 border-l-4 border-l-[#2563EB]"
                          : "hover:bg-[#FAF8F5] border-l-4 border-l-transparent"
                      )}
                    >
                      {/* Top Line: SKU, Units, Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-bold text-[#1C1917] truncate">
                            {t.sku}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#1C1917] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#EAE6DF] shrink-0">
                            {t.units}u
                          </span>
                        </div>

                        <div className="shrink-0">
                          {isDone ? (
                            <Badge variant="success" dot size="sm">Received</Badge>
                          ) : isDock ? (
                            <Badge variant="warning" dot size="sm">At Dock</Badge>
                          ) : t.fromCode.startsWith("RFC") ? (
                            <Badge variant="neutral" size="sm">Emergency Order</Badge>
                          ) : (
                            <Badge variant="info" dot size="sm">On Road</Badge>
                          )}
                        </div>
                      </div>

                      {/* Middle Line: Route, Van, ETA */}
                      <div className="flex items-center justify-between text-xs text-[#57534E]">
                        <span className="font-semibold text-[#1C1917]">
                          {t.fromName.replace("Dark Store ", "")} → {t.toName.replace("Dark Store ", "")}
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span>{t.vanId}</span>
                          <span>·</span>
                          <span>ETA: <strong className="text-[#1C1917]">{t.eta}</strong></span>
                        </div>
                      </div>

                      {/* Step Dots Trail */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#EAE6DF]">
                        <span className="text-[#57534E] font-medium">
                          Step {step} of 6: <strong className="text-[#1C1917]">{STEP_LABELS[step - 1]}</strong>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5, 6].map((dot) => (
                            <span
                              key={dot}
                              className={cn(
                                "h-2 w-2 rounded-full transition-all",
                                dot <= step
                                  ? dot === 6
                                    ? "bg-emerald-500"
                                    : dot === 5
                                    ? "bg-amber-500"
                                    : "bg-[#2563EB]"
                                  : "bg-[#EAE6DF]"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* View 2: Activity Log Timeline */}
            {activeLeftView === "log" && (
              <div className="p-4 space-y-2.5">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs font-mono p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF]">
                    <span className="text-xs font-bold text-[#2563EB] shrink-0">{ev.time}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-[#1C1917] text-xs">{ev.title}</p>
                      <p className="text-xs text-[#57534E] font-sans leading-snug mt-0.5">{ev.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (6 cols / 50%): Dock Receiving Gate & Shipment Detail */}
        <div className="lg:col-span-6 h-auto lg:h-full lg:overflow-y-auto space-y-4 pr-0 lg:pr-1">
          <section className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs space-y-4">
            <div className="border-b border-[#EAE6DF] pb-3 space-y-1">
              <div className="flex items-center justify-between">
                <Badge variant={isAtDock ? "warning" : isCompleted ? "success" : "info"} size="sm" dot>
                  {isCompleted ? "STOCK CONFIRMED" : isAtDock ? "AT LOADING DOCK" : "ON THE ROAD"}
                </Badge>
                <span className="text-xs font-mono text-[#78716C]">{selectedTransfer.id}</span>
              </div>
              <h2 className="text-lg font-bold text-[#1C1917] tracking-tight">
                Receive Delivery
              </h2>
              <p className="text-xs text-[#57534E]">
                {selectedTransfer.toName} · Van {selectedTransfer.vanId}
              </p>
            </div>

            {/* Dynamic State: IN TRANSIT vs AT DOCK vs COMPLETED */}
            {isInTransit ? (
              /* CLEAN IN-TRANSIT CARD: No disabled crate inputs! */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                    <Clock className="h-4 w-4 text-blue-700 shrink-0" />
                    <span>Van is Traveling on Western Express Highway</span>
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Carrying <strong>{selectedTransfer.units} units of {selectedTransfer.sku}</strong>. The driver is currently in transit. Dock receiving unlocks once the driver reaches the bay door.
                  </p>
                  <div className="flex items-center justify-between text-xs text-blue-950 font-semibold pt-1 border-t border-blue-200/60">
                    <span>Route: {selectedTransfer.fromName.replace("Dark Store ", "")} ➔ {selectedTransfer.toName.replace("Dark Store ", "")}</span>
                    <span>Expected ETA: {selectedTransfer.eta}</span>
                  </div>
                </div>

                <div className="p-4 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl text-center space-y-2">
                  <span className="text-xs text-[#57534E] block">Want to test receiving immediately?</span>
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full justify-center text-sm font-bold active:scale-95"
                    onClick={() => onSimulateArrival(selectedTransfer.id)}
                  >
                    <ArrowRight className="h-4 w-4 mr-1 text-[#2563EB]" />
                    Simulate Van Arrival at Dock Door
                  </Button>
                </div>
              </div>
            ) : isCompleted ? (
              /* COMPLETED CARD */
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-emerald-900 font-bold text-sm">
                  <PackageCheck className="h-5 w-5 text-emerald-600" />
                  <span>Delivery Confirmed &amp; Stock Shelved</span>
                </div>
                <p className="text-xs text-emerald-800 leading-snug">
                  <strong>{receivedCount} units</strong> successfully added to {selectedTransfer.toName} inventory.
                </p>
                {discrepancy > 0 && (
                  <p className="text-xs text-rose-700 font-medium">
                    ({discrepancy} units missing recorded to shrinkage loss)
                  </p>
                )}
              </div>
            ) : (
              /* AT DOCK DOOR: Form reveals dynamically! */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                    <PackageCheck className="h-4 w-4 text-amber-700 shrink-0" />
                    <span>Van Arrived at Loading Dock Door</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-snug">
                    Count physical crates before committing units to store inventory.
                  </p>
                </div>

                {/* 1-Click Receiving Presets */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-[#57534E] uppercase tracking-wider block">
                    Fast Receiving Presets:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReceivedCount(selectedTransfer.units);
                        setNotes("All crates intact, cold chain maintained");
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between",
                        receivedCount === selectedTransfer.units
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs"
                          : "bg-[#FAF8F5] border-[#EAE6DF] text-[#1C1917] hover:bg-white"
                      )}
                    >
                      <div>
                        <p className="text-xs font-bold">✓ All {selectedTransfer.units} Intact</p>
                        <p className="text-[11px] text-[#57534E]">0 damage</p>
                      </div>
                      {receivedCount === selectedTransfer.units && (
                        <Check className="h-4 w-4 text-emerald-600" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReceivedCount(Math.max(0, selectedTransfer.units - 2));
                        setNotes("2 cartons crushed during highway transit");
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between",
                        receivedCount === selectedTransfer.units - 2
                          ? "bg-rose-50 border-rose-300 text-rose-900 shadow-xs"
                          : "bg-[#FAF8F5] border-[#EAE6DF] text-[#1C1917] hover:bg-white"
                      )}
                    >
                      <div>
                        <p className="text-xs font-bold">⚠️ Report 2 Damaged</p>
                        <p className="text-[11px] text-[#57534E]">Log to loss</p>
                      </div>
                      {receivedCount === selectedTransfer.units - 2 && (
                        <Check className="h-4 w-4 text-rose-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Verification Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF]">
                    <span className="text-xs text-[#57534E] font-bold block">Sent on Van</span>
                    <span className="text-lg font-bold text-[#1C1917] font-mono">{selectedTransfer.units} units</span>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF]">
                    <label htmlFor="dock-received-count" className="text-xs text-[#57534E] font-bold block cursor-pointer">
                      Count Received
                    </label>
                    <input
                      id="dock-received-count"
                      type="number"
                      min={0}
                      max={selectedTransfer.units}
                      value={receivedCount}
                      onChange={(e) => setReceivedCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full text-lg font-bold text-[#2563EB] font-mono bg-white border border-[#EAE6DF] rounded px-2 py-0.5 mt-0.5 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30"
                    />
                  </div>
                </div>

                {/* Discrepancy Alert */}
                {discrepancy > 0 && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      Discrepancy: {discrepancy} units missing or damaged
                    </span>
                    <p className="text-xs text-rose-800 leading-snug">
                      Only <strong>{receivedCount} units</strong> will be credited to shelves. {discrepancy} units are recorded directly to the loss ledger.
                    </p>
                  </div>
                )}

                {/* Inspection Notes */}
                <div>
                  <label htmlFor="dock-notes" className="text-xs font-bold text-[#1C1917] block mb-1 cursor-pointer">
                    Dock Inspection Notes
                  </label>
                  <input
                    id="dock-notes"
                    type="text"
                    placeholder="e.g. Verified cold chain, 0 damage"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl text-[#1C1917] placeholder:text-[#78716C] focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30"
                  />
                </div>

                {/* Confirm Button */}
                <Button
                  variant="success"
                  size="md"
                  onClick={handleConfirm}
                  className="w-full justify-center text-sm font-bold shadow-xs active:scale-95"
                >
                  <ShieldCheck className="h-4 w-4 mr-1" />
                  Confirm {receivedCount} Units &amp; Restock Shelves
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// Backward compatibility alias
export const FleetScreen = DeliveriesScreen;
