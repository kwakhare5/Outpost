"use client";

import React from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, Truck } from "lucide-react";

interface TriageCardProps {
  isTransferred: boolean;
  totalStock: number;
  onExecuteTransfer: () => void;
  onReset: () => void;
  onDismissRecommendation?: () => void;
  onTrackTransfer?: () => void;
  recommendation?: {
    id: string;
    sourceStoreId: string;
    sourceStoreCode: string;
    sourceStoreName: string;
    sourcePreUnits: number;
    sourcePostUnits: number;
    destStoreId: string;
    destStoreCode: string;
    destStoreName: string;
    destPreUnits: number;
    destPostUnits: number;
    transferUnits: number;
    corridor: string;
    etaMins: number;
    vanId: string;
    savingsInr: number;
    destStockoutHorizonHours?: number;
  } | null;
}

export function TriageCard({
  isTransferred,
  totalStock,
  onExecuteTransfer,
  onReset,
  onDismissRecommendation,
  onTrackTransfer,
  recommendation,
}: TriageCardProps) {
  const recId = recommendation?.id || "REC-MUM-MILK-L2";
  const sourceName = recommendation?.sourceStoreName || "Bandra West";
  const sourceCode = recommendation?.sourceStoreCode || "ST-02";
  const sourcePre = recommendation?.sourcePreUnits ?? 48;
  const sourcePost = recommendation?.sourcePostUnits ?? 28;
  const destName = recommendation?.destStoreName || "Lower Parel";
  const destCode = recommendation?.destStoreCode || "ST-04";
  const destPre = recommendation?.destPreUnits ?? 4;
  const destPost = recommendation?.destPostUnits ?? 24;
  const transferQty = recommendation?.transferUnits ?? 20;
  const corridorText = recommendation?.corridor || "Sea Link (22m)";
  const savings = recommendation?.savingsInr ?? 1180;

  return (
    <section aria-label="Level-2 Triage Gate" className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Emergency Restock (Manager Approval Required)
        </h2>
        <span className="text-xs text-zinc-400 tabular-nums">ID: {recId}</span>
      </div>

      {!isTransferred ? (
        <div className="bg-white border border-zinc-200/80 rounded-xl shadow-xs p-5 md:p-6 transition-all">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left 4 Cols: Incident Header & Financial Value */}
            <div className="lg:col-span-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300/80 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Stockout Warning · Action Required</span>
                </span>
                <span className="text-xs tabular-nums font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80">
                  +₹{savings.toLocaleString()} Saved
                </span>
              </div>

              <h3 className="text-base md:text-lg font-bold text-zinc-950 font-display tracking-tight">
                {recommendation ? `${destName} Restock via ${sourceName}` : "Lower Parel Restock via Bandra West"}
              </h3>

              <p className="text-xs text-zinc-600 leading-relaxed">
                <strong>{destCode} ({destPre} units remaining)</strong> hits stockout in <strong>{recommendation?.destStockoutHorizonHours ? `${recommendation.destStockoutHorizonHours}h` : "4.8h"}</strong>. 
                Rebalancing {transferQty} units from {sourceCode} surplus buffer.
              </p>
            </div>

            {/* Center 5 Cols: Open Visual Lateral Transit Corridor */}
            <div className="lg:col-span-5 flex items-center justify-between gap-3 py-2 px-3 border-y lg:border-y-0 lg:border-x border-zinc-100">
              {/* Source Node */}
              <div className="min-w-0">
                <span className="text-zinc-400 text-xs block font-medium">Source Store</span>
                <span className="font-bold text-zinc-900 font-display text-sm truncate block mt-0.5">
                  {sourceName} ({sourceCode})
                </span>
                <div className="tabular-nums text-xs text-zinc-600 mt-0.5">
                  {sourcePre} ➔ <span className="font-bold text-zinc-950">{sourcePost} units</span> (-{transferQty})
                </div>
              </div>

              {/* Connecting Transit Route */}
              <div className="flex flex-col items-center justify-center px-2 shrink-0">
                <div className="flex items-center gap-1.5 text-zinc-800 font-semibold text-xs">
                  <Truck className="w-3.5 h-3.5 text-zinc-600" />
                  <span>{recommendation?.vanId || "Van #MH-02"}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <div className="w-20 md:w-28 h-1 bg-zinc-200 rounded-full my-1.5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-zinc-900 rounded-full animate-pulse opacity-60" />
                </div>
                <span className="text-xs text-zinc-500 font-medium">
                  {corridorText}
                </span>
              </div>

              {/* Destination Node */}
              <div className="text-right min-w-0">
                <span className="text-zinc-400 text-xs block font-medium">Destination Store</span>
                <span className="font-bold text-zinc-900 font-display text-sm truncate block mt-0.5">
                  {destName} ({destCode})
                </span>
                <div className="tabular-nums text-xs text-zinc-600 mt-0.5">
                  {destPre} ➔ <span className="font-bold text-emerald-700">{destPost} units</span> (+{transferQty})
                </div>
              </div>
            </div>

            {/* Right 3 Cols: Direct Action Controls */}
            <div className="lg:col-span-3 flex flex-col items-stretch lg:items-end justify-center gap-2">
              <button
                type="button"
                onClick={onExecuteTransfer}
                title="Approve Inter-Store Transfer · Dispatches Tata Ace Van"
                className="h-10 px-4 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] transition-all text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 cursor-pointer border border-zinc-950 w-full sm:w-auto"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Authorise &amp; Dispatch Van Now</span>
              </button>

              <button
                type="button"
                onClick={onDismissRecommendation || onReset}
                className="h-9 px-3.5 bg-white hover:bg-zinc-50 active:scale-[0.98] text-zinc-800 font-semibold border border-zinc-200/80 text-xs rounded-lg shadow-2xs transition-all cursor-pointer w-full sm:w-auto text-center"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Conservation Check Micro-Footer */}
          <div className="mt-4 pt-3 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Conserved: <strong className="text-zinc-800">{totalStock} of 140 units</strong> accounted for (Net Change: 0 · Mass Conserved).
              </span>
            </div>
            <span className="tabular-nums text-zinc-500 text-xs">
              FIFO Batch Provenance: B-MUM-MILK-002
            </span>
          </div>
        </div>
      ) : (
        <div className="p-5 md:p-6 bg-emerald-50/80 border border-emerald-200/90 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm md:text-base text-emerald-950 font-display">
                  Lateral Transfer Dispatched &amp; Verified
                </h3>
                <span className="text-xs px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-semibold border border-emerald-200">
                  {recommendation?.vanId || "Van #MH-02"} En Route
                </span>
              </div>
              <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                {destName} replenished to {destPost} units. Total mass conserved across all dark store hubs (Net Change: 0 · Mass Conserved).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {onTrackTransfer && (
              <button
                type="button"
                onClick={onTrackTransfer}
                className="h-9 px-3.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-2xs"
              >
                Track Van Deliveries &rarr;
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="h-9 px-3.5 border border-emerald-300 bg-white hover:bg-emerald-50 active:scale-[0.98] text-emerald-900 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-2xs"
            >
              Reset State
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
