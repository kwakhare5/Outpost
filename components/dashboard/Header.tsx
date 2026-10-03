"use client";

import React, { useState } from "react";
import {
  RotateCw,
  Sliders,
  Layers,
} from "lucide-react";
import { DeckTab } from "@/lib/types";
import { Badge, Button } from "@/components/ui";
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
      case "alerts":
        return {
          title: "Stock Alerts & Urgent Needs",
          subtitle: "Instant warnings when a store is running low on customer favorites",
        };
      case "deliveries":
        return {
          title: "Van Deliveries & Door Arrivals",
          subtitle: "Live tracking of vans between stores and back-door arrival count checks",
        };
      case "history":
        return {
          title: "Past Results & Accuracy",
          subtitle: "Audited record of stockouts prevented, money saved, and forecast accuracy",
        };
      case "inventory":
        return {
          title: "Store Shelves & Freshness",
          subtitle: "Shelf stock with expiry timers and first-in, first-out pick priority",
        };
      case "sandbox":
        return {
          title: "What-If Sandbox",
          subtitle: "Simulate cricket match rushes and highway delivery delays",
        };
      default:
        return {
          title: "Outpost Mumbai Console",
          subtitle: "Quick-commerce store replenishment command deck",
        };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <header className="h-14 border-b border-[#EAE6DF] bg-white px-4 md:px-5 flex items-center justify-between shrink-0 sticky top-0 z-30 select-none">
      {/* Title & Context */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold text-[#1C1917] tracking-tight">{title}</h1>
          <Badge variant="neutral">
            MUMBAI NETWORK (5 STORES)
          </Badge>
        </div>
        <p className="text-[11px] text-[#78716C] leading-none mt-0.5">{subtitle}</p>
      </div>

      {/* Right Controls & Telemetry */}
      <div className="flex items-center gap-2.5">
        {/* Total Stock Counter */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#EAE6DF] text-xs font-semibold text-[#1C1917]">
          <span className="text-[#78716C]">Network Stock:</span>
          <span className="font-bold text-[#2563EB]">{totalStock} units</span>
          <Badge variant="success">
            Balanced
          </Badge>
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
          variant={activeTab === "sandbox" ? "dark" : "primary"}
          size="sm"
          onClick={onSelectSandbox}
          title="Open What-If Sandbox"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Sandbox</span>
        </Button>

        {/* Architecture Spec Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenArchitecture}
          className="p-1.5"
          title="View Outpost Spec & Architecture"
        >
          <Layers className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
