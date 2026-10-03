"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Package, ShieldCheck, Truck } from "lucide-react";
import { DeckTab } from "@/lib/types";

interface MetricsOverviewProps {
  totalStock: number;
  isTransferred: boolean;
  onNavigateTab?: (tab: DeckTab) => void;
  onFocusTriage?: () => void;
}

export function MetricsOverview({
  totalStock,
  isTransferred,
  onNavigateTab,
  onFocusTriage,
}: MetricsOverviewProps) {
  return (
    <div className="bg-white border border-zinc-200/80 rounded-xl shadow-xs py-3 px-5 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-zinc-100">
      {/* 1. Total Stock */}
      <div
        onClick={() => onNavigateTab?.("stores")}
        className="py-1 lg:py-0 px-2 lg:px-4 first:pl-0 flex items-center justify-between cursor-pointer hover:bg-zinc-50/70 rounded-lg transition-colors"
        title="View All Stores"
      >
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
            <Package className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>Total Stock</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-display text-zinc-950 tracking-tight tabular-nums">
              {totalStock}
            </span>
            <span className="text-xs text-zinc-500 font-medium">units</span>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Conserved</span>
        </span>
      </div>

      {/* 2. At Risk */}
      <div
        onClick={() => onFocusTriage?.()}
        className="py-1 lg:py-0 px-2 lg:px-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50/70 rounded-lg transition-colors"
        title="Jump to Manager Sign-Off Gate"
      >
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
            <AlertCircle
              className={`w-3.5 h-3.5 shrink-0 ${
                !isTransferred ? "text-amber-500" : "text-emerald-500"
              }`}
            />
            <span>At Risk</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-display text-zinc-950 tracking-tight tabular-nums">
              {!isTransferred ? "1 Store" : "0 Stores"}
            </span>
            <span className="text-xs text-zinc-500 font-medium">running low</span>
          </div>
        </div>
        <span
          className={`hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-md border ${
            !isTransferred
              ? "text-amber-900 bg-amber-50 border-amber-200"
              : "text-emerald-800 bg-emerald-50 border-emerald-200"
          }`}
        >
          {!isTransferred ? "Lower Parel (<5h)" : "All Safe"}
        </span>
      </div>

      {/* 3. Moving Stock */}
      <div
        onClick={() => onNavigateTab?.("transfers")}
        className="py-1 lg:py-0 px-2 lg:px-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50/70 rounded-lg transition-colors"
        title="View Van Deliveries"
      >
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
            <Truck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>Moving Stock</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-display text-zinc-950 tracking-tight tabular-nums">
              {isTransferred ? "20" : "0"}
            </span>
            <span className="text-xs text-zinc-500 font-medium">units en route</span>
          </div>
        </div>
        <span
          className={`hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-md border ${
            isTransferred
              ? "text-blue-800 bg-blue-50 border-blue-200"
              : "text-zinc-700 bg-zinc-100 border-zinc-200"
          }`}
        >
          {isTransferred ? "MH-02 En Route" : "Fleet Standby"}
        </span>
      </div>

      {/* 4. Pending Sign-Off */}
      <div
        onClick={() => onFocusTriage?.()}
        className="py-1 lg:py-0 px-2 lg:px-4 last:pr-0 flex items-center justify-between cursor-pointer hover:bg-zinc-50/70 rounded-lg transition-colors"
        title="Jump to Manager Sign-Off Gate"
      >
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
            <span>Pending Sign-Off</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-display text-zinc-950 tracking-tight tabular-nums">
              {!isTransferred ? "1" : "0"}
            </span>
            <span className="text-xs text-zinc-500 font-medium">van awaiting approval</span>
          </div>
        </div>
        <span
          className={`hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-md border ${
            !isTransferred
              ? "text-amber-900 bg-amber-50 border-amber-200"
              : "text-emerald-800 bg-emerald-50 border-emerald-200"
          }`}
        >
          {!isTransferred ? "Manager Sign-Off" : "All Approved"}
        </span>
      </div>
    </div>
  );
}
