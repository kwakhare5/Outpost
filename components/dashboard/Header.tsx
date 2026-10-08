"use client";

import React, { useState } from "react";
import {
  RotateCw,
  Sliders,
  Layers,
} from "lucide-react";
import { DeckTab } from "@/lib/types";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface HeaderProps {
  activeTab: DeckTab;
  totalStock: number;
  onOpenArchitecture: () => void;
  onSelectSandbox: () => void;
  onAdvanceTime?: () => void;
}

export function Header({
  activeTab,
  totalStock,
  onOpenArchitecture,
  onSelectSandbox,
  onAdvanceTime,
}: HeaderProps) {
  const [isAdvancing, setIsAdvancing] = useState(false);

  const handleAdvance = () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    if (onAdvanceTime) {
      onAdvanceTime();
    }
    setTimeout(() => setIsAdvancing(false), 600);
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "queue":
        return {
          title: "Exception Review Queue",
          subtitle: "Human verification gate for lateral inventory rebalancing",
        };
      case "inflight":
        return {
          title: "Fleet In-Flight Movements",
          subtitle: "Active inter-store transfers and back-door dock count confirmation",
        };
      case "outcomes":
        return {
          title: "Measured Outcomes & Error",
          subtitle: "Audited decisions benchmarked against counterfactual baselines",
        };
      default:
        return {
          title: "Operations Console",
          subtitle: "Dark store replenishment command deck",
        };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <header className="h-14 border-b border-[#EAE6DF] bg-white px-4 md:px-5 flex items-center justify-between shrink-0 sticky top-0 z-30 select-none">
      {/* Title & Context */}
      <div>
        <h1 className="text-sm font-bold text-[#1C1917] tracking-tight">{title}</h1>
        <p className="text-[11px] text-[#78716C] leading-none mt-0.5">{subtitle}</p>
      </div>

      {/* Right Controls & Telemetry */}
      <div className="flex items-center gap-2.5">
        {/* Total Stock Counter */}
        <div className="hidden sm:flex items-center gap-2 px-3 h-8 rounded-lg bg-[#FAF8F5] border border-[#EAE6DF] text-xs font-semibold text-[#1C1917]">
          <span className="text-[#78716C]">Network Stock:</span>
          <span className="font-bold text-[#2563EB]">{totalStock} units</span>
        </div>

        {/* Advance 1h Quick Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAdvance}
          disabled={isAdvancing}
          title="Advance simulation clock by 1 hour"
        >
          <RotateCw className={cn("w-3.5 h-3.5 text-[#78716C]", isAdvancing && "animate-spin")} />
          <span className="hidden md:inline">Advance 1h</span>
        </Button>

        {/* Sandbox Trigger */}
        <Button
          variant="primary"
          size="sm"
          onClick={onSelectSandbox}
          title="Open What-If Scenarios"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Scenarios</span>
        </Button>

        {/* Architecture Spec Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenArchitecture}
          className="h-8 w-8 p-0"
          title="View System Architecture"
        >
          <Layers className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
