"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShipmentItem, LogEvent, TransferRecord } from "@/lib/types";
import { Badge, Button } from "@/components/ui";

interface DeliveriesScreenProps {
  transfers?: TransferRecord[];
  isTransferred: boolean;
  onConfirmReceipt?: (shipmentId: string, receivedUnits: number, notes?: string, destCode?: string, sku?: string) => void;
  isBackendOnline?: boolean;
}

export function DeliveriesScreen({
  transfers = [],
  isTransferred,
  onConfirmReceipt,
}: DeliveriesScreenProps) {
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);

  // Synthesize unified shipments from live transfers
  const baseShipments: ShipmentItem[] = transfers.length > 0
    ? transfers.map((t) => ({
        id: t.id,
        sku: t.sku || "Whole Milk 500ml",
        source: t.fromName.includes("Store") ? t.fromName : `${t.fromName} Store`,
        sourceCode: t.fromCode,
        dest: t.toName.includes("Store") ? t.toName : `${t.toName} Store`,
        destCode: t.toCode,
        units: t.units,
        vanId: t.vanId,
        dispatchedAt: t.dispatchedAt || "08:15 AM",
        eta: t.eta,
        etaPassed: t.etaPassed ?? true,
        status: t.status === "Completed" ? "received" : (t.currentStep === 3 ? "awaiting_confirmation" : "in_transit"),
        currentStep: t.status === "Completed" ? 5 : (t.currentStep || 3),
        type: "TRANSFER",
        corridor: t.corridor,
      }))
    : [
        {
          id: "TR-8921",
          sku: "Amul Taaza Milk 500ml",
          source: "Bandra West Store",
          sourceCode: "ST-02",
          dest: "Lower Parel Store",
          destCode: "ST-04",
          units: 20,
          vanId: "Van #MH-02 (Tata Ace)",
          dispatchedAt: "08:15 AM",
          eta: "10:15 AM (25m via Sea Link)",
          etaPassed: true,
          status: "awaiting_confirmation",
          currentStep: 3,
          type: "TRANSFER",
          corridor: "Sea Link Express Route",
        },
        {
          id: "TR-8922",
          sku: "Britannia Daily Bread 400g",
          source: "Powai Galleria Store",
          sourceCode: "ST-03",
          dest: "Andheri East Store",
          destCode: "ST-01",
          units: 20,
          vanId: "Van #MH-05 (Tata Ace)",
          dispatchedAt: "07:15 AM",
          eta: "08:00 AM (Arrived at Door)",
          etaPassed: true,
          status: "awaiting_confirmation",
          currentStep: 3,
          type: "TRANSFER",
          corridor: "JVLR Cross-Suburban Route",
        },
      ];

  const shipments = baseShipments.map((s) => {
    if (confirmedIds.includes(s.id)) {
      return { ...s, status: "received" as const, currentStep: 5 };
    }
    return s;
  });

  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(shipments[0]?.id || "TR-8921");
  const selectedShipment = shipments.find((s) => s.id === selectedShipmentId) || shipments[0];
  const [receivedCount, setReceivedCount] = useState<number>(selectedShipment?.units ?? 20);
  const [notes, setNotes] = useState<string>("");

  const events: LogEvent[] = [
    {
      time: "8:20 AM",
      title: "VAN DEPARTED: Bandra -> Lower Parel",
      detail: "Van #MH-02 left Bandra store carrying 20 packets of milk via Sea Link. Sender stock safely deducted.",
      type: "action",
    },
    {
      time: "8:10 AM",
      title: "ARRIVED AT STORE DOOR: Van #MH-05",
      detail: "Van reached Andheri East store with 20 loaves of bread. Ready for store count check.",
      type: "arrival",
    },
    {
      time: "7:45 AM",
      title: "HIGHWAY TRAFFIC ALERT: Bhiwandi Route",
      detail: "Morning congestion on Eastern Freeway adding +30m delay to Bhiwandi regional trucks.",
      type: "info",
    },
  ];

  const isConfirmed = confirmedIds.includes(selectedShipment.id) || selectedShipment.status === "received";
  const discrepancy = Math.max(0, selectedShipment.units - receivedCount);

  const handleConfirm = () => {
    if (isConfirmed) return;
    setConfirmedIds((prev) => [...prev, selectedShipment.id]);
    if (onConfirmReceipt) {
      onConfirmReceipt(selectedShipment.id, receivedCount, notes, selectedShipment.destCode, selectedShipment.sku);
    }
  };

  const activeVansCount = shipments.filter((s) => s.status !== "received").length;
  const awaitingCount = shipments.filter((s) => s.currentStep === 3 && s.status !== "received").length;

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────────
          1. HEADER EXECUTIVE STRIP
      ───────────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="info" className="uppercase tracking-wide">
              {isTransferred ? "Van Dispatched · En Route" : "Live Deliveries · Route Monitor"}
            </Badge>
            <span className="text-xs text-[#78716C] font-semibold">GPS Active</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1C1917] mt-2 tracking-tight">
            Vans on the Way &amp; Delivery Confirmation.
          </h2>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1 max-w-2xl leading-relaxed">
            Stock is never added to store shelves until store staff counts and confirms packets at the back door.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto shrink-0 text-xs">
          <div className="p-3 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl">
            <span className="text-[#78716C] block text-[11px] font-semibold">ACTIVE VANS</span>
            <p className="text-base font-bold text-[#1C1917] tabular-nums mt-0.5">{activeVansCount} on road</p>
          </div>
          <div className="p-3 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl">
            <span className="text-[#78716C] block text-[11px] font-semibold">AT STORE DOOR</span>
            <p className="text-base font-bold text-[#C2410C] tabular-nums mt-0.5">{awaitingCount} Awaiting Count</p>
          </div>
          <div className="p-3 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl">
            <span className="text-[#78716C] block text-[11px] font-semibold">ZERO LOST STOCK</span>
            <p className="text-base font-bold text-emerald-700 tabular-nums mt-0.5">100% Balanced</p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          2. TWO-COLUMN SPLIT: Left Delivery List + Right Arrival Count Form
      ───────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* ── Left Column: Active Delivery List & Activity Log ── */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#F0ECE4] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#78716C]" />
                <h3 className="font-bold text-sm text-[#1C1917] tracking-tight">
                  Active Deliveries List
                </h3>
              </div>
              <span className="text-xs text-[#78716C] font-semibold">Click van to inspect &amp; count</span>
            </div>

            <div className="divide-y divide-[#F0ECE4]">
              {shipments.map((s) => {
                const isSelected = s.id === selectedShipment.id;
                const isThisConfirmed = confirmedIds.includes(s.id);

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedShipmentId(s.id);
                      setReceivedCount(s.units);
                    }}
                    className={cn(
                      "p-5 cursor-pointer transition-all text-xs flex flex-col gap-2.5 border-l-4",
                      isSelected
                        ? "bg-[#EFF6FF] border-l-[#2563EB]"
                        : "border-l-transparent hover:bg-[#FAF8F5]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1C1917]">{s.sku}</span>
                        <Badge variant="neutral">
                          {s.units} packets
                        </Badge>
                      </div>

                      <Badge
                        variant={
                          isThisConfirmed
                            ? "success"
                            : s.currentStep === 3
                            ? "urgent"
                            : "info"
                        }
                      >
                        {isThisConfirmed ? "Put on Shelves" : s.currentStep === 3 ? "Arrived at Door" : "On the Road"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#78716C]">
                      <span>{s.source} &rarr; {s.dest}</span>
                      <span className="text-[#1C1917] font-bold">{s.eta}</span>
                    </div>

                    {/* Hairline 5-Segment Milestone Rail */}
                    <div className="pt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#1C1917]">
                          Step {isThisConfirmed ? 5 : s.currentStep} of 5 ·{" "}
                          <span className={cn(isThisConfirmed ? "text-emerald-700" : s.currentStep === 3 ? "text-[#C2410C]" : "text-[#2563EB]")}>
                            {isThisConfirmed
                              ? "Shelved & Available"
                              : s.currentStep === 3
                              ? "Arrived at Door (Count Needed)"
                              : s.currentStep === 2
                              ? "In Transit on Highway"
                              : "Van Dispatched"}
                          </span>
                        </span>
                        <span className="font-mono text-[#78716C] text-[10px]">
                          {isThisConfirmed ? "100%" : `${Math.round((s.currentStep / 5) * 100)}%`}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 w-full">
                        {[1, 2, 3, 4, 5].map((stepNum) => {
                          const isDone = (isThisConfirmed ? 5 : s.currentStep) >= stepNum;
                          return (
                            <div
                              key={stepNum}
                              className={cn(
                                "h-1.5 rounded-full transition-all",
                                isDone ? "bg-[#2563EB]" : "bg-[#EAE6DF]"
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Simple Activity Log */}
          <div className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
              Live Activity Log
            </h4>
            <div className="space-y-2.5">
              {events.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 text-xs p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF]">
                  <span className="font-bold text-[#78716C] shrink-0 mt-0.5">{ev.time}</span>
                  <div>
                    <p className="font-bold text-[#1C1917]">{ev.title}</p>
                    <p className="text-[#78716C] text-[11px] mt-0.5">{ev.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Column: Count Delivered Units Form (Door Check) ── */}
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 shadow-xs space-y-5">
          <div className="border-b border-[#F0ECE4] pb-4">
            <Badge variant="neutral">
              Step 4: Count Check at Door
            </Badge>
            <h3 className="text-xl font-bold text-[#1C1917] mt-2.5 tracking-tight">
              Count Units for {selectedShipment.sku}
            </h3>
            <p className="text-xs text-[#78716C] mt-1">
              {selectedShipment.vanId} · Arrived from {selectedShipment.source}
            </p>
          </div>

          {/* Streamlined Van Details Box */}
          <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[#78716C] block text-[10px] font-bold uppercase tracking-wider">SENT FROM</span>
              <p className="font-semibold text-[#1C1917] mt-0.5 truncate">{selectedShipment.source.replace(" Store", "")}</p>
            </div>
            <div>
              <span className="text-[#78716C] block text-[10px] font-bold uppercase tracking-wider">DELIVER TO</span>
              <p className="font-semibold text-[#1C1917] mt-0.5 truncate">{selectedShipment.dest.replace(" Store", "")}</p>
            </div>
            <div>
              <span className="text-[#78716C] block text-[10px] font-bold uppercase tracking-wider">UNITS SENT</span>
              <p className="font-bold text-[#2563EB] mt-0.5 tabular-nums font-mono">{selectedShipment.units} units</p>
            </div>
            <div>
              <span className="text-[#78716C] block text-[10px] font-bold uppercase tracking-wider">EST. TRANSIT</span>
              <p className="font-semibold text-emerald-700 mt-0.5 truncate">
                {selectedShipment.eta.includes("(")
                  ? selectedShipment.eta.split("(")[1]?.replace(")", "") || "25 mins"
                  : "25 mins"}
              </p>
            </div>
          </div>

          {/* Count Input Box */}
          {!isConfirmed ? (
            <div className="p-5 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1.5">
                  How many packets arrived in good condition?
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={receivedCount}
                    onChange={(e) => setReceivedCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-32 px-4 py-2.5 rounded-lg bg-white border border-[#EAE6DF] text-base font-bold text-[#1C1917] text-center focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <span className="text-xs text-[#78716C] font-semibold">
                    out of {selectedShipment.units} sent
                  </span>
                </div>
              </div>

              {/* Discrepancy Alert */}
              {discrepancy > 0 && (
                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">{discrepancy} packets reported damaged or missing:</strong> Store shelves will be credited with {receivedCount} units. {discrepancy} units recorded as transit damage.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#57534E] mb-1.5">
                  Notes / Staff comments (optional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Count verified by clerk, 2 packets squished"
                  className="w-full px-4 py-2.5 rounded-lg bg-white border border-[#EAE6DF] text-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleConfirm}
                className="w-full py-3"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Confirm {receivedCount} Packets &amp; Put on Shelves</span>
              </Button>
            </div>
          ) : (
            <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-sm text-emerald-950">Delivery Confirmed &amp; Restocked</h4>
              <p className="text-xs text-emerald-800">
                {receivedCount} packets successfully added to {selectedShipment.dest} shelves. Zero stock lost.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
