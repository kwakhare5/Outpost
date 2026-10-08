"use client";

import React, { useState } from "react";
import { Sliders, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { StoreHub } from "@/lib/types";
import { Badge, Button } from "@/components/ui";
import { uploadStoresCsv, SAMPLE_DARKSTORE_CSV } from "@/lib/api";

interface SandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores?: StoreHub[];
  onTriggerScenario: (name: string) => void;
  onApplyScenarioMultiplier?: (demandMultiplier: number, delayHours: number) => void;
  onReset: () => void;
  isBackendOnline?: boolean;
}

export function SandboxModal({
  isOpen,
  onClose,
  onTriggerScenario,
  onApplyScenarioMultiplier,
  onReset,
}: SandboxModalProps) {
  const [demandMultiplier, setDemandMultiplier] = useState<number>(2.5);
  const [delayHours, setDelayHours] = useState<number>(2);
  const [csvContent, setCsvContent] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleApplyShocks = () => {
    if (onApplyScenarioMultiplier) {
      onApplyScenarioMultiplier(demandMultiplier, delayHours);
    }
    toast.warning("Scenario Shocks Applied", {
      description: `Demand Multiplier: ${demandMultiplier}x | Supplier Delay: +${delayHours}h`,
    });
    onClose();
  };

  const handleCsvUpload = async () => {
    if (!csvContent.trim()) {
      toast.error("Please paste CSV data or load template first.");
      return;
    }
    setIsUploading(true);
    const res = await uploadStoresCsv(csvContent);
    setIsUploading(false);
    if (res.success) {
      toast.success(res.message);
      onClose();
    } else {
      toast.error("CSV Ingestion Failed", {
        description: res.message,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#EAE6DF] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE6DF] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C1917] tracking-tight">
                Simulation Scenarios &amp; Data Ingestion
              </h2>
              <p className="text-xs text-[#78716C]">
                Inject exogenous shocks or upload dark store network CSVs (Spec Section 12 &amp; 13)
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Preset Shocks */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
            Quick Scenario Drivers
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => {
                onTriggerScenario("demand_spike");
                toast.warning("Scenario: IPL Evening Rush Activated (2.5x demand)");
                onClose();
              }}
              className="p-3 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] hover:bg-white hover:border-[#2563EB] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-all text-left space-y-1 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1C1917]">Demand Surge</span>
                <Badge variant="urgent">2.5x</Badge>
              </div>
              <p className="text-[11px] text-[#78716C] leading-snug">
                Simulates cricket match evening surge across Mumbai nodes.
              </p>
            </button>

            <button
              onClick={() => {
                onTriggerScenario("supplier_delay");
                toast.warning("Scenario: Bhiwandi Freight Highway Delay (+4h)");
                onClose();
              }}
              className="p-3 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] hover:bg-white hover:border-[#F59E0B] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-all text-left space-y-1 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1C1917]">Supplier Delay</span>
                <Badge variant="warning">+4h</Badge>
              </div>
              <p className="text-[11px] text-[#78716C] leading-snug">
                Adds transit congestion to Bhiwandi regional trucks.
              </p>
            </button>

            <button
              onClick={() => {
                onReset();
                toast.info("Network Reset to 3-Node Seed Equilibrium");
                onClose();
              }}
              className="p-3 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] hover:bg-white hover:border-[#10B981] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-all text-left space-y-1 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1C1917]">Reset Run</span>
                <RotateCcw className="h-3.5 w-3.5 text-[#78716C]" />
              </div>
              <p className="text-[11px] text-[#78716C] leading-snug">
                Restores standard 195-unit Mumbai network equilibrium.
              </p>
            </button>
          </div>
        </div>

        {/* Sliders */}
        <div className="p-4 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] space-y-4">
          <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
            Parametric Shock Adjuster
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-[#1C1917]">Demand Multiplier</span>
                <span className="font-mono font-bold text-[#2563EB]">{demandMultiplier}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="4.0"
                step="0.5"
                value={demandMultiplier}
                onChange={(e) => setDemandMultiplier(parseFloat(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
              <span className="text-[11px] text-[#78716C]">Scales Poisson customer orders</span>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-[#1C1917]">Inbound Freight Delay</span>
                <span className="font-mono font-bold text-[#D97706]">+{delayHours}h</span>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                step="1"
                value={delayHours}
                onChange={(e) => setDelayHours(parseInt(e.target.value, 10))}
                className="w-full accent-[#D97706] cursor-pointer"
              />
              <span className="text-[11px] text-[#78716C]">Pushes supplier ETA horizons</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={handleApplyShocks}>
              Apply Shock Multipliers
            </Button>
          </div>
        </div>

        {/* CSV Ingestion */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
              Network CSV Replay (Spec Section 13)
            </h3>
            <button
              onClick={() => setCsvContent(SAMPLE_DARKSTORE_CSV)}
              className="text-[11px] font-semibold text-[#2563EB] hover:underline"
            >
              Load 3-Store Template
            </button>
          </div>

          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="Paste CSV text here..."
            className="w-full h-28 p-2.5 rounded-xl border border-[#EAE6DF] font-mono text-[11px] text-[#1C1917] bg-[#FAF8F5] focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#78716C]">
              Requires active backend engine (:8000) for transaction replay.
            </span>
            <Button
              variant="dark"
              size="sm"
              onClick={handleCsvUpload}
              disabled={isUploading || !csvContent.trim()}
            >
              {isUploading ? "Uploading..." : "Replay Network CSV"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
