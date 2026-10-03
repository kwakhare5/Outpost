"use client";

import React, { useState } from "react";
import { ArrowRight, LayoutGrid, MapPin, Package, Table } from "lucide-react";
import { StoreHub } from "@/lib/types";

interface StoreTableProps {
  stores: StoreHub[];
  onOpenStoreDrawer: (store: StoreHub) => void;
  onViewAllStores?: () => void;
  isDetailedView?: boolean;
  onUpdateStore?: (storeId: string, updates: Partial<StoreHub>) => void;
  onUpdateStoreStock?: (storeId: string, newUnits: number) => void;
  searchQuery?: string;
}

export function StoreTable({
  stores,
  onOpenStoreDrawer,
  onViewAllStores,
  isDetailedView = false,
  searchQuery = "",
}: StoreTableProps) {
  const [filterType, setFilterType] = useState<"all" | "critical" | "surplus" | "normal">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const filteredStores = stores.filter((s) => {
    if (filterType !== "all" && s.statusType !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.locality.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        {isDetailedView ? (
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200/70 text-xs shadow-inner">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  filterType === "all"
                    ? "bg-white text-zinc-950 font-semibold shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950 font-medium"
                }`}
              >
                All ({stores.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("critical")}
                className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  filterType === "critical"
                    ? "bg-white text-zinc-950 font-semibold shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950 font-medium"
                }`}
              >
                Critical ({stores.filter((s) => s.statusType === "critical").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("surplus")}
                className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  filterType === "surplus"
                    ? "bg-white text-zinc-950 font-semibold shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950 font-medium"
                }`}
              >
                Surplus ({stores.filter((s) => s.statusType === "surplus").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("normal")}
                className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  filterType === "normal"
                    ? "bg-white text-zinc-950 font-semibold shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950 font-medium"
                }`}
              >
                Nominal ({stores.filter((s) => s.statusType === "normal").length})
              </button>
            </div>
          </div>
        ) : (
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Mumbai Dark Stores ({stores.length} Locations)
          </h2>
        )}

        {!isDetailedView && onViewAllStores && (
          <button
            type="button"
            onClick={onViewAllStores}
            className="text-xs text-zinc-600 hover:text-zinc-950 font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View all 5 stores</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {isDetailedView && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200/70 text-xs shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "grid"
                    ? "bg-white text-zinc-950 font-semibold shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950 font-medium"
                }`}
                title="Store Cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Store Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "table"
                    ? "bg-white text-zinc-950 font-semibold shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950 font-medium"
                }`}
                title="Full Table"
              >
                <Table className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Full Table</span>
              </button>
            </div>
            <span className="text-xs text-zinc-400 tabular-nums hidden sm:inline">{stores.length} Dark Stores</span>
          </div>
        )}
      </div>

      {/* Dual-Mode Render: Store Cards vs Full Table */}
      {isDetailedView && viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map((hub) => {
            const fillPct = Math.round((hub.milkUnits / hub.capacity) * 100);
            return (
              <div
                key={hub.id}
                className={`bg-white border rounded-xl p-5 shadow-xs transition-all hover:shadow-sm flex flex-col justify-between space-y-4 ${
                  hub.statusType === "critical"
                    ? "border-red-200/90 hover:border-red-300"
                    : hub.statusType === "surplus"
                    ? "border-blue-200/90 hover:border-blue-300"
                    : "border-zinc-200/80 hover:border-zinc-300"
                }`}
              >
                {/* Card Top: Node Code, Name, Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-bold text-xs px-2.5 py-1 rounded-md shrink-0 border ${
                        hub.statusType === "critical"
                          ? "bg-red-100 text-red-900 border-red-200"
                          : hub.statusType === "surplus"
                          ? "bg-blue-100 text-blue-900 border-blue-200"
                          : "bg-zinc-100 text-zinc-800 border-zinc-200/70"
                      }`}
                    >
                      {hub.code}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-md font-semibold border ${
                        hub.statusType === "critical"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : hub.statusType === "surplus"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {hub.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-zinc-950 font-display">
                      {hub.name}
                    </h3>
                    <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span>{hub.locality}, Mumbai</span>
                    </p>
                  </div>
                </div>

                {/* Volumetric Fill Gauge */}
                <div className="space-y-1.5 p-3 bg-zinc-50/70 rounded-lg border border-zinc-200/60">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-medium">Whole Milk 1L Stock:</span>
                    <div className="flex items-center gap-1.5 tabular-nums">
                      <span className="font-bold text-zinc-950 text-xs">
                        {hub.milkUnits} / {hub.capacity} units
                      </span>
                      <span className="text-zinc-400 text-xs">({fillPct}%)</span>
                    </div>
                  </div>

                  <div className="relative w-full h-2.5 bg-zinc-200/60 rounded-full overflow-hidden border border-zinc-300/40">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        hub.statusType === "critical"
                          ? "bg-red-500"
                          : hub.statusType === "surplus"
                          ? "bg-blue-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, fillPct)}%` }}
                    />
                  </div>
                </div>

                {/* Micro-Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-zinc-50/50 rounded-lg border border-zinc-100 space-y-0.5">
                    <span className="text-zinc-400 block text-xs">Active Orders</span>
                    <span className="font-bold text-zinc-900 tabular-nums text-xs">
                      {hub.activeOrders} orders
                    </span>
                  </div>
                  <div className="p-2.5 bg-zinc-50/50 rounded-lg border border-zinc-100 space-y-0.5">
                    <span className="text-zinc-400 block text-xs">Shelf Life</span>
                    <span className="font-bold text-zinc-900 tabular-nums text-xs">
                      {hub.nextExpiryHours}h left
                    </span>
                  </div>
                </div>

                {/* Inspect Action */}
                <button
                  type="button"
                  onClick={() => onOpenStoreDrawer(hub)}
                  className="w-full h-9 px-3 text-xs bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-lg text-zinc-900 font-semibold transition-all active:scale-[0.98] cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Inspect Batch Ledger</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Full Table View */
        <div className="bg-white border border-zinc-200/80 rounded-xl shadow-xs overflow-hidden">
          {/* Table Column Headers */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-2.5 bg-zinc-50/70 border-b border-zinc-200/60 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <div className="md:col-span-3">Dark Store</div>
            <div className="md:col-span-2">Stock Status</div>
            <div className="md:col-span-4">Inventory &amp; Fill Level</div>
            <div className="md:col-span-2">Demand &amp; Expiry</div>
            <div className="md:col-span-1 text-right">Action</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-zinc-100">
            {filteredStores.map((hub) => {
              const fillPct = Math.round((hub.milkUnits / hub.capacity) * 100);
              return (
                <div
                  key={hub.id}
                  className={`p-4 md:px-5 md:py-3.5 transition-colors hover:bg-zinc-50/80 flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 md:items-center ${
                    hub.statusType === "critical"
                      ? "bg-red-50/20"
                      : hub.statusType === "surplus"
                      ? "bg-blue-50/20"
                      : ""
                  }`}
                >
                  {/* 1. Store & Location */}
                  <div className="md:col-span-3 flex items-center gap-3 min-w-0">
                    <span
                      className={`font-bold text-xs px-2.5 py-1 rounded-md shrink-0 border ${
                        hub.statusType === "critical"
                          ? "bg-red-100 text-red-900 border-red-200"
                          : hub.statusType === "surplus"
                          ? "bg-blue-100 text-blue-900 border-blue-200"
                          : "bg-zinc-100 text-zinc-800 border-zinc-200/70"
                      }`}
                    >
                      {hub.code}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-zinc-950 font-display truncate">
                        {hub.name}
                      </h3>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 truncate mt-0.5">
                        <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span className="truncate">{hub.locality}</span>
                      </p>
                    </div>
                  </div>

                  {/* 2. Status Badge */}
                  <div className="md:col-span-2">
                    <span
                      className={`inline-block text-xs px-2.5 py-0.5 rounded-md font-semibold border ${
                        hub.statusType === "critical"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : hub.statusType === "surplus"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {hub.status}
                    </span>
                  </div>

                  {/* 3. Volumetric Gauge & Inventory */}
                  <div className="md:col-span-4 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Whole Milk 1L:</span>
                      <div className="flex items-center gap-1.5 tabular-nums">
                        <span className="font-bold text-zinc-950 text-xs">
                          {hub.milkUnits} / {hub.capacity} units
                        </span>
                        <span className="text-zinc-400 text-xs">({fillPct}%)</span>
                      </div>
                    </div>

                    <div className="relative w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/40">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          hub.statusType === "critical"
                            ? "bg-red-500"
                            : hub.statusType === "surplus"
                            ? "bg-blue-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, fillPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* 4. Demand & Shelf Life */}
                  <div className="md:col-span-2 text-xs text-zinc-600 tabular-nums">
                    <div className="flex md:flex-col justify-between md:justify-start gap-1">
                      <span>
                        <strong className="text-zinc-900">{hub.activeOrders}</strong> active orders
                      </span>
                      <span className="text-zinc-400">
                        Shelf life: <strong className="text-zinc-700">{hub.nextExpiryHours}h</strong>
                      </span>
                    </div>
                  </div>

                  {/* 5. Action Button */}
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onOpenStoreDrawer(hub)}
                      className="h-8 px-3 text-xs bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-lg text-zinc-900 font-semibold transition-all active:scale-[0.97] cursor-pointer shadow-2xs whitespace-nowrap"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
