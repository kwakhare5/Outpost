"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MetricTileProps {
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function MetricTile({
  label,
  value,
  subtitle,
  badge,
  className,
}: MetricTileProps) {
  return (
    <div
      className={cn(
        "p-3.5 sm:p-4 rounded-xl bg-white border border-[#EAE6DF] shadow-xs flex flex-col justify-between select-none min-w-0",
        className
      )}
    >
      <span className="text-xs text-[#78716C] font-semibold block truncate">{label}</span>
      <div className="mt-1 flex items-baseline gap-2 min-w-0">
        <span className="text-xl sm:text-2xl font-bold text-[#1C1917] tabular-nums truncate">
          {value}
        </span>
        {badge}
      </div>
      {subtitle && (
        <span className="text-[11px] text-[#78716C] mt-1 block leading-tight">{subtitle}</span>
      )}
    </div>
  );
}
