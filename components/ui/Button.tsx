"use client";

import React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "dark"
  | "danger"
  | "ghost";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs",
  secondary: "bg-[#FAF8F5] hover:bg-[#F5F2EB] text-[#1C1917] border border-[#EAE6DF] shadow-xs",
  dark: "bg-[#1C1917] hover:bg-[#292524] text-white shadow-xs",
  danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs",
  ghost: "text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF8F5] border border-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "text-xs px-2.5 py-1 gap-1.5 rounded-lg",
  md: "text-xs px-3.5 py-2 gap-2 rounded-lg",
  lg: "text-sm px-5 py-2.5 gap-2 rounded-lg",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
