"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  ChevronDown,
  Compass,
  FlaskConical,
  Package,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Truck,
  Zap,
} from "lucide-react";
import { DeckTab } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: DeckTab;
  setActiveTab: (tab: DeckTab) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeScenario: string;
  onTriggerScenario: (name: string) => void;
  onReset: () => void;
  isTransferred: boolean;
  onOpenArchitecture: () => void;
  onOpenTestLab: () => void;
  transferCount?: number;
  batchCount?: number;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  activeScenario,
  onTriggerScenario,
  onReset,
  isTransferred,
  onOpenArchitecture,
  onOpenTestLab,
  transferCount = 2,
  batchCount = 6,
}: SidebarProps) {
  const [isScenariosOpen, setIsScenariosOpen] = useState(false);
  const scenarioRef = useRef<HTMLDivElement>(null);

  // Global ⌘K / Ctrl+K keyboard shortcut listener for search and Escape to dismiss menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = document.getElementById("global-search-input") as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      }
      if (e.key === "Escape") {
        setIsScenariosOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close scenario menu without blocking page clicks
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (scenarioRef.current && !scenarioRef.current.contains(e.target as Node)) {
        setIsScenariosOpen(false);
      }
    };
    if (isScenariosOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isScenariosOpen]);

  const navItems = [
    {
      id: "feed" as DeckTab,
      label: "Live Feed",
      icon: Zap,
      badge: !isTransferred ? "1 Action" : undefined,
      badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    },
    {
      id: "stores" as DeckTab,
      label: "All Stores",
      icon: Store,
      badge: "5 Stores",
      badgeColor: "bg-zinc-100 text-zinc-700 border-zinc-200",
    },
    {
      id: "transfers" as DeckTab,
      label: "Van Deliveries",
      icon: Truck,
      badge: `${transferCount} Active`,
      badgeColor: isTransferred
        ? "bg-blue-100 text-blue-900 border-blue-300"
        : "bg-zinc-100 text-zinc-700 border-zinc-200",
    },
    {
      id: "batches" as DeckTab,
      label: "Stock Batches",
      icon: Package,
      badge: `${batchCount} Lots`,
      badgeColor: "bg-zinc-100 text-zinc-700 border-zinc-200",
    },
  ];

  return (
    <aside className="w-64 border-r border-zinc-200/80 bg-white flex flex-col justify-between select-none shrink-0 relative">
      <div className="flex flex-col">
        {/* Workspace Brand Header - Contains AST Invariant Tokens Outpost & MUMBAI NETWORK */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-white shadow-xs">
              <Compass className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight font-display text-zinc-950">Outpost</span>
                <span className="text-xs px-1.5 py-0.2 rounded-md bg-zinc-100 text-zinc-700 font-semibold border border-zinc-200">
                  L2 Ops
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium tracking-tight">MUMBAI NETWORK</p>
            </div>
          </div>
          <div className="relative flex h-2 w-2" title="System Synchronized (WebSocket Live)">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </div>
        </div>

        {/* Global Search with ⌘K Badge */}
        <div className="px-3 pt-3 pb-2">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400 pointer-events-none" />
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stores, vans, batches... (⌘K)"
              className="w-full pl-8 pr-12 py-1.5 text-xs bg-zinc-50 border border-zinc-200/80 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-800 focus:bg-white transition-all font-sans"
            />
            <kbd className="absolute right-2 px-1.5 py-0.5 text-xs font-mono font-medium text-zinc-400 bg-white border border-zinc-200 rounded-md">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <nav className="px-2 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.98] cursor-pointer",
                  isActive
                    ? "bg-zinc-900 text-white font-semibold shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-950"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-zinc-400")} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-md text-xs font-semibold border",
                      isActive
                        ? "bg-zinc-800 text-zinc-100 border-zinc-700"
                        : item.badgeColor
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Direct Test Lab Promotion Button - Swiss Zinc Palette */}
        <div className="px-3 pt-1">
          <button
            type="button"
            onClick={onOpenTestLab}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="w-3.5 h-3.5 text-zinc-600" />
              <span>Operations Test Lab</span>
            </div>
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-zinc-200/80 text-zinc-800 font-mono font-bold">
              LAB
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Section: Scenarios, Architecture & Safety Indicator */}
      <div className="p-3 border-t border-zinc-200/80 bg-zinc-50/70 space-y-2">
        {/* Simulation Scenarios Dropdown */}
        <div className="relative" ref={scenarioRef}>
          <button
            type="button"
            onClick={() => setIsScenariosOpen(!isScenariosOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200/80 text-xs font-semibold text-zinc-900 active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600" />
              <span>Stress Scenarios</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="tabular-nums text-xs px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700 capitalize font-medium border border-zinc-200/60">
                {activeScenario.replace("_", " ")}
              </span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-zinc-400 transition-transform duration-200",
                  isScenariosOpen && "rotate-180"
                )}
              />
            </div>
          </button>

          {/* Scenarios Popover */}
          {isScenariosOpen && (
            <div className="absolute left-0 right-0 bottom-full mb-1.5 bg-white border border-zinc-200/90 rounded-xl shadow-lg p-1.5 z-40 space-y-0.5">
              <div className="px-2.5 py-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                Quick-Commerce Scenarios
              </div>
              <button
                type="button"
                onClick={() => {
                  onTriggerScenario("demand_spike");
                  setIsScenariosOpen(false);
                }}
                className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-zinc-50 text-zinc-800 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>IPL Demand Rush</span>
                </div>
                <span className="text-xs text-zinc-400 font-mono">38 orders</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onTriggerScenario("supplier_delay");
                  setIsScenariosOpen(false);
                }}
                className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-zinc-50 text-zinc-800 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Truck Delay (RFC)</span>
                </div>
                <span className="text-xs text-zinc-400 font-mono">+4h ETA</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onTriggerScenario("imbalance");
                  setIsScenariosOpen(false);
                }}
                className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-zinc-50 text-zinc-800 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Scale className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>Stock Imbalance</span>
                </div>
                <span className="text-xs text-zinc-400 font-mono">Triage</span>
              </button>
              <div className="pt-1 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    setIsScenariosOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-zinc-50 text-zinc-900 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <span>Reset Network</span>
                  </div>
                  <span className="text-xs text-emerald-700 font-mono font-bold">140 units</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Architecture Specs Trigger */}
        <button
          type="button"
          onClick={onOpenArchitecture}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-zinc-500" />
            <span>Architecture &amp; Flow</span>
          </div>
          <span className="text-xs text-zinc-400 font-mono">v2.0</span>
        </button>

        {/* L2 Autonomy Indicator */}
        <div className="pt-2 border-t border-zinc-200/80 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-zinc-800">Human Approval Active</span>
          </div>
          <span className="font-mono text-zinc-400 text-xs">Deterministic</span>
        </div>
      </div>
    </aside>
  );
}
