"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import type { HistorySummary } from "@/lib/types";
import { DEFAULT_HISTORY } from "@/lib/mockData";
import { fetchHistoryOutcomes } from "@/lib/api";
import { Badge, SegmentedControl, MetricTile } from "@/components/ui";

export function HistoryScreen({ isBackendOnline = false }: { isBackendOnline?: boolean }) {
  const [data, setData] = useState<HistorySummary>(DEFAULT_HISTORY);
  const [timeFilter, setTimeFilter] = useState<string>("today");

  // Fetch outcomes from centralized API helper
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
      {/* ─────────────────────────────────────────────────────────────────
          1. HEADER & TIME FILTER
      ───────────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#EAE6DF] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="success">
              AUDITED RESULTS
            </Badge>
            <span className="text-xs text-[#78716C]">COMPARED TO DOING NOTHING</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#1C1917] mt-1.5 tracking-tight">
            Past Results &amp; Accuracy
          </h2>
          <p className="text-xs md:text-sm text-[#78716C] mt-1 max-w-2xl leading-relaxed">
            See how past van transfers and stock actions performed. Every decision is verified against what would have happened if no action was taken.
          </p>
        </div>

        {/* Day Filter Segmented Track */}
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

      {/* ─────────────────────────────────────────────────────────────────
          2. 5 PLAIN METRIC TILES
      ───────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <MetricTile
          label="Stockouts Prevented"
          value={<span className="text-emerald-700">{data.stockoutsPrevented}</span>}
          subtitle={<span className="text-emerald-700 font-medium">Shelves stayed full</span>}
        />
        <MetricTile
          label="Zero Lost Stock"
          value="100%"
          subtitle="Preserved in transit"
        />
        <MetricTile
          label="Money Saved Today"
          value={<span className="text-[#2563EB]">₹{data.moneySavedInr}</span>}
          subtitle={<span className="text-blue-700 font-medium">Sales recovered</span>}
        />
        <MetricTile
          label="Prediction Accuracy"
          value={`${data.accuracyRatePct}%`}
          subtitle="Within 2 units variance"
        />
        <MetricTile
          label="Total Decisions Logged"
          value={data.totalDecisions}
          subtitle={<span className="text-emerald-700 font-medium">100% human sign-off</span>}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          3. DECISION HISTORY TABLE (ACTUAL VS NO-ACTION COUNTERFACTUAL)
      ───────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#EAE6DF] rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-[#F0ECE4] bg-[#FAF8F5] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1C1917] tracking-tight">
              Decision History &amp; Store Audits
            </h3>
            <p className="text-xs text-[#78716C] mt-0.5">
              Verified record of every stock alert, van move, and customer order outcome.
            </p>
          </div>
          <Badge variant="neutral">
            Showing {filteredRecords.length} records
          </Badge>
        </div>

        {/* Sleek Linear-Style Decision History Ledger */}
        <div className="divide-y divide-[#EAE6DF]">
          {filteredRecords.map((rec) => {
            const isSaved = rec.outcomeStatus === "Stockout prevented" || rec.outcomeStatus === "Success";
            const isPartial = rec.outcomeStatus === "Residual loss";
            const isWorse = rec.outcomeStatus === "Worse than expected";

            return (
              <div
                key={rec.id}
                className="p-3.5 sm:px-5 flex items-center justify-between gap-4 transition-colors hover:bg-[#FAF8F5] select-none"
              >
                {/* Left Cluster: Timestamp, Store Hub Badge, SKU */}
                <div className="flex items-center gap-2.5 min-w-0 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1C1917] shrink-0">
                    <Clock className="w-3.5 h-3.5 text-[#A8A29E]" />
                    <span>{rec.evaluatedAt}</span>
                  </div>
                  <Badge variant="neutral">
                    {rec.storeName.replace(" Store", "")}
                  </Badge>
                  <span className="font-bold text-sm text-[#1C1917] truncate">
                    {rec.productName}
                  </span>
                </div>

                {/* Center Cluster: Action Executed (Fluid, truncates cleanly) */}
                <div className="hidden lg:flex items-center min-w-0 flex-1 px-2">
                  <span className="text-xs text-[#57534E] truncate">
                    &rarr; {rec.actionTaken}
                  </span>
                </div>

                {/* Right Cluster: Counterfactual Outcome, Waste & Audit Status Pill */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{rec.measuredVsExpected}</span>
                  </div>

                  {rec.wasteValueInr > 0 ? (
                    <span className="text-xs font-semibold text-rose-700 tabular-nums">
                      ₹{rec.wasteValueInr} expired
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-emerald-700">
                      Zero waste
                    </span>
                  )}

                  <Badge
                    variant={
                      isSaved
                        ? "success"
                        : isPartial
                        ? "warning"
                        : isWorse
                        ? "urgent"
                        : "neutral"
                    }
                  >
                    {rec.outcomeStatus === "Stockout prevented"
                      ? "Stockout Prevented"
                      : rec.outcomeStatus === "Success"
                      ? "Restocked Safely"
                      : rec.outcomeStatus === "Residual loss"
                      ? "Partial Buffer"
                      : rec.outcomeStatus === "Worse than expected"
                      ? "Items Expired"
                      : "Van Skipped"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
