"use client";

import React, { useState, useEffect } from "react";
import { Sliders, RotateCcw, X, Cpu, ShieldCheck, Network } from "lucide-react";
import { toast } from "sonner";
import { StoreHub } from "@/lib/types";
import { Badge, Button, SegmentedControl } from "@/components/ui";
import { uploadStoresCsv, SAMPLE_DARKSTORE_CSV } from "@/lib/api";

interface SandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores?: StoreHub[];
  initialTab?: "scenarios" | "architecture";
  onTriggerScenario: (name: string) => void;
  onApplyScenarioMultiplier?: (demandMultiplier: number, delayHours: number) => void;
  onReset: () => void;
  isBackendOnline?: boolean;
}

export function SandboxModal({
  isOpen,
  onClose,
  initialTab = "scenarios",
  onTriggerScenario,
  onApplyScenarioMultiplier,
  onReset,
}: SandboxModalProps) {
  const [userTab, setUserTab] = useState<"scenarios" | "architecture" | null>(null);
  const modalTab = userTab ?? initialTab;
  const [demandMultiplier, setDemandMultiplier] = useState<number>(2.5);
  const [delayHours, setDelayHours] = useState<number>(2);
  const [csvContent, setCsvContent] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUserTab(null);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
      toast.error("CSV Ingestion Failed", { description: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#EAE6DF] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE6DF] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C1917] tracking-tight">
                Simulation Controls &amp; Architecture
              </h2>
              <p className="text-xs text-[#78716C]">
                Configure operational scenarios or review system contracts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SegmentedControl
              items={[
                { id: "scenarios", label: "Scenarios" },
                { id: "architecture", label: "Architecture" },
              ]}
              value={modalTab}
              onChange={(val) => setUserTab(val as "scenarios" | "architecture")}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setUserTab(null);
                onClose();
              }}
              className="h-8 w-8 p-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {modalTab === "scenarios" ? (
          <div className="space-y-5">
            {/* Quick Presets */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                Quick Scenario Drivers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onTriggerScenario("demand_spike");
                    toast.warning("Scenario: Demand Surge (2.5x) activated");
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] hover:bg-white hover:border-[#2563EB] transition-all text-left space-y-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C1917]">Demand Surge</span>
                    <Badge variant="urgent" size="sm">2.5x</Badge>
                  </div>
                  <p className="text-[11px] text-[#78716C] leading-snug">
                    Simulates evening customer surge across Mumbai nodes.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onTriggerScenario("supplier_delay");
                    toast.warning("Scenario: Freight Highway Delay (+4h) activated");
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] hover:bg-white hover:border-[#D97706] transition-all text-left space-y-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C1917]">Supplier Delay</span>
                    <Badge variant="warning" size="sm">+4h</Badge>
                  </div>
                  <p className="text-[11px] text-[#78716C] leading-snug">
                    Adds highway transit delay to Bhiwandi trucks.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    toast.info("Network Reset to 3-Node Equilibrium");
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] hover:bg-white hover:border-emerald-600 transition-all text-left space-y-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C1917]">Reset Run</span>
                    <RotateCcw className="h-3.5 w-3.5 text-[#78716C]" />
                  </div>
                  <p className="text-[11px] text-[#78716C] leading-snug">
                    Restores standard 195-unit Mumbai network baseline.
                  </p>
                </button>
              </div>
            </div>

            {/* Sliders */}
            <div className="p-4 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] space-y-3">
              <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                Parametric Shock Adjuster
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
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
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#1C1917]">Freight Delay</span>
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
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="primary" size="sm" onClick={handleApplyShocks}>
                  Apply Shock Multipliers
                </Button>
              </div>
            </div>

            {/* CSV Replay */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                  Network CSV Replay
                </h3>
                <button
                  type="button"
                  onClick={() => setCsvContent(SAMPLE_DARKSTORE_CSV)}
                  className="text-[11px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                >
                  Load 3-Store Template
                </button>
              </div>

              <textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="Paste CSV rows here..."
                className="w-full h-24 p-2.5 rounded-xl border border-[#EAE6DF] font-mono text-[11px] text-[#1C1917] bg-[#FAF8F5] focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
              />

              <div className="flex justify-end">
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
        ) : (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-semibold text-[#1C1917]">
                  <Cpu className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Deterministic Sizing</span>
                </div>
                <p className="text-[#78716C] leading-relaxed">
                  Computes burn rates from active 10-minute demand orders and safety stock thresholds.
                </p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-semibold text-[#1C1917]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Human Review Gate</span>
                </div>
                <p className="text-[#78716C] leading-relaxed">
                  State machine pauses on lateral reorder until verified human approval is submitted.
                </p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-semibold text-[#1C1917]">
                  <Network className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Mass Conservation</span>
                </div>
                <p className="text-[#78716C] leading-relaxed">
                  FIFO/FEFO batch deduction guarantees strict conservation ($\Delta = 0.00$) between source and destination.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#EAE6DF]">
              <span className="text-[#78716C] font-bold uppercase tracking-wider text-[10px]">
                REST Telemetry Endpoints:
              </span>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-[#44403C]">
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">GET /api/stores</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">GET /api/risks</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">POST /api/recommendations</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">POST /api/agent/run</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">POST /api/shipments/{`{id}`}/confirm-receipt</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">GET /api/outcomes</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
