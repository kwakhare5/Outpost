"use client";

import React, { useEffect } from "react";
import { Activity, Cpu, Network, ShieldCheck, X } from "lucide-react";

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
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white border border-zinc-200/90 rounded-2xl shadow-2xl z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-xs">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-zinc-950 font-display">
                  System Architecture & Decision Engine
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-200/70 text-zinc-700 font-bold tabular-nums">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                FastAPI + LangGraph 5-node cyclic replenishment state machine
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

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 bg-zinc-50 border border-zinc-200/70 rounded-xl space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-800">
                <Cpu className="w-3.5 h-3.5 text-zinc-600" />
                <span>Deterministic Sizing</span>
              </div>
              <p className="text-zinc-500 leading-relaxed">
                Calculates burn rates from active 10-minute orders and safety stock thresholds.
              </p>
            </div>

            <div className="p-3.5 bg-zinc-50 border border-zinc-200/70 rounded-xl space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Level-2 Human Gate</span>
              </div>
              <p className="text-zinc-500 leading-relaxed">
                Interruptible graph breakpoint halts execution until human operator issues dispatch approval.
              </p>
            </div>

            <div className="p-3.5 bg-zinc-50 border border-zinc-200/70 rounded-xl space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-800">
                <Network className="w-3.5 h-3.5 text-zinc-600" />
                <span>Mass Conservation</span>
              </div>
              <p className="text-zinc-500 leading-relaxed">
                FIFO batch ledger guarantees strict stock balance (140 units conserved, Net Change: 0).
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-900 text-zinc-300 rounded-xl font-mono text-xs space-y-1.5 shadow-inner">
            <span className="text-zinc-400 font-sans font-semibold block uppercase tracking-wider text-xs">
              Active LangGraph Execution Graph:
            </span>
            <div className="text-zinc-200">
              [Pre-Check] ➔ [Policy Gate] ➔ [Human Sign-Off] ➔ [FIFO Mutation] ➔ [Audit Log]
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">
              Exposed REST Telemetry Endpoints:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md font-medium text-zinc-700">GET /api/health</span>
              <span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md font-medium text-zinc-700">GET /api/stores</span>
              <span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md font-medium text-zinc-700">GET /api/risks</span>
              <span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md font-medium text-zinc-700">POST /api/recommendations</span>
              <span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md font-medium text-zinc-700">POST /api/agent/run</span>
              <span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md font-medium text-zinc-700">POST /api/simulations/scenarios</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
