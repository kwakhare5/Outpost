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
        "p-4 sm:p-5 rounded-xl bg-white border border-[#EAE6DF] shadow-xs flex flex-col justify-between select-none",
        className
      )}
    >
      <span className="text-xs text-[#78716C] font-semibold block">{label}</span>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[#1C1917] tabular-nums">
          {value}
        </span>
        {badge}
      </div>
      {subtitle && (
        <span className="text-xs text-[#78716C] mt-1 block">{subtitle}</span>
      )}
    </div>
  );
}
