"use client";

import React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "urgent"
  | "danger"
  | "warning"
  | "success"
  | "safe"
  | "info"
  | "transit"
  | "neutral"
  | "hub";

type BadgeSize = "sm" | "md";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: React.ReactNode;
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-[10px] px-2 py-0.5 h-5 leading-none",
  md: "text-[11px] px-2.5 py-0.5 h-6 leading-none",
};

const variantStyles: Record<BadgeVariant, string> = {
  urgent: "bg-rose-50 text-rose-800 border-rose-200",
  danger: "bg-rose-50 text-rose-800 border-rose-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  safe: "bg-emerald-50 text-emerald-800 border-emerald-200",
  info: "bg-blue-50 text-blue-800 border-blue-200",
  transit: "bg-blue-50 text-blue-800 border-blue-200",
  neutral: "bg-[#FAF8F5] text-[#57534E] border-[#EAE6DF]",
  hub: "bg-[#FAF8F5] text-[#57534E] border-[#EAE6DF]",
};

const dotColors: Record<BadgeVariant, string> = {
  urgent: "bg-rose-500",
  danger: "bg-rose-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  safe: "bg-emerald-500",
  info: "bg-[#2563EB]",
  transit: "bg-[#2563EB]",
  neutral: "bg-[#78716C]",
  hub: "bg-[#78716C]",
};

export function Badge({
  variant = "neutral",
  size = "md",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "font-semibold rounded-full border inline-flex items-center gap-1.5 whitespace-nowrap select-none",
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
}
