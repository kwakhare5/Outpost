"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Database, Layers, Search, Truck } from "lucide-react";
import { RFCInboundOrder, TransferRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TransfersTableProps {
  transfers: TransferRecord[];
  rfcOrders?: RFCInboundOrder[];
  searchQuery?: string;
  onCompleteDelivery?: (transferId: string) => void;
}

export function TransfersTable({
  transfers,
  rfcOrders = [
    {
      id: "PO-RFC-MUM-019",
      storeCode: "ST-05",
      storeName: "Thane West",
      units: 30,
      status: "In Transit",
      eta: "ETA 2.5h (Bhiwandi RFC Corridor)",
      sku: "Amul Taaza Whole Milk 1L",
    },
    {
      id: "PO-RFC-MUM-020",
      storeCode: "ST-01",
      storeName: "Andheri East",
      units: 40,
      status: "Staged at RFC",
      eta: "ETA 4.0h (Scheduled Departure)",
      sku: "Amul Taaza Whole Milk 1L",
    },
  ],
  searchQuery = "",
  onCompleteDelivery,
}: TransfersTableProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "staged" | "in_transit" | "completed">("all");
  const [localSearch, setLocalSearch] = useState("");

  const activeSearch = searchQuery || localSearch;

  const filteredTransfers = transfers.filter((t) => {
    if (statusFilter === "staged" && t.status !== "Staged") return false;
    if (statusFilter === "in_transit" && t.status !== "In Transit") return false;
    if (statusFilter === "completed" && t.status !== "Completed") return false;
    if (activeSearch.trim()) {
      const q = activeSearch.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.fromName.toLowerCase().includes(q) ||
        t.toName.toLowerCase().includes(q) ||
        t.vanId.toLowerCase().includes(q) ||
        t.corridor.toLowerCase().includes(q) ||
        (t.batchId && t.batchId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-1.5 bg-zinc-100 p-1 rounded-lg border border-zinc-200/70 text-xs shadow-inner">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1 rounded-md text-xs transition-all cursor-pointer",
              statusFilter === "all"
                ? "bg-white text-zinc-950 font-semibold shadow-xs"
                : "text-zinc-600 hover:text-zinc-950 font-medium"
            )}
          >
            All Runs ({transfers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("staged")}
            className={cn(
              "px-3 py-1 rounded-md text-xs transition-all cursor-pointer",
              statusFilter === "staged"
                ? "bg-white text-zinc-950 font-semibold shadow-xs"
                : "text-zinc-600 hover:text-zinc-950 font-medium"
            )}
          >
            Staged ({transfers.filter((t) => t.status === "Staged").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("in_transit")}
            className={cn(
              "px-3 py-1 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5",
              statusFilter === "in_transit"
                ? "bg-white text-zinc-950 font-semibold shadow-xs"
                : "text-zinc-600 hover:text-zinc-950 font-medium"
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>In Transit ({transfers.filter((t) => t.status === "In Transit").length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("completed")}
            className={cn(
              "px-3 py-1 rounded-md text-xs transition-all cursor-pointer",
              statusFilter === "completed"
                ? "bg-white text-zinc-950 font-semibold shadow-xs"
                : "text-zinc-600 hover:text-zinc-950 font-medium"
            )}
          >
            Completed ({transfers.filter((t) => t.status === "Completed").length})
          </button>
        </div>

        {/* Search */}
        {!searchQuery && (
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Filter route, van ID, batch..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-200/80 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-800 transition-all w-52 shadow-2xs font-sans"
            />
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-zinc-700" />
            <span className="font-semibold text-xs text-zinc-800">
              Inter-Store Lateral Transit Runs
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 font-semibold">
            Mass Conservation: Zero Phantom Drift
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/50 text-zinc-500 border-b border-zinc-100">
              <tr>
                <th className="px-5 py-2.5 font-medium">Transfer Run</th>
                <th className="px-5 py-2.5 font-medium">Logistics Corridor</th>
                <th className="px-5 py-2.5 font-medium">Quantity</th>
                <th className="px-5 py-2.5 font-medium">Assigned Van</th>
                <th className="px-5 py-2.5 font-medium">Status &amp; ETA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-400">
                    No transfer orders match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-zinc-900">
                      {t.id}
                      <span className="block text-zinc-500 font-normal text-xs mt-0.5 font-sans">
                        Amul Taaza Whole Milk 1L
                      </span>
                      {t.batchId && (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200/70 font-mono font-medium">
                          <Layers className="w-3 h-3 text-zinc-500" />
                          <span>Batch: {t.batchId}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
                        <span>{t.fromName}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        <span>{t.toName}</span>
                      </div>
                      <span className="text-zinc-500 text-xs block mt-0.5">
                        Corridor: {t.corridor}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-zinc-900">
                      {t.units} units
                    </td>
                    <td className="px-5 py-3.5 font-mono text-zinc-700">
                      <span className="bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/60 font-semibold">
                        {t.vanId}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1 border w-fit",
                            t.status === "In Transit"
                              ? "bg-amber-50 text-amber-900 border-amber-200"
                              : t.status === "Completed"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-zinc-100 text-zinc-700 border-zinc-200"
                          )}
                        >
                          {t.status === "In Transit" ? (
                            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          )}
                          <span>{t.status}</span>
                        </span>
                        <span className="text-zinc-500 font-mono text-xs">{t.eta}</span>

                        {t.status === "In Transit" && onCompleteDelivery && (
                          <button
                            type="button"
                            onClick={() => onCompleteDelivery(t.id)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer shadow-2xs flex items-center gap-1 w-fit"
                            title="Complete van run and restock destination store shelves"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Delivered &amp; Restock Shelves</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regional RFC Scheduled Pipelines */}
      <div className="bg-white border border-zinc-200/80 rounded-xl p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-zinc-700" />
            <h3 className="font-semibold text-xs text-zinc-900">
              Regional Fulfilment Centre (RFC) Inbound Shipments
            </h3>
          </div>
          <span className="text-xs text-zinc-500 font-mono">Bhiwandi RFC Hub</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rfcOrders.map((rfc) => (
            <div
              key={rfc.id}
              className="p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-200/80 text-xs flex items-center justify-between"
            >
              <div>
                <span className="font-mono font-bold text-zinc-950 block">{rfc.id}</span>
                <p className="text-zinc-600 mt-0.5">
                  Target: <strong>{rfc.storeName} ({rfc.storeCode})</strong> · {rfc.units}u {rfc.sku}
                </p>
                <span className="text-xs text-zinc-500 font-mono block mt-1">{rfc.eta}</span>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-md font-semibold border text-xs",
                    rfc.status.includes("Delay")
                      ? "bg-amber-50 text-amber-900 border-amber-300"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  )}
                >
                  {rfc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
