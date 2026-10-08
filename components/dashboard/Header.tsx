"use client";

import React, { useState } from "react";
import {
  Clock,
  FastForward,
  RotateCcw,
  Sliders,
} from "lucide-react";
import { DeckTab } from "@/lib/types";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

interface HeaderProps {
  activeTab: DeckTab;
  totalStock: number;
  onSelectSandbox: () => void;
  onAdvanceTime?: () => void;
  onResetDay?: () => void;
  simTime?: string;
  onOpenArchitecture?: () => void;
  isBackendOnline?: boolean;
  shrinkageUnits?: number;
}

export function Header({
  activeTab,
  totalStock,
  onSelectSandbox,
  onAdvanceTime,
  onResetDay,
  simTime = "08:15 AM",
  isBackendOnline = false,
  shrinkageUnits = 0,
}: HeaderProps) {
  const [isAdvancing, setIsAdvancing] = useState(false);

  const handleAdvance = () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    if (onAdvanceTime) {
      onAdvanceTime();
    }
    setTimeout(() => setIsAdvancing(false), 500);
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "queue":
        return {
          title: "Stock Alerts",
          subtitle: "Items needing lateral inventory rebalancing",
        };
      case "inflight":
        return {
          title: "Live Deliveries",
          subtitle: "Vans on the road and loading dock receiving",
        };
      case "outcomes":
        return {
          title: "Past Results",
          subtitle: "How our decisions performed vs doing nothing",
        };
      default:
        return {
          title: "Operations Deck",
          subtitle: "Dark store replenishment command center",
        };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <header className="h-14 border-b border-[#EAE6DF] bg-white px-4 md:px-5 flex items-center justify-between shrink-0 sticky top-0 z-30 select-none">
      {/* Title & Context */}
      <div>
        <h1 className="text-sm font-bold text-[#1C1917] tracking-tight">{title}</h1>
        <p className="text-xs text-[#57534E] leading-none mt-0.5">{subtitle}</p>
      </div>

      {/* Right Controls & Telemetry */}
      <div className="flex items-center gap-2.5">
        {/* Live Engine Status Badge when connected */}
        {isBackendOnline && (
          <div className="hidden xl:block">
            <Badge variant="success" size="sm" dot>
              Live Engine (:8000)
            </Badge>
          </div>
        )}

        {/* Shrinkage Discrepancy Counter (Section 6.8, 9.2) */}
        {shrinkageUnits > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            <span>Shrinkage:</span>
            <span className="font-bold font-mono">{shrinkageUnits}u</span>
          </div>
        )}

        {/* Total Stock Counter */}
        <div className="hidden md:flex items-center gap-2 px-3 h-8 rounded-lg bg-[#FAF8F5] border border-[#EAE6DF] text-xs font-semibold text-[#1C1917]">
          <span className="text-[#57534E]">Network Stock:</span>
          <span className="font-bold text-[#2563EB]">{totalStock} units</span>
        </div>

        {/* Prominent Simulation Time Capsule */}
        <div className="flex items-center bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl p-0.5 shadow-xs">
          {/* Clock Display */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-[#1C1917]">
            <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="font-mono">{simTime}</span>
          </div>

          <div className="h-4 w-px bg-[#EAE6DF] mx-0.5" />

          {/* Advance 1h Button */}
          <button
            type="button"
            onClick={handleAdvance}
            disabled={isAdvancing}
            title="Advance simulation time by +1 hour"
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
              "text-[#2563EB] hover:bg-blue-50 active:scale-95 disabled:opacity-50"
            )}
          >
            <FastForward className={cn("w-3.5 h-3.5", isAdvancing && "translate-x-0.5")} />
            <span>+1h</span>
          </button>

          {/* 1-Click Reset Day Button */}
          {onResetDay && (
            <>
              <div className="h-4 w-px bg-[#EAE6DF] mx-0.5" />
              <button
                type="button"
                onClick={onResetDay}
                title="Reset simulation day to morning 08:15 baseline"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-[#57534E] hover:text-[#1C1917] hover:bg-white active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-[#78716C]" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </>
          )}

          <div className="h-4 w-px bg-[#EAE6DF] mx-0.5" />

          {/* Scenarios Button */}
          <button
            type="button"
            onClick={onSelectSandbox}
            title="Open Scenarios & CSV Ingest"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#1C1917] hover:bg-white active:scale-95 transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[#57534E]" />
            <span className="hidden sm:inline">Scenarios</span>
          </button>
        </div>
      </div>
    </header>
  );
}
