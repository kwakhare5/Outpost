"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface DemandChartProps {
  currentStock: number;
  burnRate: number;
  productName: string;
  runsOutAtTime?: string;
  runsOutInHours?: number;
  className?: string;
}

export function DemandChart({
  currentStock,
  burnRate,
  productName,
  runsOutAtTime = "13:00",
  runsOutInHours = 4.8,
  className,
}: DemandChartProps) {
  // Chart coordinate mapping (viewBox 0 0 500 160)
  // Time domain: 06:00 (6.0) to 20:00 (20.0) -> 14 hours
  const startHour = 6.0;
  const endHour = 20.0;
  const totalHours = endHour - startHour; // 14

  const padLeft = 35;
  const padRight = 15;
  const chartWidth = 500 - padLeft - padRight; // 450
  const chartTop = 32;
  const chartBottom = 125;
  const chartHeight = chartBottom - chartTop; // 93

  const hourToX = (hour: number) => {
    const clamped = Math.max(startHour, Math.min(endHour, hour));
    return padLeft + ((clamped - startHour) / totalHours) * chartWidth;
  };

  // Y domain: 0 to maxRate units/hr (default scale based on burnRate)
  const maxRate = Math.max(16, Math.ceil((burnRate * 1.5) / 5) * 5);
  const rateToY = (rate: number) => {
    const clamped = Math.max(0, Math.min(maxRate, rate));
    return chartBottom - (clamped / maxRate) * chartHeight;
  };

  // Timeline points
  const nowHour = 8.25; // 08:15 AM
  const stockoutHour = Math.min(19.5, nowHour + runsOutInHours); // ~13.0
  const poHour = 18.67; // 18:40 PM PO-4471 Arrival

  const nowX = hourToX(nowHour);
  const stockoutX = hourToX(stockoutHour);
  const poX = hourToX(poHour);

  // Past actual sales bars (06:00 - 08:15)
  const actualBars = [
    { startH: 6.0, endH: 7.0, rate: Math.max(2, burnRate * 0.72) },
    { startH: 7.0, endH: 8.0, rate: Math.max(3, burnRate * 0.95) },
    { startH: 8.0, endH: 8.25, rate: burnRate },
  ];

  // Future unconstrained forecast curve coordinates (08:15 to 20:00)
  const forecastPoints = [
    { h: 8.25, rate: burnRate },
    { h: 10.0, rate: burnRate * 1.05 },
    { h: 12.0, rate: burnRate * 1.15 },
    { h: 14.0, rate: burnRate * 0.95 },
    { h: 16.0, rate: burnRate * 1.1 },
    { h: 18.0, rate: burnRate * 1.25 },
    { h: 20.0, rate: burnRate * 0.9 },
  ];

  const forecastPathD = forecastPoints.reduce((acc, pt, idx) => {
    const x = hourToX(pt.h);
    const y = rateToY(pt.rate);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  // Grid tick marks
  const hourTicks = [6, 8, 10, 12, 14, 16, 18, 20];

  return (
    <div className={cn("p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-[#1C1917]">Hourly Sales &amp; Demand Forecast</span>
          <span className="text-[10px] text-[#78716C] ml-2 font-mono">
            {productName} ({currentStock} units left)
          </span>
        </div>
        <span className="text-[11px] font-mono font-semibold text-[#C2410C]">
          Empty: ~{runsOutAtTime} (in ~{runsOutInHours.toFixed(1)}h)
        </span>
      </div>

      {/* SVG Timeline Canvas */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox="0 0 500 160"
          className="w-full h-auto select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Horizontal grid lines */}
          <line
            x1={padLeft}
            y1={chartBottom}
            x2={padLeft + chartWidth}
            y2={chartBottom}
            stroke="#EAE6DF"
            strokeWidth="1"
          />
          <line
            x1={padLeft}
            y1={rateToY(maxRate / 2)}
            x2={padLeft + chartWidth}
            y2={rateToY(maxRate / 2)}
            stroke="#EAE6DF"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <line
            x1={padLeft}
            y1={chartTop}
            x2={padLeft + chartWidth}
            y2={chartTop}
            stroke="#EAE6DF"
            strokeWidth="1"
            strokeDasharray="2 3"
          />

          {/* Y-axis Labels */}
          <text
            x={padLeft - 6}
            y={chartBottom + 3}
            textAnchor="end"
            fontSize="9"
            fill="#78716C"
            fontFamily="monospace"
          >
            0
          </text>
          <text
            x={padLeft - 6}
            y={rateToY(maxRate / 2) + 3}
            textAnchor="end"
            fontSize="9"
            fill="#78716C"
            fontFamily="monospace"
          >
            {Math.round(maxRate / 2)}
          </text>
          <text
            x={padLeft - 6}
            y={chartTop + 3}
            textAnchor="end"
            fontSize="9"
            fill="#78716C"
            fontFamily="monospace"
          >
            {maxRate}u
          </text>

          {/* Actual Sales Bars (Fulfilled up to 08:15) */}
          {actualBars.map((bar, idx) => {
            const bx = hourToX(bar.startH);
            const bw = Math.max(3, hourToX(bar.endH) - bx - 2);
            const by = rateToY(bar.rate);
            const bh = chartBottom - by;
            return (
              <rect
                key={idx}
                x={bx}
                y={by}
                width={bw}
                height={bh}
                fill="#2563EB"
                opacity="0.85"
                rx="1.5"
              />
            );
          })}

          {/* Forecast Demand Line (Dashed, from 08:15 to 20:00) */}
          <path
            d={forecastPathD}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2"
            strokeDasharray="4 3"
          />

          {/* Forecast Dots */}
          {forecastPoints.map((pt, idx) => (
            <circle
              key={idx}
              cx={hourToX(pt.h)}
              cy={rateToY(pt.rate)}
              r="2.5"
              fill="#2563EB"
            />
          ))}

          {/* Vertical Pin 1: NOW (08:15 AM) */}
          <line
            x1={nowX}
            y1={chartTop - 6}
            x2={nowX}
            y2={chartBottom}
            stroke="#2563EB"
            strokeWidth="1.5"
          />
          <rect
            x={nowX - 24}
            y={chartTop - 18}
            width="48"
            height="14"
            rx="3"
            fill="#2563EB"
          />
          <text
            x={nowX}
            y={chartTop - 8}
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill="#FFFFFF"
            fontFamily="sans-serif"
          >
            Now 08:15
          </text>

          {/* Vertical Pin 2: STOCKOUT (~13:00 PM) */}
          <line
            x1={stockoutX}
            y1={chartTop - 6}
            x2={stockoutX}
            y2={chartBottom}
            stroke="#E11D48"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
          <rect
            x={stockoutX - 32}
            y={chartTop - 18}
            width="64"
            height="14"
            rx="3"
            fill="#E11D48"
          />
          <text
            x={stockoutX}
            y={chartTop - 8}
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill="#FFFFFF"
            fontFamily="sans-serif"
          >
            Out ~{runsOutAtTime}
          </text>

          {/* Vertical Pin 3: RFC PO ARRIVAL (18:40 PM) */}
          <line
            x1={poX}
            y1={chartTop - 6}
            x2={poX}
            y2={chartBottom}
            stroke="#D97706"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
          <rect
            x={poX - 44}
            y={chartTop - 18}
            width="88"
            height="14"
            rx="3"
            fill="#D97706"
          />
          <text
            x={poX}
            y={chartTop - 8}
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill="#FFFFFF"
            fontFamily="sans-serif"
          >
            Truck Arrives 18:40
          </text>

          {/* X-axis tick labels */}
          {hourTicks.map((hour) => {
            const x = hourToX(hour);
            const label = `${hour.toString().padStart(2, "0")}:00`;
            return (
              <g key={hour}>
                <line
                  x1={x}
                  y1={chartBottom}
                  x2={x}
                  y2={chartBottom + 4}
                  stroke="#78716C"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={chartBottom + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#78716C"
                  fontFamily="monospace"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend & Metric Proof */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#EAE6DF] text-[10px] text-[#78716C]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2 bg-[#2563EB] rounded-xs" />
            <span>Sales Done</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 border-t-2 border-dashed border-[#2563EB]" />
            <span>Demand Forecast ({burnRate}/hr)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#E11D48]" />
            <span>Runs Out (~{runsOutAtTime})</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#D97706]" />
            <span>Truck (Too Late)</span>
          </span>
        </div>
        <span className="font-mono text-[#1C1917] font-semibold">
          Sales Rate: {burnRate}/hr · Covers: {runsOutInHours.toFixed(1)}h
        </span>
      </div>
    </div>
  );
}

// Backward compatibility alias
export const QueueChart = DemandChart;
