"use client";

import React from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Clock,
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
}: SidebarProps) {
  const navItems = [
    {
      id: "queue" as const,
      label: "Stock Alerts",
      icon: Zap,
      count: queueCount,
      badgeVariant: "urgent" as const,
    },
    {
      id: "inflight" as const,
      label: "Live Deliveries",
      icon: Truck,
      count: inFlightCount,
      badgeVariant: "info" as const,
    },
    {
      id: "outcomes" as const,
      label: "Past Results",
      icon: CheckCircle2,
      count: outcomesCount,
      badgeVariant: "success" as const,
    },
  ];

  return (
    <aside className="w-64 h-full shrink-0 bg-white border-r border-[#EAE6DF] flex flex-col justify-between select-none">
      {/* Brand & Network Status */}
      <div className="p-4 border-b border-[#EAE6DF] shrink-0">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="Outpost"
            width={34}
            height={34}
            className="h-8.5 w-8.5 shrink-0 select-none rounded-lg shadow-xs"
            priority
          />
          <div>
            <span className="font-bold text-[#1C1917] text-base tracking-tight leading-none block">
              Outpost
            </span>
            <p className="text-xs text-[#57534E] font-medium mt-0.5">
              Mumbai Network
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation & Stores List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#78716C] px-3 mb-2">
            Operations
          </p>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:outline-hidden",
                    isActive
                      ? "bg-[#EFF6FF] text-[#2563EB] shadow-xs"
                      : "text-[#57534E] hover:text-[#1C1917] hover:bg-[#FAF8F5]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn("h-4 w-4", isActive ? "text-[#2563EB]" : "text-[#78716C]")} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    isActive ? (
                      <span className="inline-flex items-center justify-center text-xs font-bold px-2 h-5 rounded-full bg-[#2563EB] text-white select-none">
                        {item.count}
                      </span>
                    ) : (
                      <Badge variant={item.badgeVariant} size="sm">
                        {item.count}
                      </Badge>
                    )
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Live Mumbai Stores Summary with Health Pills */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
              Dark Stores ({stores.length})
            </p>
            {selectedStoreCode ? (
              <button
                type="button"
                onClick={() => onSelectStore?.("")}
                className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
              >
                Clear Filter
              </button>
            ) : (
              <span className="text-xs font-semibold text-[#57534E] tabular-nums">
                {stores.reduce((acc, s) => acc + s.milkUnits, 0)} units total
              </span>
            )}
          </div>
          <div className="space-y-1.5 px-1">
            {stores.map((s) => {
              const isSelected = selectedStoreCode === s.code;
              const isLow = s.statusType === "critical" || s.milkUnits < 40;
              const isBuffer = s.milkUnits > 80;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectStore?.(isSelected ? "" : s.code)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs text-left cursor-pointer transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:outline-hidden",
                    isSelected
                      ? "bg-[#EFF6FF] border-[#2563EB] text-[#2563EB] shadow-xs"
                      : "bg-[#FAF8F5] border-[#EAE6DF] text-[#1C1917] hover:bg-[#F5F2EB]"
                  )}
                  title={`Filter operations to ${s.name}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        isLow
                          ? "bg-rose-500"
                          : isBuffer
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      )}
                    />
                    <span className={cn("font-bold text-xs truncate", isSelected ? "text-[#2563EB]" : "text-[#1C1917]")}>
                      {s.name.replace("Dark Store ", "")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn("font-mono font-bold text-xs", isSelected ? "text-[#2563EB]" : "text-[#1C1917]")}>
                      {s.milkUnits}u
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer: Clock & Operator Profile */}
      <div className="p-3 border-t border-[#EAE6DF] bg-[#FAF8F5]/80 space-y-2 shrink-0">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs text-[#57534E] font-semibold">
            <Clock className="h-3.5 w-3.5 text-[#78716C]" />
            <span>Time:</span>
            <span className="tabular-nums font-mono font-bold text-[#1C1917]">{simTime}</span>
          </div>
          <span className="text-xs font-mono font-semibold text-[#78716C]">
            IST
          </span>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between px-1 pt-1 border-t border-[#EAE6DF]">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-[#1C1917] text-white flex items-center justify-center text-xs font-bold">
              KW
            </div>
            <div>
              <p className="text-xs font-bold text-[#1C1917] leading-none">Karan Wakhare</p>
              <p className="text-xs text-[#78716C] mt-0.5">Inventory Planner</p>
            </div>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500" title="Active" />
        </div>
      </div>
    </aside>
  );
}
