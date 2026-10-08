"use client";

import React, { useEffect } from "react";
import { Activity, Cpu, Network, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui";

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArchitectureModal({ isOpen, onClose }: ArchitectureModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white border border-[#EAE6DF] rounded-2xl shadow-xl z-10 overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EAE6DF] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-xs">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1C1917]">
                System Architecture &amp; Decision Engine
              </h3>
              <p className="text-xs text-[#78716C] font-medium">
                FastAPI + LangGraph cyclic replenishment state machine
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

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
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
              REST Telemetry API:
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
      </div>
    </div>
  );
}
