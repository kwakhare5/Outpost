"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FlaskConical,
  RefreshCw,
  Truck,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { StoreHub } from "@/lib/types";
import {
  CsvRecommendation,
  CsvUploadResult,
  SAMPLE_DARKSTORE_CSV,
  uploadStoresCsv,
} from "@/lib/api";
import { toast } from "sonner";

interface TestLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: StoreHub[];
  onUpdateStore: (storeId: string, updates: Partial<StoreHub>) => void;
  onApplyScenario?: (name: string) => void;
  onApplyMultiplierShock?: (demandMultiplier: number, delayHours: number) => void;
  onApplyCustomStores?: (stores: StoreHub[], customRecommendation?: CsvRecommendation | null) => void;
  onReset?: () => void;
}

export function TestLabModal({
  isOpen,
  onClose,
  stores,
  onUpdateStore,
  onApplyScenario,
  onApplyMultiplierShock,
  onApplyCustomStores,
  onReset,
}: TestLabModalProps) {
  const [activeTab, setActiveTab] = useState<"shocks" | "csv">("shocks");

  // Shocks State
  const [demandMultiplier, setDemandMultiplier] = useState<number>(1);
  const [truckDelayHours, setTruckDelayHours] = useState<number>(0);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("st-04");
  const [customUnits, setCustomUnits] = useState<number>(4);
  const [customDemand, setCustomDemand] = useState<number>(18);

  // CSV Ingest State
  const [fileName, setFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parsedResult, setParsedResult] = useState<CsvUploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle Demand Rush slider
  const handleDemandRushChange = (val: number) => {
    setDemandMultiplier(val);
    if (val > 1) {
      onApplyScenario?.("demand_spike");
      if (onApplyMultiplierShock) {
        onApplyMultiplierShock(val, truckDelayHours);
      } else {
        stores.forEach((st) => {
          onUpdateStore(st.id, {
            activeOrders: Math.round(st.activeOrders * (val / 1.5)),
          });
        });
      }
      toast.warning(`IPL Demand Rush Active: ${val}x order velocity applied`);
    } else {
      onReset?.();
    }
  };

  // Handle Truck Delay slider
  const handleTruckDelayChange = (val: number) => {
    setTruckDelayHours(val);
    if (val > 0) {
      onApplyScenario?.("supplier_delay");
      if (onApplyMultiplierShock) {
        onApplyMultiplierShock(demandMultiplier, val);
      }
      toast.warning(`Regional Truck Delayed: +${val} hours added to Bhiwandi RFC ETA`);
    }
  };

  // Handle Custom Store Injection
  const handleApplyCustomStock = (e: React.FormEvent) => {
    e.preventDefault();
    const st = stores.find((s) => s.id === selectedStoreId);
    if (!st) return;

    const burnRatePerHour = Math.max(1, customDemand / 4);
    const hoursRemaining = Number((customUnits / burnRatePerHour).toFixed(1));
    const isCritical = hoursRemaining < 5.0;

    onUpdateStore(selectedStoreId, {
      milkUnits: customUnits,
      activeOrders: customDemand,
      status: isCritical ? `Critical (${hoursRemaining}h buffer)` : `Normal (${hoursRemaining}h buffer)`,
      statusType: isCritical ? "critical" : customUnits > 35 ? "surplus" : "normal",
    });

    toast.success(`Updated ${st.name}: ${customUnits} units (${hoursRemaining}h stockout horizon)`);
  };

  // Handle File Input for CSV Ingest
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg("");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      await processCsv(content);
    };
    reader.readAsText(file);
  };

  const processCsv = async (content: string) => {
    if (!content.trim()) return;
    setIsProcessing(true);
    setErrorMsg("");
    try {
      const res = await uploadStoresCsv(content);
      if (res.success && res.stores.length > 0) {
        setParsedResult(res);
        toast.success(res.message);
      } else {
        setErrorMsg("Failed to parse dark stores from CSV.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid CSV format.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyCsvStores = () => {
    if (!parsedResult || parsedResult.stores.length === 0) return;
    onApplyCustomStores?.(parsedResult.stores, parsedResult.recommendation);
    toast.success(`Imported ${parsedResult.totalStores} dark stores (${parsedResult.totalStock} units)`, {
      description: "Live operations deck updated with imported store network.",
    });
    onClose();
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_DARKSTORE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "outpost_sample_darkstores.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded outpost_sample_darkstores.csv template");
  };

  const handleExportCsv = () => {
    const headers = "Store_Code,Store_Name,Locality,Milk_Packets,Capacity,Active_Orders,Shelf_Life_Hours,Status\n";
    const rows = stores
      .map(
        (s) =>
          `"${s.code}","${s.name}","${s.locality}",${s.milkUnits},${s.capacity},${s.activeOrders},${s.nextExpiryHours},"${s.status}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `outpost_mumbai_darkstores_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded outpost_mumbai_darkstores.csv");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white border border-zinc-200/90 rounded-2xl shadow-2xl z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-xs">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-950 font-display">
                Operations Test Lab
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                Stress-test real demand shocks, supplier delays, or import custom dark store data
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 border-b border-zinc-100 flex items-center gap-2 bg-zinc-50/30">
          <button
            type="button"
            onClick={() => setActiveTab("shocks")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "shocks"
                ? "border-zinc-900 text-zinc-950"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Demand Shocks &amp; Overrides</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("csv")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "csv"
                ? "border-zinc-900 text-zinc-950"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Custom Dark Store CSV (Ingest &amp; Export)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-xs max-h-[70vh] overflow-y-auto">
          {/* TAB 1: STRESS SHOCKS & OVERRIDES */}
          {activeTab === "shocks" && (
            <div className="space-y-6">
              {/* Section 1: Demand & Lead-Time Shocks */}
              <div className="space-y-4">
                <span className="text-zinc-400 font-semibold uppercase tracking-wider block text-xs">
                  1. Operational Shocks (Simulate Real Disruption)
                </span>

                {/* Shock A: IPL Demand Rush */}
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-zinc-900">IPL Demand Rush</span>
                    </div>
                    <span className="font-bold text-zinc-900 tabular-nums px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-xs">
                      {demandMultiplier}x Order Velocity
                    </span>
                  </div>
                  <p className="text-zinc-500 leading-relaxed text-xs">
                    Scales active order velocity across all Mumbai stores (e.g. India-Pakistan cricket match surge).
                  </p>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={demandMultiplier}
                    onChange={(e) => handleDemandRushChange(Number(e.target.value))}
                    className="w-full accent-zinc-900 cursor-pointer"
                  />
                </div>

                {/* Shock B: Highway Truck Delay */}
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-500" />
                      <span className="font-bold text-zinc-900">Highway Supply Truck Delay</span>
                    </div>
                    <span className="font-bold text-zinc-900 tabular-nums px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-xs">
                      +{truckDelayHours} Hours Delay
                    </span>
                  </div>
                  <p className="text-zinc-500 leading-relaxed text-xs">
                    Simulates Bhiwandi highway congestion delaying inbound trucks from the Regional Fulfilment Centre.
                  </p>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="1"
                    value={truckDelayHours}
                    onChange={(e) => handleTruckDelayChange(Number(e.target.value))}
                    className="w-full accent-zinc-900 cursor-pointer"
                  />
                </div>
              </div>

              {/* Section 2: Custom Store Number Inputs */}
              <form onSubmit={handleApplyCustomStock} className="space-y-3 pt-2 border-t border-zinc-100">
                <span className="text-zinc-400 font-semibold uppercase tracking-wider block text-xs">
                  2. Single Store Stock Overrides
                </span>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-3">
                  <div>
                    <label className="text-zinc-600 block mb-1 font-medium">Select Dark Store:</label>
                    <select
                      value={selectedStoreId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedStoreId(id);
                        const s = stores.find((st) => st.id === id);
                        if (s) {
                          setCustomUnits(s.milkUnits);
                          setCustomDemand(s.activeOrders);
                        }
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-zinc-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    >
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} · {s.name} ({s.milkUnits} units)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-600 block mb-1 font-medium">On-Hand Stock (Units):</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={customUnits}
                        onChange={(e) => setCustomUnits(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-zinc-900 text-xs font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>

                    <div>
                      <label className="text-zinc-600 block mb-1 font-medium">Active Order Demand:</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={customDemand}
                        onChange={(e) => setCustomDemand(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-zinc-900 text-xs font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer shadow-xs"
                  >
                    Apply Store Overrides
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: CSV INGEST & EXPORT */}
          {activeTab === "csv" && (
            <div className="space-y-5">
              {/* Actions Row */}
              <div className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200/70 rounded-xl">
                <div>
                  <span className="font-bold text-zinc-900 block text-xs">Standard CSV Format</span>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    Columns: <code>store_code, store_name, locality, milk_units, capacity, active_orders</code>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Current</span>
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="p-6 border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-xl bg-zinc-50/50 flex flex-col items-center justify-center text-center transition-colors">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="testlab-csv-file-upload"
                />
                <label
                  htmlFor="testlab-csv-file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900 text-xs">
                      {fileName ? fileName : "Click to select or drop CSV file"}
                    </span>
                    <p className="text-zinc-500 text-xs mt-0.5">Supports 3 to 10 dark store locations</p>
                  </div>
                </label>
              </div>

              {/* Parsing status / error */}
              {isProcessing && (
                <div className="p-3 bg-zinc-100 rounded-lg text-center text-zinc-600 animate-pulse text-xs">
                  Parsing dark store metrics and calculating stockout horizons...
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Parsed Result Preview */}
              {parsedResult && (
                <div className="space-y-4 pt-2 border-t border-zinc-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-zinc-900 text-xs">Parsed Store Network Preview</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md">
                      {parsedResult.totalStores} Stores · {parsedResult.totalStock} Total Units
                    </span>
                  </div>

                  {/* Table of Parsed Stores */}
                  <div className="border border-zinc-200/80 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 text-zinc-500 font-semibold border-b border-zinc-200/60 sticky top-0">
                        <tr>
                          <th className="px-3 py-1.5">Code</th>
                          <th className="px-3 py-1.5">Store Name</th>
                          <th className="px-3 py-1.5">Units / Cap</th>
                          <th className="px-3 py-1.5">Demand</th>
                          <th className="px-3 py-1.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {parsedResult.stores.map((st) => (
                          <tr key={st.id} className="hover:bg-zinc-50">
                            <td className="px-3 py-1.5 font-bold text-zinc-900">{st.code}</td>
                            <td className="px-3 py-1.5 text-zinc-700">{st.name}</td>
                            <td className="px-3 py-1.5 tabular-nums">
                              {st.milkUnits} / {st.capacity}
                            </td>
                            <td className="px-3 py-1.5 tabular-nums text-zinc-600">{st.activeOrders}</td>
                            <td className="px-3 py-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-md font-semibold text-xs border ${
                                  st.statusType === "critical"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : st.statusType === "surplus"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {st.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Rebalancing Proposal Notice */}
                  {parsedResult.recommendation ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-lg text-emerald-900 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Calculated Rebalance Transfer:</span>
                      </div>
                      <p className="text-emerald-800 leading-relaxed text-xs">
                        Move <strong>{parsedResult.recommendation.transferUnits} units</strong> from{" "}
                        <strong>{parsedResult.recommendation.sourceStoreName}</strong> to{" "}
                        <strong>{parsedResult.recommendation.destStoreName}</strong> via{" "}
                        {parsedResult.recommendation.corridor}.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 text-xs">
                      Network is in stable equilibrium. No emergency lateral transfer required.
                    </div>
                  )}

                  {/* Primary Apply Button */}
                  <button
                    type="button"
                    onClick={handleApplyCsvStores}
                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>Apply Imported Network to Live Dashboard</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50/60 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setDemandMultiplier(1);
              setTruckDelayHours(0);
              onReset?.();
              toast.info("Test Lab reset: Restored 140-unit nominal network equilibrium");
            }}
            className="text-zinc-600 hover:text-zinc-950 font-medium flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset All Shocks</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
