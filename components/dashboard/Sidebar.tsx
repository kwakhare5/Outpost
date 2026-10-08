"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeckTab, StoreHub } from "@/lib/types";
import { Badge } from "@/components/ui";

interface SidebarProps {
  activeTab: DeckTab;
  setActiveTab: (tab: DeckTab) => void;
  queueCount?: number;
  inFlightCount?: number;
  outcomesCount?: number;
  stores?: StoreHub[];
  selectedStoreCode?: string;
  onSelectStore?: (code: string) => void;
  simTime?: string;
  isBackendOnline?: boolean;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  queueCount = 4,
  inFlightCount = 3,
  outcomesCount = 5,
  stores = [],
  selectedStoreCode,
  onSelectStore,
  simTime = "08:15 AM",
  isBackendOnline = false,
}: SidebarProps) {
  const navItems = [
    {
      id: "queue" as const,
      label: "Queue",
      icon: Zap,
      count: queueCount,
      badgeVariant: "urgent" as const,
    },
    {
      id: "inflight" as const,
      label: "In-Flight",
      icon: Truck,
      count: inFlightCount,
      badgeVariant: "info" as const,
    },
    {
      id: "outcomes" as const,
      label: "Outcomes",
      icon: CheckCircle2,
      count: outcomesCount,
      badgeVariant: "success" as const,
    },
  ];

  return (
    <aside className="w-60 h-full shrink-0 bg-white border-r border-[#EAE6DF] flex flex-col justify-between select-none">
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
              <p className="text-[11px] text-[#78716C] font-medium">Dark Store Network</p>
            </div>
          </div>
          <Badge
            variant={isBackendOnline ? "success" : "neutral"}
            dot
            title={isBackendOnline ? "Connected to FastAPI engine" : "Local Simulation Preview"}
          >
            {isBackendOnline ? "ONLINE" : "OFFLINE"}
          </Badge>
        </div>
      </div>

      {/* Main Navigation & Stores List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] px-3 mb-2">
            Operations
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:outline-hidden",
                    isActive
                      ? "bg-[#EFF6FF] text-[#2563EB] shadow-xs"
                      : "text-[#57534E] hover:text-[#1C1917] hover:bg-[#FAF8F5]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn("h-4 w-4", isActive ? "text-[#2563EB]" : "text-[#78716C]")} />
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
              Stores ({stores.length})
            </p>
            {selectedStoreCode ? (
              <button
                type="button"
                onClick={() => onSelectStore?.("")}
                className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
              >
                Clear
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-[#78716C] tabular-nums">
                {stores.reduce((acc, s) => acc + s.milkUnits, 0)}u
              </span>
            )}
          </div>
          <div className="space-y-1 px-1">
            {stores.map((s) => {
              const isSelected = selectedStoreCode === s.code;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectStore?.(isSelected ? "" : s.code)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs text-left cursor-pointer transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:outline-hidden",
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

      {/* Footer: Clock & Operator Profile */}
      <div className="p-3 border-t border-[#EAE6DF] bg-[#FAF8F5]/80 space-y-2 shrink-0">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs text-[#78716C] font-semibold">
            <Clock className="h-3.5 w-3.5 text-[#78716C]" />
            <span className="tabular-nums font-mono font-bold text-[#1C1917]">{simTime}</span>
          </div>
          <Badge variant="success" className="text-[10px] px-1.5 py-0">
            Live
          </Badge>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between px-1 pt-1 border-t border-[#EAE6DF]/60">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-[#1C1917] text-white flex items-center justify-center text-[10px] font-bold">
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
