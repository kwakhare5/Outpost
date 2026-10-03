"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SegmentedItem<T extends string = string> {
  id: T;
  label: string;
}

interface SegmentedControlProps<T extends string = string> {
  items: SegmentedItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  items,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 p-1 bg-[#F5F2EB] rounded-xl border border-[#EAE6DF] text-xs select-none",
        className
      )}
    >
      {items.map((item) => {
        const isActive = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-[0.98]",
              isActive
                ? "bg-white text-[#1C1917] shadow-xs"
                : "text-[#78716C] hover:text-[#1C1917]"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
