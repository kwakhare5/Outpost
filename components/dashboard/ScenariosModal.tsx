"use client";

import React, { useState, useEffect } from "react";
import { Sliders, X, Cpu, ShieldCheck, Network } from "lucide-react";
import { toast } from "sonner";
import { StoreHub } from "@/lib/types";
import { Badge, Button, SegmentedControl } from "@/components/ui";

interface ScenariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores?: StoreHub[];
  initialTab?: "scenarios" | "architecture";
  onTriggerScenario: (name: string) => void;
  onApplyScenarioMultiplier?: (demandMultiplier: number, delayHours: number) => void;
  onReset: () => void;
  isBackendOnline?: boolean;
}

export function ScenariosModal({
  isOpen,
  onClose,
  initialTab = "scenarios",
  onTriggerScenario,
  onApplyScenarioMultiplier,
}: ScenariosModalProps) {
  const [userTab, setUserTab] = useState<"scenarios" | "architecture" | null>(null);
  const modalTab = userTab ?? initialTab;
  const [demandMultiplier, setDemandMultiplier] = useState<number>(2.5);
  const [delayHours, setDelayHours] = useState<number>(2);

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
                Simulation Controls &amp; Scenarios
              </h2>
              <p className="text-xs text-[#78716C]">
                Configure operational scenarios or review system architecture
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
              className="h-8 w-8 p-0 cursor-pointer"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onTriggerScenario("demand_spike");
                    toast.warning("Scenario: Demand Surge (2.5x) activated");
                    onClose();
                  }}
                  className="p-3.5 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] hover:bg-white hover:border-[#2563EB] transition-all text-left space-y-1.5 cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C1917]">Demand Surge</span>
                    <Badge variant="urgent" size="sm">2.5x</Badge>
                  </div>
                  <p className="text-xs text-[#57534E] leading-snug">
                    Simulates evening customer order surge across Mumbai dark stores.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onTriggerScenario("supplier_delay");
                    toast.warning("Scenario: Freight Highway Delay (+4h) activated");
                    onClose();
                  }}
                  className="p-3.5 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] hover:bg-white hover:border-[#D97706] transition-all text-left space-y-1.5 cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C1917]">Supplier Delay</span>
                    <Badge variant="warning" size="sm">+4h</Badge>
                  </div>
                  <p className="text-xs text-[#57534E] leading-snug">
                    Adds highway transit delay to Bhiwandi regional warehouse trucks.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onTriggerScenario("expiry_wave");
                    toast.warning("Scenario: Expiry Wave activated");
                    onClose();
                  }}
                  className="p-3.5 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] hover:bg-white hover:border-[#D97706] transition-all text-left space-y-1.5 cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C1917]">Expiry Wave</span>
                    <Badge variant="warning" size="sm">Perishables</Badge>
                  </div>
                  <p className="text-xs text-[#57534E] leading-snug">
                    Accelerates shelf life decay to trigger markdown and redistribution logic.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onTriggerScenario("stockout_cascade");
                    toast.warning("Scenario: Stockout Cascade activated");
                    onClose();
                  }}
                  className="p-3.5 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] hover:bg-white hover:border-[#DC2626] transition-all text-left space-y-1.5 cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C1917]">Stockout Cascade</span>
                    <Badge variant="urgent" size="sm">Cascade</Badge>
                  </div>
                  <p className="text-xs text-[#57534E] leading-snug">
                    Simulates simultaneous depletion across donor and recipient dark stores.
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
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-semibold text-[#1C1917]">
                  <Cpu className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Deterministic Sizing</span>
                </div>
                <p className="text-[#57534E] leading-relaxed">
                  Computes burn rates from active demand orders and safety stock thresholds.
                </p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-semibold text-[#1C1917]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Human Review Gate</span>
                </div>
                <p className="text-[#57534E] leading-relaxed">
                  State machine pauses on lateral reorder until verified human approval is submitted.
                </p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-semibold text-[#1C1917]">
                  <Network className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Mass Conservation</span>
                </div>
                <p className="text-[#57534E] leading-relaxed">
                  FIFO/FEFO batch deduction guarantees strict conservation ($\Delta = 0.00$) between source and destination.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#EAE6DF]">
              <span className="text-[#57534E] font-bold uppercase tracking-wider text-xs">
                Active REST API Endpoints:
              </span>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs text-[#44403C]">
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">GET /api/simulations/active</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">POST /api/simulations/{`{id}`}/advance</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">POST /api/simulations/{`{id}`}/scenario</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">POST /api/simulations/replay</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">GET /api/simulations/runs/latest</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">GET /api/stores</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">GET /api/stores/{`{id}`}/inventory</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">GET /api/risks</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">GET /api/recommendations</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">POST /api/recommendations/{`{id}`}/approve</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">POST /api/recommendations/{`{id}`}/reject</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">POST /api/agent/execute/{`{id}`}</div>
                <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EAE6DF]">GET /api/shipments</div>
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

// Backward compatibility alias
export const SandboxModal = ScenariosModal;
