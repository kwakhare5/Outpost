"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, ShieldCheck } from "lucide-react";
import type { HistorySummary } from "@/lib/types";
import { DEFAULT_HISTORY } from "@/lib/mockData";
import { fetchHistoryOutcomes } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge, SegmentedControl, MetricTile } from "@/components/ui";

export function ResultsScreen({ isBackendOnline = false }: { isBackendOnline?: boolean }) {
  const [data, setData] = useState<HistorySummary>(DEFAULT_HISTORY);
  const [timeFilter, setTimeFilter] = useState<string>("today");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>("HIST-01");

  useEffect(() => {
    let mounted = true;
    fetchHistoryOutcomes().then((result) => {
      if (mounted && result) {
        setData(result);
      }
    });
    return () => {
      mounted = false;
    };
  }, [isBackendOnline]);

  const filteredRecords = data.records.filter((rec) => {
    // Time filter
    if (timeFilter === "today" && !rec.evaluatedAt.includes("Today")) return false;
    if (timeFilter === "yesterday" && !rec.evaluatedAt.includes("Yesterday")) return false;

    // Outcome category filter
    if (outcomeFilter === "AVOIDED") {
      return rec.outcomeStatus.toLowerCase().includes("prevented") || rec.outcomeStatus.toLowerCase().includes("success");
    }
    if (outcomeFilter === "WORSE") {
      return rec.outcomeStatus.toLowerCase().includes("worse") || rec.outcomeStatus.toLowerCase().includes("residual");
    }
    if (outcomeFilter === "DISCOUNT") {
      return rec.actionTaken.toLowerCase().includes("discount");
    }
    if (outcomeFilter === "REJECTED") {
      return rec.actionTaken.toLowerCase().includes("reject");
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. Header Filter Bar */}
      <section className="bg-white border border-[#EAE6DF] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="success" size="sm" className="uppercase tracking-wide">
            Past Results
          </Badge>
          <span className="text-xs text-[#57534E] font-medium">
            Comparing decisions against doing nothing
          </span>
        </div>

        {/* Day Filter Track */}
        <SegmentedControl
          items={[
            { id: "today", label: "Today (Sat 3 Oct)" },
            { id: "yesterday", label: "Yesterday (Fri 2 Oct)" },
            { id: "all", label: "Past 7 Days" },
          ]}
          value={timeFilter}
          onChange={setTimeFilter}
        />
      </section>

      {/* 2. 5 Clean Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <MetricTile
          label="Resolved Items"
          value={<span className="text-[#1C1917] font-mono text-xl">{data.resolvedCount}</span>}
          subtitle="Decisions taken"
        />
        <MetricTile
          label="Stockouts Prevented"
          value={<span className="text-[#059669] font-mono text-xl">{data.stockoutsPreventedCount}</span>}
          subtitle="Zero shelf runouts"
        />
        <MetricTile
          label="Lost Sales"
          value={<span className="text-[#C2410C] font-mono text-xl">Rs {data.totalLostSalesInr}</span>}
          subtitle={`${data.totalLostSalesUnits} units missed demand`}
        />
        <MetricTile
          label="Spoiled Stock"
          value={<span className="text-[#D97706] font-mono text-xl">Rs {data.totalWasteInr}</span>}
          subtitle={`${data.totalWasteUnits} units expired`}
        />
        <MetricTile
          className="col-span-2 lg:col-span-1"
          label="Forecast Error"
          value={<span className="text-[#2563EB] font-mono text-xl">WAPE {data.forecastWapePct}%</span>}
          subtitle={`MAE ${data.forecastMaeUnits} units`}
        />
      </div>

      {/* 3. Decision History Cards / Linear-Style Rows */}
      <div className="bg-white border border-[#EAE6DF] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#EAE6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#1C1917] tracking-tight">
              Historical Decisions &amp; Outcomes
            </h3>
            <p className="text-xs text-[#57534E]">
              Click any row to view before/after comparison
            </p>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: `All (${data.records.length})` },
              { id: "AVOIDED", label: "Stockouts Avoided" },
              { id: "WORSE", label: "Residual Loss" },
              { id: "DISCOUNT", label: "Discounts" },
              { id: "REJECTED", label: "Rejected" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setOutcomeFilter(f.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                  outcomeFilter === f.id
                    ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                    : "bg-[#FAF8F5] text-[#57534E] border-[#EAE6DF] hover:bg-white"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Structured Row Cards */}
        <div className="divide-y divide-[#EAE6DF]">
          {filteredRecords.map((r) => {
            const isExpanded = expandedId === r.id;
            const isSuccess = r.outcomeStatus === "Stockout prevented" || r.outcomeStatus === "Success";
            const isUrgent = r.outcomeStatus === "Worse than expected";
            const isResidual = r.outcomeStatus === "Residual loss";

            return (
              <div key={r.id} className="transition-colors">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className={cn(
                    "w-full px-4 py-3.5 text-left transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3",
                    isExpanded ? "bg-[#EFF6FF]/40 border-l-4 border-l-[#2563EB]" : "hover:bg-[#FAF8F5] border-l-4 border-l-transparent"
                  )}
                >
                  <div className="flex items-start md:items-center gap-3 min-w-0">
                    <span className="text-[#78716C] mt-0.5 md:mt-0 shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-[#2563EB]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[#78716C]" />
                      )}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1C1917]">{r.productName}</span>
                        <span className="text-xs text-[#57534E] font-medium">· {r.storeName}</span>
                      </div>
                      <p className="text-xs text-[#57534E] mt-0.5">
                        Action: <strong className="text-[#1C1917]">{r.actionTaken}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pl-7 md:pl-0">
                    <Badge
                      size="sm"
                      variant={
                        isSuccess
                          ? "success"
                          : isUrgent
                          ? "urgent"
                          : isResidual
                          ? "warning"
                          : "neutral"
                      }
                      dot={isSuccess || isUrgent || isResidual}
                    >
                      {r.outcomeStatus}
                    </Badge>

                    <span className="font-mono text-xs font-bold text-[#1C1917] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#EAE6DF]">
                      {r.measuredVsExpected}
                    </span>

                    <span className="text-xs font-mono text-[#78716C]">
                      {r.evaluatedAt}
                    </span>
                  </div>
                </button>

                {/* Expandable Comparison Drawer */}
                {isExpanded && (
                  <div className="p-4 bg-[#FAF8F5]/80 border-t border-[#EAE6DF]/70 text-xs text-[#1C1917]">
                    <div className="p-4 bg-white rounded-xl border border-[#EAE6DF] space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-[#57534E]">
                        <span>Audited Decision Comparison:</span>
                        <span className="font-mono text-xs text-[#78716C]">Record ID: {r.id}</span>
                      </div>

                      {/* Side-by-Side Comparison Card */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {/* With Outpost Decision */}
                        <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            <span>With Outpost Decision:</span>
                          </div>
                          <p className="text-xs text-emerald-950 font-semibold">{r.actionTaken}</p>
                          <p className="text-xs text-emerald-800">
                            Outcome: <strong>{r.outcomeStatus}</strong> ({r.measuredVsExpected})
                          </p>
                        </div>

                        {/* Without Action (Do Nothing) */}
                        <div className="p-3 rounded-lg bg-stone-50 border border-[#EAE6DF] space-y-1">
                          <div className="flex items-center gap-1.5 text-[#57534E] font-bold text-xs">
                            <AlertTriangle className="h-4 w-4 text-[#C2410C]" />
                            <span>Without Action (Do Nothing Baseline):</span>
                          </div>
                          <p className="text-xs text-[#1C1917] font-semibold">
                            Projected Runout: {r.expectedLostUnits} units lost
                          </p>
                          <p className="text-xs text-[#57534E]">
                            Actual Missed: {r.actualLostUnits} units · Waste: {r.wasteUnits} units
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-[#57534E] leading-relaxed pt-1 border-t border-[#EAE6DF]">
                        <strong>Audit Note:</strong> {r.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Backward compatibility alias
export const OutcomesScreen = ResultsScreen;
