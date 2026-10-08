"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Clock,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShipmentItem, LogEvent, TransferRecord, ShipmentStep } from "@/lib/types";
import { Badge, Button } from "@/components/ui";

interface FleetScreenProps {
  transfers?: TransferRecord[];
  isTransferred: boolean;
  onConfirmReceipt?: (shipmentId: string, receivedUnits: number, notes?: string, destCode?: string, sku?: string) => void;
  isBackendOnline?: boolean;
}

const STEP_LABELS = [
  "Approved",
  "Picked",
  "Dispatched",
  "In Transit",
  "Awaiting Confirmation",
  "Received",
];

export function FleetScreen({
  transfers = [],
  isTransferred,
  onConfirmReceipt,
}: FleetScreenProps) {
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);

  // Synthesize unified shipments directly from live transfers prop
  const baseShipments: ShipmentItem[] = transfers.map((t) => {
    let step = t.currentStep || (t.status === "Completed" ? 6 : 4);
    let status: ShipmentStep = t.status === "Completed" ? "received" : (t.etaPassed ? "awaiting_confirmation" : "in_transit");
    if (t.status === "Staged") {
      step = 1;
      status = "approved";
    }
    return {
      id: t.id,
      sku: t.sku || "Amul Taaza Milk 500ml",
      source: t.fromName.includes("Store") || t.fromName.includes("RFC") ? t.fromName : `Dark Store ${t.fromName}`,
      sourceCode: t.fromCode,
      dest: t.toName.includes("Store") ? t.toName : `Dark Store ${t.toName}`,
      destCode: t.toCode,
      units: t.units,
      vanId: t.vanId,
      dispatchedAt: t.dispatchedAt || "08:15 AM",
      eta: t.eta,
      etaPassed: t.etaPassed ?? false,
      status,
      currentStep: step,
      type: t.fromCode.startsWith("RFC") ? "RFC_PO" : "TRANSFER",
      corridor: t.corridor,
    };
  });

  const shipments = baseShipments.map((s) => {
    if (confirmedIds.includes(s.id)) {
      return { ...s, status: "received" as const, currentStep: 6 };
    }
    return s;
  });

  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(shipments[0]?.id || "REC-4470-TR");
  const selectedShipment = shipments.find((s) => s.id === selectedShipmentId) || shipments[0];
  const [receivedCount, setReceivedCount] = useState<number>(selectedShipment?.units ?? 40);
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

  const isConfirmed = selectedShipment ? (confirmedIds.includes(selectedShipment.id) || selectedShipment.status === "received") : false;
  const discrepancy = selectedShipment ? Math.max(0, selectedShipment.units - receivedCount) : 0;
  const isAwaitingDoorCheck = selectedShipment ? (selectedShipment.currentStep >= 5 && !isConfirmed) : false;

  const handleConfirm = () => {
    if (!selectedShipment || isConfirmed || !isAwaitingDoorCheck) return;
    setConfirmedIds((prev) => [...prev, selectedShipment.id]);
    if (onConfirmReceipt) {
      onConfirmReceipt(selectedShipment.id, receivedCount, notes, selectedShipment.destCode, selectedShipment.sku);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Summary */}
      <section className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge variant="info" className="uppercase tracking-wide text-[10px]">
            {isTransferred ? "Van Dispatched · En Route" : "In-Flight Movements"}
          </Badge>
          <h2 className="text-xl font-bold text-[#1C1917] mt-1.5 tracking-tight">
            In-Transit Fleet &amp; Dock Receiving
          </h2>
          <p className="text-xs text-[#78716C] mt-1 max-w-2xl leading-relaxed">
            Units deduct from source upon dispatch. Destination inventory increases strictly when receiving staff counts and verifies physical units at the dock door.
          </p>
        </div>

        {/* Telemetry counters */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-center">
            <span className="text-[10px] text-[#78716C] uppercase font-bold block">In Transit</span>
            <span className="text-base font-bold text-[#2563EB] font-mono">
              {shipments.filter((s) => s.status !== "received").length}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-center">
            <span className="text-[10px] text-[#78716C] uppercase font-bold block">At Dock</span>
            <span className="text-base font-bold text-[#D97706] font-mono">
              {shipments.filter((s) => s.currentStep === 5 && s.status !== "received").length}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Shipments & Dock Confirmation Gate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Active Shipments & Event Log */}
        <div className="lg:col-span-7 space-y-4">
          <section className="bg-white rounded-2xl border border-[#EAE6DF] p-4 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-[#1C1917] tracking-tight">
              Active Shipments &amp; Inbound Orders
            </h3>

            <div className="space-y-3">
              {shipments.map((s) => {
                const isSelected = s.id === selectedShipmentId;
                const isThisConfirmed = confirmedIds.includes(s.id) || s.status === "received";

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedShipmentId(s.id);
                      setReceivedCount(s.units);
                    }}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all cursor-pointer relative space-y-3 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:outline-hidden",
                      isSelected
                        ? "border-[#2563EB] bg-[#EFF6FF]/40 shadow-xs"
                        : "border-[#EAE6DF] bg-white hover:border-[#CBD5E1]"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-[#FAF8F5] border border-[#EAE6DF] flex items-center justify-center text-[#2563EB]">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1C1917]">{s.sku}</span>
                            <span className="text-[10px] font-mono text-[#78716C] font-semibold">({s.id})</span>
                          </div>
                          <p className="text-[11px] text-[#57534E]">
                            {s.source} <span className="text-[#78716C]">→</span> {s.dest}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#1C1917] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#EAE6DF]">
                          {s.units} units
                        </span>
                        {isThisConfirmed ? (
                          <Badge variant="success" dot>Confirmed</Badge>
                        ) : s.currentStep === 5 ? (
                          <Badge variant="warning" dot>At Door</Badge>
                        ) : s.type === "RFC_PO" ? (
                          <Badge variant="neutral">Scheduled PO</Badge>
                        ) : (
                          <Badge variant="info" dot>In Transit</Badge>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1 border-t border-[#EAE6DF]/60">
                      <div className="flex items-center justify-between text-[10px] text-[#78716C] font-semibold">
                        <span>Step {isThisConfirmed ? 6 : s.currentStep} of 6:</span>
                        <span className="text-[#1C1917]">
                          {STEP_LABELS[(isThisConfirmed ? 6 : s.currentStep) - 1]}
                        </span>
                      </div>

                      <div className="h-1.5 w-full bg-[#EAE6DF] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] rounded-full transition-all"
                          style={{ width: `${((isThisConfirmed ? 6 : s.currentStep) / 6) * 100}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#78716C]">
                        <span>Vehicle: <strong className="text-[#1C1917]">{s.vanId}</strong></span>
                        <span>ETA: <strong className="text-[#1C1917]">{s.eta}</strong></span>
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
                <Badge variant={isAwaitingDoorCheck ? "urgent" : "neutral"} dot={isAwaitingDoorCheck}>
                  {isAwaitingDoorCheck ? "DOCK ARRIVAL ACTIVE" : "VEHICLE IN TRANSIT"}
                </Badge>
                <span className="text-[11px] font-mono text-[#78716C]">{selectedShipment.id}</span>
              </div>
              <h2 className="text-base font-bold text-[#1C1917] tracking-tight">
                Back-Door Count Confirmation
              </h2>
              <p className="text-xs text-[#78716C]">
                {selectedShipment.dest} · {selectedShipment.vanId}
              </p>
            </div>

            {/* Transit vs Arrival State Box */}
            {!isAwaitingDoorCheck && !isConfirmed ? (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Clock className="h-4 w-4 text-amber-700" />
                  <span>Units in Transit (No Shelf Credit)</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Destination available stock increases strictly upon verified dock arrival. Door check opens at {selectedShipment.eta}. Advance the clock to simulate vehicle arrival.
                </p>
              </div>
            ) : isConfirmed ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs">
                  <PackageCheck className="h-4 w-4 text-emerald-600" />
                  <span>Count Confirmed &amp; Shelved</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-snug">
                  {receivedCount} units committed to {selectedShipment.dest} inventory. Store stock successfully updated.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <PackageCheck className="h-4 w-4 text-blue-700" />
                  <span>Vehicle Arrived at Loading Dock</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-snug">
                  Driver has parked at loading dock. Count delivered packets and verify packaging before committing to inventory.
                </p>
              </div>
            )}

            {/* Verification Inputs */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF]">
                  <span className="text-[10px] text-[#78716C] uppercase font-bold block">Manifest Sent Units</span>
                  <span className="text-base font-bold text-[#1C1917] font-mono">{selectedShipment.units}u</span>
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF]">
                  <label htmlFor="dock-received-count" className="text-[10px] text-[#78716C] uppercase font-bold block cursor-pointer">
                    Physical Count Received
                  </label>
                  <input
                    id="dock-received-count"
                    type="number"
                    min={0}
                    max={selectedShipment.units}
                    value={receivedCount}
                    disabled={isConfirmed || !isAwaitingDoorCheck}
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
                  placeholder="e.g. Count verified, seal intact"
                  value={notes}
                  disabled={isConfirmed || !isAwaitingDoorCheck}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl text-[#1C1917] placeholder:text-[#78716C] focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30"
                />
              </div>

              {/* Submit Button */}
              <Button
                variant="success"
                size="md"
                onClick={handleConfirm}
                disabled={isConfirmed || !isAwaitingDoorCheck}
                className="w-full justify-center disabled:opacity-40"
              >
                <ShieldCheck className="h-4 w-4" />
                {isConfirmed
                  ? "Receipt Committed to Ledger"
                  : isAwaitingDoorCheck
                  ? `Confirm ${receivedCount} Units & Restock Shelves`
                  : "Arrival Pending (Disabled in Transit)"}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
