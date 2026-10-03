"use client";

import React, { useEffect, useState } from "react";
import { Activity, Clock, FlaskConical, RefreshCw, Wifi } from "lucide-react";
import { DeckTab } from "@/lib/types";
import { cn } from "@/lib/utils";

interface HeaderProps {
  activeTab: DeckTab;
  totalStock: number;
  onReset: () => void;
  isTransferred: boolean;
  onOpenArchitecture: () => void;
  onOpenTestLab: () => void;
  isBackendOnline?: boolean;
}

export function Header({
  activeTab,
  totalStock,
  onReset,
  isTransferred,
  onOpenArchitecture,
  onOpenTestLab,
  isBackendOnline = false,
}: HeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>("IST --:--");

  // Live ticking IST clock
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const timeStr = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now);
        setCurrentTime(`IST ${timeStr}`);
      } catch {
        setCurrentTime("IST 16:15:00");
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTabDetails = () => {
    switch (activeTab) {
      case "feed":
        return {
          title: "Live Operations Feed",
          subtitle: "Real-time stock alerts, van transit corridors, and manager sign-off triage",
        };
      case "stores":
        return {
          title: "All Stores (Mumbai Hubs)",
          subtitle: "5 dark stores: on-hand units, shelf space, active demand, and safety buffers",
        };
      case "transfers":
        return {
          title: "Van Deliveries & Inbound Shipments",
          subtitle: "Inter-store lateral runs, van corridors, and Regional Fulfilment Centre (RFC) pipelines",
        };
      case "batches":
        return {
          title: "Stock Batches (FIFO Order)",
          subtitle: "Discrete lots tracked with expiration timestamps and strict first-in-first-out pick priority",
        };
    }
  };

  const { title, subtitle } = getTabDetails();

  return (
    <header className="h-16 border-b border-zinc-200/80 bg-white px-6 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-2xs">
      {/* Left: View Title & Subtitle */}
      <div className="flex flex-col min-w-0 pr-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-sm md:text-base font-bold tracking-tight text-zinc-950 font-display truncate">
            {title}
          </h1>
          <span className="text-xs text-zinc-300 font-medium hidden sm:inline">·</span>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="tabular-nums font-semibold text-zinc-700">{currentTime}</span>
          </div>
        </div>
        <p className="text-xs text-zinc-500 truncate mt-0.5 hidden md:block">
          {subtitle}
        </p>
      </div>

      {/* Right: Actions & Indicators */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Backend Connection Status Badge */}
        <div
          className={cn(
            "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border",
            isBackendOnline
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-zinc-100 text-zinc-700 border-zinc-200"
          )}
          title={isBackendOnline ? "Connected to FastAPI backend on port 8000" : "Running on local deterministic engine (offline mode)"}
        >
          {isBackendOnline ? (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="font-mono">FastAPI :8000</span>
            </>
          ) : (
            <>
              <Wifi className="w-3 h-3 text-zinc-500" />
              <span>Local Engine</span>
            </>
          )}
        </div>

        {/* Active Van In Transit indicator */}
        {isTransferred && (
          <span className="hidden xl:inline-flex items-center gap-1 text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
            Van #MH-02 En Route
          </span>
        )}

        {/* Mass Conservation Telemetry Pill */}
        <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/80 rounded-lg px-2.5 py-1.5 text-xs shadow-2xs font-mono">
          <span className="text-zinc-500 font-sans font-medium text-xs">Total Stock:</span>
          <span className="tabular-nums font-bold text-zinc-950 text-xs">{totalStock} units</span>
          <span className="text-zinc-300 font-sans">·</span>
          <span className="tabular-nums text-emerald-700 font-semibold text-xs">Net Change: 0 (Mass Conserved)</span>
        </div>

        {/* Operations Test Lab Trigger Button - Swiss Zinc Palette */}
        <button
          type="button"
          onClick={onOpenTestLab}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 active:scale-[0.98] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          title="Open Quick-Commerce Test Lab (Stress scenarios & custom stock numbers)"
        >
          <FlaskConical className="w-3.5 h-3.5 text-zinc-600" />
          <span>Test Lab</span>
        </button>

        {/* System Architecture Trigger */}
        <button
          type="button"
          onClick={onOpenArchitecture}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200/80 bg-white hover:bg-zinc-50 text-zinc-700 active:scale-[0.98] text-xs font-medium transition-all cursor-pointer shadow-2xs"
          title="Inspect Engine Architecture & LangGraph Pipeline"
        >
          <Activity className="w-3.5 h-3.5 text-zinc-500" />
          <span>Architecture</span>
        </button>

        {/* Reset Action */}
        <button
          type="button"
          onClick={onReset}
          className="h-8 w-8 rounded-lg border border-zinc-200/80 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-950 active:scale-[0.95] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
          title="Reset entire network to nominal state (140 units)"
          aria-label="Reset entire network to nominal state"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
