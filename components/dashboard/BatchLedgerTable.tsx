"use client";

import React, { useState } from "react";
import { ArrowRight, Clock, Layers, Search, Truck } from "lucide-react";
import { BatchItem, StoreHub } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BatchLedgerTableProps {
  batches: BatchItem[];
  stores?: StoreHub[];
  searchQuery?: string;
}

export function BatchLedgerTable({
  batches,
  stores = [],
  searchQuery = "",
}: BatchLedgerTableProps) {
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [localSearch, setLocalSearch] = useState("");

  const activeSearch = searchQuery || localSearch;

  const storeOptions = [
    { code: "all", label: "All Stores" },
    ...(stores.length > 0
      ? stores.map((s) => ({ code: s.code, label: `${s.code} · ${s.name}` }))
      : [
          { code: "ST-04", label: "ST-04 · Lower Parel" },
          { code: "ST-02", label: "ST-02 · Bandra West" },
          { code: "ST-01", label: "ST-01 · Andheri East" },
          { code: "ST-03", label: "ST-03 · Powai" },
          { code: "ST-05", label: "ST-05 · Thane West" },
        ]),
  ];

  const filteredBatches = batches.filter((b) => {
    if (selectedStore !== "all") {
      const matchesStore = b.storeCode === selectedStore || b.originCode === selectedStore || b.destCode === selectedStore;
      if (!matchesStore) return false;
    }
    if (activeSearch.trim()) {
      const q = activeSearch.toLowerCase();
      return (
        b.id.toLowerCase().includes(q) ||
        b.sku.toLowerCase().includes(q) ||
        b.storeCode.toLowerCase().includes(q) ||
        (b.transferNote && b.transferNote.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalUnits = filteredBatches.reduce((sum, b) => sum + b.units, 0);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-1.5 bg-zinc-100 p-1 rounded-lg border border-zinc-200/70 text-xs shadow-inner">
          {storeOptions.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => setSelectedStore(opt.code)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer font-mono",
                selectedStore === opt.code
                  ? "bg-white text-zinc-950 font-bold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-950 font-medium"
              )}
            >
              {opt.code === "all" ? "All Stores" : opt.code}
            </button>
          ))}
        </div>

        {/* Search */}
        {!searchQuery && (
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search batch ID, SKU..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-200/80 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-800 transition-all w-48 shadow-2xs font-sans"
            />
          </div>
        )}
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/70 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-600" />
            <span className="font-semibold text-zinc-800">
              Active Discrete Batches ({filteredBatches.length} lots)
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-zinc-600">
            <span>Filtered Total:</span>
            <span className="font-bold text-zinc-950">{totalUnits} units</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/50 text-zinc-500 border-b border-zinc-100">
              <tr>
                <th className="px-5 py-2.5 font-medium">Batch ID</th>
                <th className="px-5 py-2.5 font-medium">Store Location</th>
                <th className="px-5 py-2.5 font-medium">Product SKU</th>
                <th className="px-5 py-2.5 font-medium">Quantity</th>
                <th className="px-5 py-2.5 font-medium">Inbound Receipt</th>
                <th className="px-5 py-2.5 font-medium">Shelf Expiry</th>
                <th className="px-5 py-2.5 font-medium">FIFO Pick Queue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-zinc-400">
                    No discrete batches found for this filter.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-zinc-900">
                      {b.id}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-zinc-700">
                      {b.state === "in_transit" ? (
                        <div className="flex items-center gap-1 text-xs">
                          <span className="bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                            {b.originCode || "ST-02"}
                          </span>
                          <ArrowRight className="w-3 h-3 text-zinc-400" />
                          <span className="bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                            {b.destCode || b.storeCode}
                          </span>
                        </div>
                      ) : (
                        <span className="bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/60">
                          {b.storeCode}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-sans text-zinc-800 font-medium">
                      {b.sku}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-zinc-900">
                      {b.units} units
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 font-mono">
                      {b.receivedTime}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 font-semibold">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>{b.expiresInHours}h left</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {b.state === "in_transit" ? (
                        <div className="space-y-1">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-blue-50 text-blue-900 border border-blue-300 inline-flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-blue-700 animate-spin" />
                            <span>In Transit · {b.vanId || "Van #MH-02"}</span>
                          </span>
                          {b.transferNote && (
                            <p className="text-xs text-blue-700 font-sans truncate max-w-xs block">
                              {b.transferNote}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold border",
                            b.fifoPriority === 1
                              ? "bg-amber-50 text-amber-900 border-amber-300/70"
                              : "bg-zinc-100 text-zinc-700 border-zinc-200/80"
                          )}
                        >
                          Priority #{b.fifoPriority} ({b.fifoPriority === 1 ? "Next Out" : "Standby"})
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
