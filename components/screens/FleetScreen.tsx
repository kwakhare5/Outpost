"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Clock,
  PackageCheck,
  ShieldCheck,
  Truck,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LogEvent, TransferRecord } from "@/lib/types";
import { Badge, Button } from "@/components/ui";

interface FleetScreenProps {
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

export function FleetScreen({
  transfers = [],
  onConfirmReceipt,
  onSimulateArrival,
}: FleetScreenProps) {
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(transfers[0]?.id || "REC-4470-TR");
  const selectedTransfer = transfers.find((t) => t.id === selectedShipmentId) || transfers[0];
  const [receivedCount, setReceivedCount] = useState<number>(selectedTransfer?.units ?? 40);
  const [notes, setNotes] = useState<string>("");

  const events: LogEvent[] = [
    {
      time: "08:20 AM",
      title: "Van Dispatched: Bandra -> Andheri West",
      detail: "Van #MH-02 left Bandra carrying 40 packets of milk via WEH. Sender stock deducted.",
      type: "action",
    },
    {
      time: "08:00 AM",
      title: "Arrived at Dock: Van #MH-05",
      detail: "Van reached Andheri West with 20 loaves of bread. Ready for back-door receiving check.",
      type: "arrival",
    },
    {
      time: "07:45 AM",
      title: "Traffic Alert: Bhiwandi Route",
      detail: "Morning congestion on Thane-Bhiwandi corridor adding +30m delay to regional supplier trucks.",
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

  return (
    <div className="space-y-4">
      {/* 1. Header Summary */}
      <section className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge variant="info" size="sm" className="uppercase tracking-wide">
            Fleet Operations
          </Badge>
          <h2 className="text-xl font-bold text-[#1C1917] mt-1.5 tracking-tight">
            In-Transit Fleet &amp; Dock Receiving
          </h2>
          <p className="text-xs text-[#78716C] mt-1 max-w-2xl leading-relaxed">
            Units deduct from source store upon dispatch. Destination inventory increases strictly when receiving staff physically counts and commits units at the loading dock.
          </p>
        </div>

        {/* Telemetry counters */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-center">
            <span className="text-[10px] text-[#78716C] uppercase font-bold block">In Transit</span>
            <span className="text-base font-bold text-[#2563EB] font-mono">
              {transfers.filter((t) => t.status !== "Completed" && (t.currentStep || 4) < 5).length}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-center">
            <span className="text-[10px] text-[#78716C] uppercase font-bold block">At Dock Door</span>
            <span className="text-base font-bold text-[#D97706] font-mono">
              {transfers.filter((t) => t.status !== "Completed" && (t.currentStep || 4) === 5).length}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Shipments & Dock Confirmation Gate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Active Shipments & Event Log */}
        <div className="lg:col-span-7 space-y-4">
          <section className="bg-white rounded-2xl border border-[#EAE6DF] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#EAE6DF] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1C1917] tracking-tight">
                  Active Shipments &amp; Inbound Orders
                </h3>
                <p className="text-[11px] text-[#78716C]">
                  Western express highway and regional transit manifests
                </p>
              </div>
              <Badge variant="neutral" size="sm">
                {transfers.length} Transits
              </Badge>
            </div>

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
                      "w-full px-4 py-3.5 text-left transition-all cursor-pointer space-y-2.5 focus-visible:outline-hidden",
                      isSelected
                        ? "bg-[#F5F2EB]/70 border-l-4 border-l-[#2563EB]"
                        : "hover:bg-[#FAF8F5] border-l-4 border-l-transparent"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-[#FAF8F5] border border-[#EAE6DF] flex items-center justify-center text-[#2563EB] shrink-0">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1C1917]">{t.sku}</span>
                            <span className="text-[10px] font-mono text-[#78716C] font-semibold">({t.id})</span>
                          </div>
                          <p className="text-[11px] text-[#57534E]">
                            {t.fromName} <span className="text-[#78716C]">→</span> {t.toName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#1C1917] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#EAE6DF]">
                          {t.units} units
                        </span>
                        {isDone ? (
                          <Badge variant="success" dot size="sm">Received</Badge>
                        ) : isDock ? (
                          <Badge variant="warning" dot size="sm">At Dock</Badge>
                        ) : t.fromCode.startsWith("RFC") ? (
                          <Badge variant="neutral" size="sm">Emergency PO</Badge>
                        ) : (
                          <Badge variant="info" dot size="sm">In Transit</Badge>
                        )}
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="space-y-1.5 pt-1 border-t border-[#EAE6DF]">
                      <div className="flex items-center justify-between text-[10px] text-[#78716C] font-semibold">
                        <span>Step {step} of 6:</span>
                        <span className="text-[#1C1917]">{STEP_LABELS[step - 1]}</span>
                      </div>

                      <div className="h-1.5 w-full bg-[#EAE6DF] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] rounded-full transition-all"
                          style={{ width: `${(step / 6) * 100}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#78716C]">
                        <span>Vehicle: <strong className="text-[#1C1917]">{t.vanId}</strong></span>
                        <span>ETA: <strong className="text-[#1C1917]">{t.eta}</strong></span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Physical Event Log */}
          <section className="bg-white rounded-2xl border border-[#EAE6DF] p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider border-b border-[#EAE6DF] pb-2">
              Physical Dispatch Log
            </h3>

            <div className="space-y-2">
              {events.map((ev, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs font-mono p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF]">
                  <span className="text-[11px] font-bold text-[#2563EB] shrink-0">{ev.time}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-[#1C1917] text-[11px]">{ev.title}</p>
                    <p className="text-[11px] text-[#78716C] font-sans leading-snug mt-0.5">{ev.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column (5 cols): Back-Door Count Confirmation Gate */}
        <div className="lg:col-span-5 space-y-4">
          <section className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs space-y-4">
            <div className="border-b border-[#EAE6DF] pb-3 space-y-1">
              <div className="flex items-center justify-between">
                <Badge variant={isAtDock ? "warning" : isCompleted ? "success" : "info"} size="sm" dot>
                  {isCompleted ? "RECEIPT COMMITTED" : isAtDock ? "DOCK ARRIVAL ACTIVE" : "VEHICLE IN TRANSIT"}
                </Badge>
                <span className="text-[11px] font-mono text-[#78716C]">{selectedTransfer.id}</span>
              </div>
              <h2 className="text-base font-bold text-[#1C1917] tracking-tight">
                Back-Door Count Confirmation
              </h2>
              <p className="text-xs text-[#78716C]">
                {selectedTransfer.toName} · {selectedTransfer.vanId}
              </p>
            </div>

            {/* State Announcement */}
            {isInTransit ? (
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <Clock className="h-4 w-4 text-blue-700" />
                    <span>In Transit on Western Corridor</span>
                  </div>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Vehicle is en route. Dock receiving unlocks once the driver checks in at the bay door.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-center mt-1"
                  onClick={() => onSimulateArrival(selectedTransfer.id)}
                >
                  <ArrowRight className="h-3.5 w-3.5 mr-1" />
                  Simulate Vehicle Arrival at Dock
                </Button>
              </div>
            ) : isCompleted ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs">
                  <PackageCheck className="h-4 w-4 text-emerald-600" />
                  <span>Count Confirmed &amp; Shelved</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-snug">
                  {receivedCount} units credited to {selectedTransfer.toName} inventory.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <PackageCheck className="h-4 w-4 text-amber-700" />
                  <span>Vehicle Arrived at Loading Dock</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-snug">
                  Count physical crates and verify packaging seals before committing inventory.
                </p>
              </div>
            )}

            {/* Verification Inputs */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF]">
                  <span className="text-[10px] text-[#78716C] uppercase font-bold block">Manifest Sent Units</span>
                  <span className="text-base font-bold text-[#1C1917] font-mono">{selectedTransfer.units}u</span>
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF]">
                  <label htmlFor="dock-received-count" className="text-[10px] text-[#78716C] uppercase font-bold block cursor-pointer">
                    Physical Count Received
                  </label>
                  <input
                    id="dock-received-count"
                    type="number"
                    min={0}
                    max={selectedTransfer.units}
                    value={receivedCount}
                    disabled={isCompleted || !isAtDock}
                    onChange={(e) => setReceivedCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full text-base font-bold text-[#2563EB] font-mono bg-white border border-[#EAE6DF] rounded px-2 py-0.5 mt-0.5 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30"
                  />
                </div>
              </div>

              {/* Discrepancy Alert */}
              {discrepancy > 0 && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    Discrepancy: {discrepancy} units missing or damaged
                  </span>
                  <p className="text-[11px] text-red-700 leading-snug">
                    Physical shelf credit is limited to {receivedCount} verified units. Missing units are recorded to shrinkage ledger.
                  </p>
                </div>
              )}

              {/* Store Staff Notes */}
              <div>
                <label htmlFor="dock-notes" className="text-[11px] font-bold text-[#1C1917] block mb-1 cursor-pointer">
                  Dock Inspection Notes
                </label>
                <input
                  id="dock-notes"
                  type="text"
                  placeholder="e.g. Count verified, cold chain maintained"
                  value={notes}
                  disabled={isCompleted || !isAtDock}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl text-[#1C1917] placeholder:text-[#78716C] focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30"
                />
              </div>

              {/* Submit Button */}
              <Button
                variant="success"
                size="md"
                onClick={handleConfirm}
                disabled={isCompleted || !isAtDock}
                className="w-full justify-center disabled:opacity-40"
              >
                <ShieldCheck className="h-4 w-4" />
                {isCompleted
                  ? "Receipt Committed to Ledger"
                  : isAtDock
                  ? `Confirm ${receivedCount} Units & Restock Shelves`
                  : "Arrival Pending (Click Simulate Arrival above)"}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
