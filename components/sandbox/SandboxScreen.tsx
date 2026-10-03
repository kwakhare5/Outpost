"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RotateCcw,
  Sliders,
  Truck,
  Upload,
  Zap,
} from "lucide-react";
import { DeckTab, StoreHub } from "@/lib/types";
import { Badge, Button, SegmentedControl } from "@/components/ui";
import {
  CsvRecommendation,
  CsvUploadResult,
  SAMPLE_DARKSTORE_CSV,
  uploadStoresCsv,
} from "@/lib/api";
import { toast } from "sonner";

interface SandboxScreenProps {
  stores: StoreHub[];
  onUpdateStore: (storeId: string, updates: Partial<StoreHub>) => void;
  onApplyScenario?: (name: string) => void;
  onApplyMultiplierShock?: (demandMultiplier: number, delayHours: number) => void;
  onApplyCustomStores?: (stores: StoreHub[], customRecommendation?: CsvRecommendation | null) => void;
  onReset?: () => void;
  onNavigateTab?: (tab: DeckTab) => void;
}

export function SandboxScreen({
  stores,
  onUpdateStore,
  onApplyScenario,
  onApplyMultiplierShock,
  onApplyCustomStores,
  onReset,
  onNavigateTab,
}: SandboxScreenProps) {
  const [activeSubTab, setActiveSubTab] = useState<"sliders" | "csv">("sliders");

  // Rush and Jam sliders
  const [demandMultiplier, setDemandMultiplier] = useState<number>(1);
  const [truckDelayHours, setTruckDelayHours] = useState<number>(0);
  
  // Quick store edit with auto-sync on store select
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || "st-04");
  const initialStore = stores.find((s) => s.id === selectedStoreId) || stores[0];
  const [customUnits, setCustomUnits] = useState<number>(initialStore?.milkUnits ?? 4);
  const [customDemand, setCustomDemand] = useState<number>(initialStore?.activeOrders ?? 18);

  // CSV file upload state
  const [fileName, setFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parsedResult, setParsedResult] = useState<CsvUploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleSelectStore = (id: string) => {
    setSelectedStoreId(id);
    const store = stores.find((s) => s.id === id);
    if (store) {
      setCustomUnits(store.milkUnits);
      setCustomDemand(store.activeOrders);
    }
  };

  // Handle Order Rush slider
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
      toast.warning(`Cricket Match Rush Active: ${val}x customer orders per hour!`);
    } else {
      onReset?.();
    }
  };

  // Handle Highway Traffic Jam slider
  const handleTruckDelayChange = (val: number) => {
    setTruckDelayHours(val);
    if (val > 0) {
      onApplyScenario?.("supplier_delay");
      if (onApplyMultiplierShock) {
        onApplyMultiplierShock(demandMultiplier, val);
      }
      toast.warning(`Highway Truck Delayed: +${val} hours added to warehouse arrival!`);
    } else {
      onReset?.();
    }
  };

  const handleApplySingleStoreChange = () => {
    onUpdateStore(selectedStoreId, {
      milkUnits: Number(customUnits),
      activeOrders: Number(customDemand),
    });
    toast.success(`Updated store stock & orders for selected store`);
  };

  const handleFileDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setErrorMsg("");

    try {
      const text = await file.text();
      const result = await uploadStoresCsv(text);
      setParsedResult(result);
      if (result.success && result.stores.length > 0) {
        toast.success(`Uploaded ${result.totalStores} stores successfully!`);
      }
    } catch {
      setErrorMsg("Failed to parse CSV file. Please use the sample template.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_DARKSTORE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample_mumbai_stores.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info("Sample CSV downloaded");
  };

  const handleApplyParsedNetwork = () => {
    if (!parsedResult || !parsedResult.stores || parsedResult.stores.length === 0) return;
    onApplyCustomStores?.(parsedResult.stores, parsedResult.recommendation);
    toast.success(`Loaded ${parsedResult.stores.length} stores into Outpost!`);
    onNavigateTab?.("alerts");
  };

  const handleResetDefaults = () => {
    setDemandMultiplier(1);
    setTruckDelayHours(0);
    setParsedResult(null);
    setFileName("");
    setErrorMsg("");
    onReset?.();
    toast.info("Sandbox reset to normal operations");
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#EAE6DF] rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#2563EB]/20 flex items-center justify-center shrink-0">
            <Sliders className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#1C1917] tracking-tight">
              What-If Sandbox
            </h1>
            <p className="text-xs text-[#78716C]">
              Simulate high-velocity demand shocks, RFC highway truck delays, or inject custom dark store networks.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetDefaults}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Baseline
          </Button>
        </div>
      </div>

      {/* Segmented Subtab Switcher */}
      <SegmentedControl
        items={[
          { id: "sliders", label: "Rush & Delay Shocks" },
          { id: "csv", label: "Upload Store Network (CSV)" },
        ]}
        value={activeSubTab}
        onChange={setActiveSubTab}
      />

      {/* Subtab 1: Sliders & Quick Adjuster */}
      {activeSubTab === "sliders" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Shocks Container */}
          <div className="space-y-4">
            {/* Slider 1: Cricket Match Rush */}
            <div className="p-4 bg-white rounded-xl border border-[#EAE6DF] shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#1C1917] block">IPL / Cricket Match Order Rush</span>
                    <span className="text-[11px] text-[#78716C]">Scales order velocity across all 5 Mumbai hubs</span>
                  </div>
                </div>
                <Badge variant="warning" className="tabular-nums">
                  {demandMultiplier}x Velocity
                </Badge>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={demandMultiplier}
                onChange={(e) => handleDemandRushChange(parseFloat(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#A8A29E] font-medium">
                <span>Baseline (1x)</span>
                <span>Match Rush (2.5x)</span>
                <span>IPL Peak (5x)</span>
              </div>
            </div>

            {/* Slider 2: Truck Traffic Jam */}
            <div className="p-4 bg-white rounded-xl border border-[#EAE6DF] shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#1C1917] block">Bhiwandi RFC Highway Delay</span>
                    <span className="text-[11px] text-[#78716C]">Delays scheduled regional fulfillment truck</span>
                  </div>
                </div>
                <Badge variant="urgent" className="tabular-nums">
                  +{truckDelayHours}h Delay
                </Badge>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                step="1"
                value={truckDelayHours}
                onChange={(e) => handleTruckDelayChange(parseInt(e.target.value, 10))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#A8A29E] font-medium">
                <span>On-Schedule (+0h)</span>
                <span>Eastern Freeway Jam (+3h)</span>
                <span>Severe Roadblock (+6h)</span>
              </div>
            </div>
          </div>

          {/* Quick Single Store Stock Edit */}
          <div className="p-4 bg-white rounded-xl border border-[#EAE6DF] shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold text-[#1C1917]">
                  Manual Store Inventory Adjuster
                </h2>
                <span className="text-[10px] text-[#78716C]">Real-Time State Override</span>
              </div>
              <p className="text-xs text-[#78716C] mb-4">
                Select a dark store to simulate instant stock depletion or an isolated demand surge.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#78716C] block mb-1">
                    Select Target Dark Store
                  </label>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => handleSelectStore(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-lg text-[#1C1917] font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) — {s.milkUnits} units on shelf
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#78716C] block mb-1">
                      On-Shelf Units (Physical)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="150"
                      value={customUnits}
                      onChange={(e) => setCustomUnits(parseInt(e.target.value, 10) || 0)}
                      placeholder="Units on Shelf"
                      className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-lg text-[#1C1917] font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#78716C] block mb-1">
                      Active Demand (Orders/hr)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={customDemand}
                      onChange={(e) => setCustomDemand(parseInt(e.target.value, 10) || 0)}
                      placeholder="Orders/hour"
                      className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-lg text-[#1C1917] font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="dark"
              size="md"
              onClick={handleApplySingleStoreChange}
              className="w-full"
            >
              Apply Store Numbers to Live State
            </Button>
          </div>
        </div>
      )}

      {/* Subtab 2: CSV Upload */}
      {activeSubTab === "csv" && (
        <div className="p-5 bg-white rounded-xl border border-[#EAE6DF] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAE6DF] pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-bold text-[#1C1917]">Store Network CSV Ingest</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadSample}
              className="text-[#2563EB] hover:text-[#1D4ED8]"
            >
              <Download className="w-3.5 h-3.5" />
              Download Standard Template CSV
            </Button>
          </div>
          <p className="text-xs text-[#78716C]">
            Upload your multi-store dark store topology. Outpost will auto-calculate stockout horizons, safety stock thresholds, and optimal cross-store transfer routes.
          </p>

          <label className="border-2 border-dashed border-[#D6D3D1] hover:border-[#2563EB] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-[#FAF8F5] hover:bg-[#EFF6FF]/30 transition-all">
            <Upload className="w-8 h-8 text-[#A8A29E] mb-2" />
            <span className="text-xs font-semibold text-[#1C1917]">
              {fileName ? fileName : "Click or drag CSV file here"}
            </span>
            <span className="text-[11px] text-[#A8A29E] mt-1">
              Columns: store_id, name, milk_units, active_orders, next_expiry_hours
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileDrop}
              className="hidden"
            />
          </label>

          {isProcessing && (
            <p className="text-xs text-[#2563EB] animate-pulse font-medium text-center">
              Parsing and verifying store network geometry...
            </p>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-700 font-medium text-center bg-rose-50 border border-rose-200 py-2 rounded-lg">
              {errorMsg}
            </p>
          )}

          {parsedResult && parsedResult.success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    Verified {parsedResult.totalStores} Dark Stores in CSV
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    Ready to load topology into Outpost live simulator
                  </span>
                </div>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleApplyParsedNetwork}
                className="bg-emerald-700 hover:bg-emerald-800"
              >
                Load into Outpost
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
