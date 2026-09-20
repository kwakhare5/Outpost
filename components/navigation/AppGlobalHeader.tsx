"use client";

import React from "react";
import { Sparkles, Activity, ShieldCheck, Boxes } from "lucide-react";

interface AppGlobalHeaderProps {
  criticalRiskCount?: number;
  isLiveApiConnected?: boolean;
  onDemoMode?: () => void;
  activeScenarioName?: string;
}

export function AppGlobalHeader({
  criticalRiskCount = 0,
  isLiveApiConnected = false,
  onDemoMode,
  activeScenarioName,
}: AppGlobalHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity & Telemetry */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <Boxes className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-zinc-950 tracking-tight text-base font-sans leading-tight">
                Outpost
              </span>
              <span className="text-[10px] font-mono text-zinc-500 font-medium uppercase tracking-wider">
                Autonomous Mumbai Fleet Deck
              </span>
            </div>
          </div>

          {/* Live Telemetry Pill */}
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-zinc-200">
            <span
              className={`w-2 h-2 rounded-full ${
                criticalRiskCount > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
              }`}
            />
            <span className="text-[11px] font-mono text-zinc-600 font-medium">
              {criticalRiskCount > 0 ? `${criticalRiskCount} Stockout Risks` : "5 Stores Nominal"}
            </span>
            {isLiveApiConnected ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
                <Activity className="w-2.5 h-2.5" /> LIVE API :8000
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                IN-MEMORY SIM
              </span>
            )}
          </div>
        </div>

        {/* Right: Autonomy Level + Quick Demo */}
        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>LEVEL-2 AUTONOMY</span>
          </div>

          {activeScenarioName && (
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50/60 border border-blue-200/80 text-blue-900 text-xs font-mono">
              <span className="text-blue-500">SCENARIO:</span>
              <span className="font-semibold">{activeScenarioName}</span>
            </div>
          )}

          {onDemoMode && (
            <button
              type="button"
              onClick={onDemoMode}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 border border-blue-600 text-white transition-all cursor-pointer active:scale-97 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Run Benchmark Demo</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
