"use client";

import React, { useState } from "react";
import { Clock, Package, Search } from "lucide-react";
import { BatchItem, StoreHub } from "@/lib/types";
import { Badge, SegmentedControl } from "@/components/ui";

interface InventoryScreenProps {
  batches: BatchItem[];
  stores?: StoreHub[];
  selectedStoreCode?: string;
  onSelectStore?: (code: string) => void;
}

export function InventoryScreen({
  batches,
  stores = [],
  selectedStoreCode,
  onSelectStore,
}: InventoryScreenProps) {
  const [internalStore, setInternalStore] = useState<string>("all");
  const selectedStore = selectedStoreCode || internalStore;
  const [searchQuery, setSearchQuery] = useState("");

  const handleSelect = (code: string) => {
    if (onSelectStore) {
      onSelectStore(code === "all" ? "" : code);
    }
    setInternalStore(code);
  };

  const storeOptions = [
    { code: "all", label: "All Mumbai Stores" },
    ...(stores.length > 0
      ? stores.map((s) => ({ code: s.code, label: `${s.name.replace("Dark Store ", "")}` }))
      : [
          { code: "ST-01", label: "Andheri East" },
          { code: "ST-02", label: "Bandra West" },
          { code: "ST-03", label: "Powai Galleria" },
          { code: "ST-04", label: "Lower Parel" },
          { code: "ST-05", label: "Thane West" },
        ]),
  ];

  const filteredBatches = batches.filter((b) => {
    if (selectedStore !== "all" && selectedStore !== "") {
      const matchesStore =
        b.storeCode === selectedStore ||
        b.originCode === selectedStore ||
        b.destCode === selectedStore;
      if (!matchesStore) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
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
      {/* ─────────────────────────────────────────────────────────────────
          1. HEADER & SEARCH
      ───────────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#EAE6DF] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="info">STORE INVENTORY</Badge>
            <span className="text-xs text-[#78716C]">FIRST-IN, FIRST-OUT EXPIRY</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#1C1917] mt-1.5 tracking-tight">
            Store Shelves &amp; Freshness
          </h2>
          <p className="text-xs md:text-sm text-[#78716C] mt-1 max-w-2xl leading-relaxed">
            Every batch of items on store shelves with real expiry timestamps. Older batches are prioritized for fast customer orders so zero stock expires.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 text-[#A8A29E] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search milk, bread, store..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF8F5] border border-[#EAE6DF] rounded-lg text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all shadow-inner"
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          2. STORE FILTER PILLS (Segmented Track)
      ───────────────────────────────────────────────────────────────── */}
      <SegmentedControl
        items={storeOptions.map((opt) => ({
          id: opt.code,
          label: opt.label,
        }))}
        value={selectedStore || "all"}
        onChange={handleSelect}
        className="flex-wrap"
      />

      {/* ─────────────────────────────────────────────────────────────────
          3. WMS BATCH LEDGER TABLE (HIGH-DENSITY ENTERPRISE GRID)
      ───────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#EAE6DF] rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-[#F0ECE4] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#78716C]" />
            <h3 className="text-sm font-bold text-[#1C1917] tracking-tight">
              Stock Batches ({filteredBatches.length} batches found)
            </h3>
          </div>
          <Badge variant="neutral">
            {totalUnits} Total Units on Shelves
          </Badge>
        </div>

        {/* Sleek Linear-Style Inventory Batches Ledger */}
        <div className="divide-y divide-[#EAE6DF]">
          {filteredBatches.map((batch) => {
            const isExpiringSoon = batch.expiresInHours <= 18;
            const isInTransit = batch.state === "in_transit";
            const store = stores.find((s) => s.code === batch.storeCode);
            const storeName = store ? store.name.replace("Dark Store ", "") : batch.storeCode;

            return (
              <div
                key={batch.id}
                className="p-3.5 sm:px-5 flex items-center justify-between gap-4 transition-colors hover:bg-[#FAF8F5] select-none"
              >
                {/* Left Cluster: Batch ID, Store Hub Badge, SKU */}
                <div className="flex items-center gap-2.5 min-w-0 shrink-0">
                  <span className="font-mono text-xs font-bold text-[#1C1917]">
                    #{batch.id}
                  </span>
                  <Badge variant="neutral" className="shrink-0">
                    {storeName}
                  </Badge>
                  <span className="font-bold text-sm text-[#1C1917] truncate">
                    {batch.sku}
                  </span>
                </div>

                {/* Center Cluster: FIFO Priority & Transit Notes (Fluid, truncates cleanly) */}
                <div className="hidden lg:flex items-center gap-2 min-w-0 flex-1 px-2">
                  <Badge
                    variant={batch.fifoPriority === 1 ? "info" : "neutral"}
                    className="shrink-0"
                  >
                    FIFO #{batch.fifoPriority}{batch.fifoPriority === 1 ? " (Sell First)" : ""}
                  </Badge>
                  {batch.transferNote && (
                    <span className="text-[11px] text-[#2563EB] font-medium truncate">
                      {batch.transferNote}
                    </span>
                  )}
                </div>

                {/* Right Cluster: Shelf-life, Units & Condition Badge */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#57534E]">
                    <Clock className="w-3.5 h-3.5 text-[#A8A29E] shrink-0" />
                    <span>~{batch.expiresInHours}h left</span>
                  </div>

                  <span className="font-mono text-sm font-bold text-[#1C1917] tabular-nums">
                    {batch.units} <span className="font-sans font-normal text-xs text-[#78716C]">units</span>
                  </span>

                  <Badge
                    variant={isInTransit ? "info" : isExpiringSoon ? "warning" : "success"}
                  >
                    {isInTransit
                      ? "Moving in Van"
                      : isExpiringSoon
                      ? `Expiring Soon (~${batch.expiresInHours}h)`
                      : "Good & Fresh"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
