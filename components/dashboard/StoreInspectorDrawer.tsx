"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Clock, MapPin, Package, Truck, X } from "lucide-react";
import { BatchItem, StoreHub } from "@/lib/types";

interface StoreInspectorDrawerProps {
  store: StoreHub | null;
  onClose: () => void;
  batches: BatchItem[];
  onNavigateFeed?: () => void;
}

export function StoreInspectorDrawer({
  store,
  onClose,
  batches,
  onNavigateFeed,
}: StoreInspectorDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!store) return null;

  const storeBatches = batches.filter((b) => b.storeCode === store.code);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/20 backdrop-blur-2xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <aside className="relative w-96 bg-white h-full border-l border-zinc-200/80 shadow-xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="tabular-nums font-bold text-xs bg-zinc-100 px-2 py-0.5 rounded-md text-zinc-800 border border-zinc-200/60">
              {store.code}
            </span>
            <h2 className="font-bold text-sm text-zinc-950 font-display">{store.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all active:scale-[0.95] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Status & Locality */}
          <div className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-medium">Store Status:</span>
              <span
                className={`px-2.5 py-0.5 rounded-md font-semibold border ${
                  store.statusType === "critical"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : store.statusType === "surplus"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {store.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-600">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>{store.locality}, Mumbai</span>
            </div>
          </div>

          {/* Critical Restock Banner */}
          {store.statusType === "critical" && onNavigateFeed && (
            <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-bold text-amber-950 text-xs">Stockout Warning · Action Required</span>
              </div>
              <p className="text-amber-900 text-xs leading-relaxed">
                Buffer under 5 hours. An emergency replenishment transfer from Bandra West (ST-02) is ready for manager approval.
              </p>
              <button
                type="button"
                onClick={() => {
                  onNavigateFeed();
                  onClose();
                }}
                className="w-full py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer shadow-xs"
              >
                Review Restock on Live Feed
              </button>
            </div>
          )}

          {/* Volumetric Gauge */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500 font-medium">Amul Taaza (1L) Stock:</span>
              <span className="tabular-nums font-bold text-zinc-950">
                {store.milkUnits} / {store.capacity} packets
              </span>
            </div>
            <div className="w-full h-2.5 bg-zinc-100 rounded-full p-0.5 overflow-hidden border border-zinc-200/50">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  store.statusType === "critical"
                    ? "bg-red-500"
                    : store.statusType === "surplus"
                    ? "bg-blue-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, (store.milkUnits / store.capacity) * 100)}%` }}
              />
            </div>
          </div>

          {/* Operational Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 border border-zinc-200/80 rounded-xl bg-white shadow-2xs">
              <span className="text-zinc-400 block text-xs">Active Orders</span>
              <span className="text-base font-bold text-zinc-900 font-display mt-0.5 block tabular-nums">
                {store.activeOrders} orders
              </span>
            </div>
            <div className="p-3 border border-zinc-200/80 rounded-xl bg-white shadow-2xs">
              <span className="text-zinc-400 block text-xs">Shelf Life</span>
              <span className="text-base font-bold text-zinc-900 font-display mt-0.5 block tabular-nums">
                {store.nextExpiryHours}h left
              </span>
            </div>
          </div>

          {/* FIFO Batch Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700 uppercase tracking-wider">
                Store Batches (FIFO Order)
              </span>
              <span className="tabular-nums text-zinc-400">{storeBatches.length} batches</span>
            </div>

            {storeBatches.length > 0 ? (
              <div className="space-y-2">
                {storeBatches.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 border border-zinc-200/80 rounded-xl bg-white space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="tabular-nums font-bold text-zinc-900">{b.id}</span>
                      {b.state === "in_transit" ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 tabular-nums font-semibold text-xs border border-amber-300 flex items-center gap-1">
                          <Truck className="w-3 h-3 text-amber-600 animate-spin" />
                          <span>In Transit</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 tabular-nums font-semibold text-xs border border-zinc-200/60">
                          Priority #{b.fifoPriority}
                        </span>
                      )}
                    </div>
                    <div className="text-zinc-600 font-sans">{b.sku}</div>
                    {b.transferNote && (
                      <p className="text-xs text-amber-800 bg-amber-50/70 px-2 py-1 rounded-md border border-amber-200/60 font-medium">
                        {b.transferNote}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-zinc-500 pt-1 border-t border-zinc-100">
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3 text-zinc-400" />
                        <span className="tabular-nums font-bold text-zinc-900">{b.units} units</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-700 font-medium">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span className="tabular-nums">{b.expiresInHours}h left</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-400 italic">No physical batches staged for this store.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
