"use client";

import React, { useEffect, useState } from "react";
import type { HistorySummary } from "@/lib/types";
import { DEFAULT_HISTORY } from "@/lib/mockData";
import { fetchHistoryOutcomes } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge, SegmentedControl, MetricTile } from "@/components/ui";

export function OutcomesScreen({ isBackendOnline = false }: { isBackendOnline?: boolean }) {
  const [data, setData] = useState<HistorySummary>(DEFAULT_HISTORY);
  const [timeFilter, setTimeFilter] = useState<string>("today");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    if (timeFilter === "today") return rec.evaluatedAt.includes("Today");
    if (timeFilter === "yesterday") return rec.evaluatedAt.includes("Yesterday");
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. Header & Time Filter */}
      <section className="bg-white border border-[#EAE6DF] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge variant="success" className="uppercase tracking-wide text-[10px]">
            Audited Outcomes
          </Badge>
          <h2 className="text-xl font-bold text-[#1C1917] mt-1.5 tracking-tight">
            Measured Results &amp; Prediction Accuracy
          </h2>
          <p className="text-xs text-[#78716C] mt-1 max-w-2xl leading-relaxed">
            Every intervention is benchmarked against a paired counterfactual baseline. Forecast accuracy is evaluated via requested-demand WAPE and MAE over chronological windows.
          </p>
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

      {/* 2. 5 Rigorous Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricTile
          label="Resolved Exceptions"
          value={<span className="text-[#1C1917] font-mono">{data.resolvedCount}</span>}
          subtitle="Human approved"
        />
        <MetricTile
          label="Stockouts Avoided"
          value={<span className="text-[#059669] font-mono">{data.stockoutsPreventedCount}</span>}
          subtitle="No runouts observed"
        />
        <MetricTile
          label="Lost Sales Incurred"
          value={<span className="text-[#C2410C] font-mono">Rs {data.totalLostSalesInr}</span>}
          subtitle={`${data.totalLostSalesUnits} units unmet demand`}
        />
        <MetricTile
          label="Perishable Waste"
          value={<span className="text-[#D97706] font-mono">Rs {data.totalWasteInr}</span>}
          subtitle={`${data.totalWasteUnits} units spoiled`}
        />
        <MetricTile
          className="col-span-2 lg:col-span-1"
          label="Forecast Accuracy"
          value={<span className="text-[#2563EB] font-mono">WAPE {data.forecastWapePct}%</span>}
          subtitle={`MAE ${data.forecastMaeUnits}u (3-day holdout)`}
        />
      </div>

      {/* 3. Decision History Table */}
      <div className="bg-white border border-[#EAE6DF] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#EAE6DF] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1C1917] tracking-tight">
              Historical Outcomes Ledger
            </h3>
            <p className="text-[11px] text-[#78716C]">
              Includes successes, rejections, dynamic markdowns, and residual stockouts
            </p>
          </div>
          <Badge variant="neutral">
            {filteredRecords.length} Records Logged
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE6DF] text-[#78716C] font-semibold text-[11px]">
                <th className="py-2.5 px-4">Exception &amp; Store</th>
                <th className="py-2.5 px-4">Action Taken</th>
                <th className="py-2.5 px-4">Audited Outcome</th>
                <th className="py-2.5 px-4">Measured vs Expected</th>
                <th className="py-2.5 px-4">Verification Note</th>
                <th className="py-2.5 px-4 text-right">Evaluated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]">
              {filteredRecords.map((r) => {
                const isExpanded = expandedId === r.id;
                const isSuccess = r.outcomeStatus === "Stockout prevented" || r.outcomeStatus === "Success";
                const isUrgent = r.outcomeStatus === "Worse than expected";
                const isResidual = r.outcomeStatus === "Residual loss";

                return (
                  <React.Fragment key={r.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className={cn(
                        "hover:bg-[#FAF8F5] transition-colors cursor-pointer",
                        isExpanded && "bg-[#EFF6FF]/40"
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1C1917]">{r.productName}</div>
                        <div className="text-[11px] text-[#57534E]">{r.storeName}</div>
                      </td>
                      <td className="py-3 px-4 text-[#57534E] font-medium">
                        {r.actionTaken}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
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
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#1C1917]">
                        {r.measuredVsExpected}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-[#78716C] max-w-xs leading-relaxed truncate">
                        {r.notes}
                      </td>
                      <td className="py-3 px-4 text-right text-[11px] font-mono text-[#78716C]">
                        {r.evaluatedAt}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-[#FAF8F5]/80">
                        <td colSpan={6} className="py-3 px-4 border-t border-[#EAE6DF]/60 text-xs text-[#1C1917]">
                          <div className="p-3 bg-white rounded-xl border border-[#EAE6DF] space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-[#78716C]">
                              <span>Audited Post-Mortem Note:</span>
                              <span className="font-mono text-[10px]">Record ID: {r.id}</span>
                            </div>
                            <p className="text-xs text-[#1C1917] leading-relaxed">
                              {r.notes}
                            </p>
                            <div className="flex gap-4 pt-1 text-[11px] text-[#78716C] font-mono border-t border-[#EAE6DF]/40">
                              <span>Expected Runout: <strong className="text-[#C2410C]">{r.expectedLostUnits}u</strong></span>
                              <span>Actual Missed: <strong className="text-[#1C1917]">{r.actualLostUnits}u</strong></span>
                              <span>Waste Units: <strong className="text-[#D97706]">{r.wasteUnits}u (Rs {r.wasteValueInr})</strong></span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
