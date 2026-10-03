"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Package,
  RotateCw,
  Search,
  ShieldCheck,
  Sliders,
  Truck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeckTab, StoreHub } from "@/lib/types";
import { Badge, Button } from "@/components/ui";

interface SidebarProps {
  activeTab: DeckTab;
  setActiveTab: (tab: DeckTab) => void;
  queueCount?: number;
  inFlightCount?: number;
  outcomesCount?: number;
  batchesCount?: number;
  stores?: StoreHub[];
  selectedStoreCode?: string;
  onSelectStore?: (code: string) => void;
  simTime?: string;
  isSimulating?: boolean;
  onAdvanceHour?: () => void;
  onOpenTestLab?: () => void;
  isBackendOnline?: boolean;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  queueCount = 6,
  inFlightCount = 3,
  outcomesCount = 5,
  batchesCount = 6,
  stores = [],
  selectedStoreCode,
  onSelectStore,
  simTime = "08:15 AM",
  isSimulating = false,
  onAdvanceHour,
  onOpenTestLab,
  isBackendOnline = false,
}: SidebarProps) {
  const [navSearch, setNavSearch] = useState("");

  const navItems = [
    {
      id: "alerts" as const,
      label: "Alerts",
      subtitle: "Stockout warnings",
      icon: Zap,
      count: queueCount,
      badgeVariant: "urgent" as const,
    },
    {
      id: "deliveries" as const,
      label: "Deliveries",
      subtitle: "Vans moving between stores",
      icon: Truck,
      count: inFlightCount,
      badgeVariant: "info" as const,
    },
    {
      id: "history" as const,
      label: "History",
      subtitle: "Past results & accuracy",
      icon: CheckCircle2,
      count: outcomesCount,
      badgeVariant: "success" as const,
    },
    {
      id: "inventory" as const,
      label: "Inventory",
      subtitle: "Shelves & freshness",
      icon: Package,
      count: batchesCount,
      badgeVariant: "neutral" as const,
    },
    {
      id: "sandbox" as const,
      label: "Sandbox",
      subtitle: "What-if simulator & CSV",
      icon: Sliders,
      count: undefined,
      badgeVariant: "neutral" as const,
    },
  ];

  const filteredStores = stores.filter((s) =>
    navSearch.trim()
      ? s.name.toLowerCase().includes(navSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(navSearch.toLowerCase())
      : true
  );

  return (
    <aside className="w-64 h-full shrink-0 bg-white border-r border-[#EAE6DF] flex flex-col justify-between select-none">
      {/* Brand & Network Status */}
      <div className="p-4 border-b border-[#EAE6DF] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#1C1917] text-sm tracking-tight">Outpost</span>
                <Badge variant="neutral" className="text-[10px] px-1.5 py-0">
                  Mumbai
                </Badge>
              </div>
              <p className="text-[11px] text-[#A8A29E] font-medium">Dark Store Network</p>
            </div>
          </div>
          <Badge
            variant={isBackendOnline ? "success" : "info"}
            dot
            title={isBackendOnline ? "Connected to live FastAPI engine" : "Running on local instant simulator"}
          >
            {isBackendOnline ? "ONLINE" : "READY"}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#A8A29E] pointer-events-none" />
          <input
            type="text"
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            placeholder="Search stores..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF8F5] border border-[#EAE6DF] rounded-lg text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Main Navigation & Stores List (Dedicated Scroll Container) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] px-3 mb-2">
            Main Menu
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === "sandbox" && onOpenTestLab) {
                      onOpenTestLab();
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer active:scale-[0.98]",
                    isActive
                      ? "bg-[#EFF6FF] text-[#2563EB] shadow-xs"
                      : "text-[#57534E] hover:text-[#1C1917] hover:bg-[#FAF8F5]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn("h-4 w-4", isActive ? "text-[#2563EB]" : "text-[#A8A29E]")} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    isActive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2563EB] text-white">
                        {item.count}
                      </span>
                    ) : (
                      <Badge variant={item.badgeVariant} className="text-[10px] px-2 py-0">
                        {item.count}
                      </Badge>
                    )
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Live Mumbai Stores Summary */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">
              Mumbai Stores ({stores.length})
            </p>
            {selectedStoreCode ? (
              <button
                type="button"
                onClick={() => onSelectStore?.("")}
                className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
              >
                Clear Filter
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-[#78716C] tabular-nums">
                {stores.reduce((acc, s) => acc + s.milkUnits, 0)}u total
              </span>
            )}
          </div>
          <div className="space-y-1 px-1">
            {filteredStores.map((s) => {
              const isSelected = selectedStoreCode === s.code;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectStore?.(isSelected ? "" : s.code)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs text-left cursor-pointer transition-all active:scale-[0.98]",
                    isSelected
                      ? "bg-[#EFF6FF] border-[#2563EB]/40 text-[#2563EB] shadow-xs"
                      : "bg-[#FAF8F5] border-[#EAE6DF]/70 text-[#1C1917] hover:bg-[#F5F2EB]"
                  )}
                  title={`Filter operations to ${s.name}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        s.statusType === "critical"
                          ? "bg-rose-500"
                          : s.statusType === "warning"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      )}
                    />
                    <span className={cn("font-semibold truncate", isSelected ? "text-[#2563EB]" : "text-[#1C1917]")}>
                      {s.name.replace("Dark Store ", "")}
                    </span>
                  </div>
                  <span className={cn("text-[11px] font-bold shrink-0 tabular-nums", isSelected ? "text-[#2563EB]" : "text-[#1C1917]")}>
                    {s.milkUnits}u
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer: Clock & Planner Profile (Permanently Pinned) */}
      <div className="p-3 border-t border-[#EAE6DF] bg-[#FAF8F5]/80 space-y-2.5 shrink-0">
        {/* Simulation Clock & Advance 1h */}
        <div className="bg-white border border-[#EAE6DF] rounded-lg p-2.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-[#78716C] font-semibold">
              <Clock className="h-3.5 w-3.5 text-[#A8A29E]" />
              <span className="tabular-nums font-mono font-bold text-[#1C1917]">{simTime}</span>
            </div>
            <Badge variant="success" className="text-[10px] px-1.5 py-0">
              Live Feed
            </Badge>
          </div>
          {onAdvanceHour && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onAdvanceHour}
              disabled={isSimulating}
              className="w-full"
            >
              <RotateCw className={cn("h-3.5 w-3.5 text-[#78716C]", isSimulating && "animate-spin")} />
              <span>Advance Time (+1h)</span>
            </Button>
          )}
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between px-2 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-[#1C1917] text-white flex items-center justify-center text-[11px] font-bold shadow-xs">
              KW
            </div>
            <div>
              <p className="text-xs font-bold text-[#1C1917] leading-none">Karan Wakhare</p>
              <p className="text-[10px] text-[#78716C] mt-0.5">Operations Planner</p>
            </div>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500" title="Active" />
        </div>
      </div>
    </aside>
  );
}
