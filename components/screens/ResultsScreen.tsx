"use client";

import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  RotateCw,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { HistorySummary, ReplayComparison } from "@/lib/types";
import { fetchHistoryOutcomes, fetchLatestRuns, runReplay } from "@/lib/api";
import { mapOutcomesToSummary } from "@/lib/mapper";
import { cn } from "@/lib/utils";
import { Badge, MetricTile, Button } from "@/components/ui";

const SPEC_RUPEE_ASSUMPTION =
  "Prices are synthetic catalog prices from seed_data.py. Calibrated to public quick commerce reports (CNBC-TV18, Jan 2026: gross margins ~15–18%, AOV ~Rs 695, waste ~1% of order value). Synthetic assumption, not actual business metrics.";

export function ResultsScreen({ isBackendOnline = false }: { isBackendOnline?: boolean }) {
  const [outcomes, setOutcomes] = useState<HistorySummary | null>(null);
  const [replayData, setReplayData] = useState<ReplayComparison | null>(null);
  const [isLoadingReplay, setIsLoadingReplay] = useState<boolean>(false);
  const [outcomeFilter, setOutcomeFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setErrorMsg(null);
    try {
      const [rawOutcomes, latestRuns] = await Promise.all([
        fetchHistoryOutcomes().catch(() => null),
        fetchLatestRuns().catch(() => null),
      ]);

      if (rawOutcomes) {
        setOutcomes(mapOutcomesToSummary(rawOutcomes));
      }
      if (latestRuns) {
        setReplayData(latestRuns);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load results from backend");
    }
  };

  useEffect(() => {
    loadData();
  }, [isBackendOnline]);

  const handleRunReplay = async () => {
    setIsLoadingReplay(true);
    setErrorMsg(null);
    try {
      const res = await runReplay(42, 24, 6, 3);
      setReplayData({
        has_runs: true,
        seed: res.seed,
        window_hours: res.window_hours,
        deterministic_note: res.deterministic_note,
        rupee_price_assumption: res.rupee_price_assumption,
        baseline: res.baseline,
        outpost: res.outpost,
        deltas: res.deltas,
        report: res.report,
      });
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Replay execution failed");
    } finally {
      setIsLoadingReplay(false);
    }
  };

  const records = outcomes?.records || [];
  const filteredRecords = records.filter((rec) => {
    if (outcomeFilter === "AVOIDED") {
      return (
        rec.outcomeStatus.toLowerCase().includes("prevented") ||
        rec.outcomeStatus.toLowerCase().includes("success")
      );
    }
    if (outcomeFilter === "WORSE") {
      return (
        rec.outcomeStatus.toLowerCase().includes("worse") ||
        rec.outcomeStatus.toLowerCase().includes("residual")
      );
    }
    if (outcomeFilter === "DISCOUNT") {
      return rec.actionTaken.toLowerCase().includes("discount");
    }
    if (outcomeFilter === "REJECTED") {
      return rec.actionTaken.toLowerCase().includes("reject");
    }
    return true;
  });

  const b = replayData?.baseline;
  const o = replayData?.outpost;
  const d = replayData?.deltas;

  return (
    <div className="space-y-5">
      {/* 1. Header & Replay Trigger */}
      <section className="bg-white border border-[#EAE6DF] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm" className="uppercase tracking-wide">
              Results &amp; Verification
            </Badge>
            <span className="text-xs text-[#57534E] font-medium">
              Real RunRecord measurements from the database
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-1">
            Same-seed replay compares Outpost autonomous reordering against a fixed baseline policy.
          </p>
        </div>

        <Button
          variant="dark"
          size="sm"
          onClick={handleRunReplay}
          disabled={isLoadingReplay}
          className="shrink-0"
        >
          <RotateCw className={cn("w-3.5 h-3.5 mr-1.5", isLoadingReplay && "animate-spin")} />
          {isLoadingReplay ? "Running Replay..." : "Run Same-Seed Replay"}
        </Button>
      </section>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Before / After Comparison: The Four Numbers from RunRecord Rows */}
      <section className="bg-white border border-[#EAE6DF] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAE6DF] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#1C1917] tracking-tight">
              Sequential Same-Seed Replay (Spec Section 5)
            </h3>
            <p className="text-xs text-[#78716C]">
              {replayData?.deterministic_note ||
                "Baseline policy (fixed lead-time reorder) vs Outpost policy (autonomous agent) on identical seed 42."}
            </p>
          </div>
          {replayData?.window_hours && (
            <Badge variant="neutral" size="sm">
              Window: {replayData.window_hours}h · Seed {replayData.seed ?? 42}
            </Badge>
          )}
        </div>

        {b && o && d ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Lost Sales */}
              <div className="p-3.5 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] space-y-2">
                <span className="text-xs font-bold text-[#57534E] uppercase tracking-wider block">
                  Lost Sales Units
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-[#1C1917]">
                    {o.lost_sales_units}u
                  </span>
                  <span
                    className={cn(
                      "text-xs font-mono font-bold flex items-center",
                      d.lost_sales_units_delta <= 0 ? "text-emerald-700" : "text-rose-700"
                    )}
                  >
                    {d.lost_sales_units_delta <= 0 ? (
                      <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                    )}
                    {d.lost_sales_units_delta > 0 ? `+${d.lost_sales_units_delta}` : d.lost_sales_units_delta}u
                  </span>
                </div>
                <div className="text-[11px] text-[#78716C] pt-1 border-t border-[#EAE6DF]">
                  Baseline: <strong className="font-mono text-[#44403C]">{b.lost_sales_units}u</strong>
                </div>
              </div>

              {/* Waste Units */}
              <div className="p-3.5 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] space-y-2">
                <span className="text-xs font-bold text-[#57534E] uppercase tracking-wider block">
                  Waste Units (Expired)
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-[#1C1917]">
                    {o.waste_units}u
                  </span>
                  <span
                    className={cn(
                      "text-xs font-mono font-bold flex items-center",
                      d.waste_units_delta <= 0 ? "text-emerald-700" : "text-rose-700"
                    )}
                  >
                    {d.waste_units_delta <= 0 ? (
                      <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                    )}
                    {d.waste_units_delta > 0 ? `+${d.waste_units_delta}` : d.waste_units_delta}u
                  </span>
                </div>
                <div className="text-[11px] text-[#78716C] pt-1 border-t border-[#EAE6DF]">
                  Baseline: <strong className="font-mono text-[#44403C]">{b.waste_units}u</strong>
                </div>
              </div>

              {/* Rupee Loss */}
              <div className="p-3.5 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#57534E] uppercase tracking-wider block">
                    Rupee Loss
                  </span>
                  <span
                    title={SPEC_RUPEE_ASSUMPTION}
                    className="text-[10px] text-[#2563EB] font-bold cursor-help"
                  >
                    *assumption
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-[#C2410C]">
                    Rs {o.rupee_loss.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-mono font-bold flex items-center",
                      d.rupee_loss_delta <= 0 ? "text-emerald-700" : "text-rose-700"
                    )}
                  >
                    {d.rupee_loss_delta <= 0 ? (
                      <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                    )}
                    {d.rupee_loss_delta > 0 ? `+Rs ${d.rupee_loss_delta}` : `Rs ${d.rupee_loss_delta}`}
                  </span>
                </div>
                <div className="text-[11px] text-[#78716C] pt-1 border-t border-[#EAE6DF]">
                  Baseline:{" "}
                  <strong className="font-mono text-[#44403C]">
                    Rs {b.rupee_loss.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Availability */}
              <div className="p-3.5 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5] space-y-2">
                <span className="text-xs font-bold text-[#57534E] uppercase tracking-wider block">
                  Availability Percent
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-[#059669]">
                    {o.availability_pct.toFixed(2)}%
                  </span>
                  <span
                    className={cn(
                      "text-xs font-mono font-bold flex items-center",
                      d.availability_pct_delta >= 0 ? "text-emerald-700" : "text-rose-700"
                    )}
                  >
                    {d.availability_pct_delta >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
                    )}
                    {d.availability_pct_delta >= 0 ? `+${d.availability_pct_delta.toFixed(2)}` : d.availability_pct_delta.toFixed(2)}%
                  </span>
                </div>
                <div className="text-[11px] text-[#78716C] pt-1 border-t border-[#EAE6DF]">
                  Baseline: <strong className="font-mono text-[#44403C]">{b.availability_pct.toFixed(2)}%</strong>
                </div>
              </div>
            </div>

            {/* Spec Section 5 Rupee Price Assumption Banner */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-blue-900">Rupee Price Assumption:</strong>{" "}
                <span className="text-blue-900/90">
                  {replayData?.rupee_price_assumption || SPEC_RUPEE_ASSUMPTION}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center rounded-xl bg-[#FAF8F5] border border-dashed border-[#EAE6DF] space-y-2">
            <p className="text-xs text-[#57534E]">
              No replay run records recorded in the database yet.
            </p>
            <Button
              variant="dark"
              size="sm"
              onClick={handleRunReplay}
              disabled={isLoadingReplay}
            >
              Run Replay Comparison (Baseline vs Outpost)
            </Button>
          </div>
        )}
      </section>

      {/* 3. Live Outcomes & Forecast Evaluation */}
      <section className="bg-white border border-[#EAE6DF] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#EAE6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#1C1917] tracking-tight">
              Live Audit Log &amp; Outcomes
            </h3>
            <p className="text-xs text-[#57534E]">
              {outcomes?.disclaimer || "Simulated execution audit trail"}
            </p>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: `All (${records.length})` },
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

        {/* Live Evaluation Tiles */}
        {outcomes && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-[#FAF8F5] border-b border-[#EAE6DF]">
            <MetricTile
              label="Resolved Items"
              value={<span className="text-[#1C1917] font-mono text-lg">{outcomes.resolvedCount}</span>}
              subtitle="Decisions audited"
            />
            <MetricTile
              label="Stockouts Prevented"
              value={<span className="text-[#059669] font-mono text-lg">{outcomes.stockoutsPreventedCount}</span>}
              subtitle="Zero shelf runouts"
            />
            <MetricTile
              label="Forecast Error"
              value={<span className="text-[#2563EB] font-mono text-lg">WAPE {outcomes.forecastWapePct}%</span>}
              subtitle={`Live MAE ${outcomes.forecastMaeUnits} units`}
            />
            <MetricTile
              label="Recorded Waste"
              value={<span className="text-[#D97706] font-mono text-lg">{outcomes.totalWasteUnits}u</span>}
              subtitle={`Rs ${outcomes.totalWasteInr} total spoiled`}
            />
          </div>
        )}

        {/* Structured Row Cards */}
        <div className="divide-y divide-[#EAE6DF]">
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#78716C]">
              {outcomes?.disclaimer === "no outcomes measured yet"
                ? "No outcomes measured yet. As simulation time advances and decisions execute, measured outcomes will appear here."
                : "No matching records found."}
            </div>
          ) : (
            filteredRecords.map((r) => {
              const isExpanded = expandedId === r.id;
              const isSuccess =
                r.outcomeStatus === "Stockout prevented" || r.outcomeStatus === "Success";
              const isUrgent = r.outcomeStatus === "Worse than expected";
              const isResidual = r.outcomeStatus === "Residual loss";

              return (
                <div key={r.id} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className={cn(
                      "w-full px-4 py-3.5 text-left transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3",
                      isExpanded
                        ? "bg-[#EFF6FF]/40 border-l-4 border-l-[#2563EB]"
                        : "hover:bg-[#FAF8F5] border-l-4 border-l-transparent"
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
            })
          )}
        </div>
      </section>
    </div>
  );
}

// Backward compatibility alias
export const OutcomesScreen = ResultsScreen;
