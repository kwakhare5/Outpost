"use client";

import React, { useEffect } from "react";
import { Activity, Cpu, Network, ShieldCheck, X } from "lucide-react";
import { Badge, Button } from "@/components/ui";

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
      <div className="relative w-full max-w-2xl bg-white border border-[#EAE6DF] rounded-2xl shadow-xl z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EAE6DF] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-xs">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#1C1917]">
                  System Architecture & Decision Engine
                </h3>
                <Badge variant="neutral">
                  v2.0
                </Badge>
              </div>
              <p className="text-xs text-[#78716C] font-medium">
                FastAPI + LangGraph 5-node cyclic replenishment state machine
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1.5"
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
                Calculates burn rates from active 10-minute orders and safety stock thresholds.
              </p>
            </div>

            <div className="p-3.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-semibold text-[#1C1917]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Level-2 Human Gate</span>
              </div>
              <p className="text-[#78716C] leading-relaxed">
                Interruptible graph breakpoint halts execution until human operator issues dispatch approval.
              </p>
            </div>

            <div className="p-3.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-semibold text-[#1C1917]">
                <Network className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Mass Conservation</span>
              </div>
              <p className="text-[#78716C] leading-relaxed">
                FIFO batch ledger guarantees strict stock balance (140 units conserved, Net Change: 0).
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-[#1C1917] text-[#FAF8F5] rounded-xl font-mono text-xs space-y-1.5 shadow-inner">
            <span className="text-[#A8A29E] font-sans font-semibold block uppercase tracking-wider text-[11px]">
              Active LangGraph Execution Graph:
            </span>
            <div className="text-white">
              [Pre-Check] ➔ [Policy Gate] ➔ [Human Sign-Off] ➔ [FIFO Mutation] ➔ [Audit Log]
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[#78716C] font-bold uppercase tracking-wider text-[11px]">
              Exposed REST Telemetry Endpoints:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <span className="bg-[#FAF8F5] border border-[#EAE6DF] px-2 py-0.5 rounded-md font-mono text-[11px] text-[#44403C]">GET /api/health</span>
              <span className="bg-[#FAF8F5] border border-[#EAE6DF] px-2 py-0.5 rounded-md font-mono text-[11px] text-[#44403C]">GET /api/stores</span>
              <span className="bg-[#FAF8F5] border border-[#EAE6DF] px-2 py-0.5 rounded-md font-mono text-[11px] text-[#44403C]">GET /api/risks</span>
              <span className="bg-[#FAF8F5] border border-[#EAE6DF] px-2 py-0.5 rounded-md font-mono text-[11px] text-[#44403C]">POST /api/recommendations</span>
              <span className="bg-[#FAF8F5] border border-[#EAE6DF] px-2 py-0.5 rounded-md font-mono text-[11px] text-[#44403C]">POST /api/agent/run</span>
              <span className="bg-[#FAF8F5] border border-[#EAE6DF] px-2 py-0.5 rounded-md font-mono text-[11px] text-[#44403C]">POST /api/shipments/{`{id}`}/confirm-receipt</span>
              <span className="bg-[#FAF8F5] border border-[#EAE6DF] px-2 py-0.5 rounded-md font-mono text-[11px] text-[#44403C]">GET /api/outcomes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
