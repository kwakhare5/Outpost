"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Info,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Tag,
  Truck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { StoreHub, DeckTab, AlertItem } from "@/lib/types";
import { DEFAULT_ALERTS } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { Badge, Button, SegmentedControl, MetricTile } from "@/components/ui";

interface AlertsScreenProps {
  stores: StoreHub[];
  isTransferred: boolean;
  onExecuteTransfer: () => void;
  onReset: () => void;
  onTriggerScenario: (name: string) => void;
  activeScenario: string;
  onOpenTestLab: () => void;
  onNavigateTab: (tab: DeckTab) => void;
  isBackendOnline?: boolean;
}

export function AlertsScreen({
  stores,
  isTransferred,
  onExecuteTransfer,
  onReset,
  onTriggerScenario,
  activeScenario,
  onOpenTestLab,
  onNavigateTab,
}: AlertsScreenProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [selectedAlertId, setSelectedAlertId] = useState<string>("ALERT-01");
  const [showRejectAlternative, setShowRejectAlternative] = useState(false);
  const [isEmergencyPoTriggered, setIsEmergencyPoTriggered] = useState(false);
  const [isScenarioDropdownOpen, setIsScenarioDropdownOpen] = useState(false);

  const lowerParelStore = stores.find((s) => s.code === "ST-04" || s.name.includes("Lower Parel")) || stores[3] || stores[0];
  const bandraStore = stores.find((s) => s.code === "ST-02" || s.name.includes("Bandra")) || stores[1];

  const alerts: AlertItem[] = DEFAULT_ALERTS.map((a) => {
    if (a.id === "ALERT-01") {
      return {
        ...a,
        storeCode: lowerParelStore?.code || a.storeCode,
        storeName: lowerParelStore?.name || a.storeName,
        stockOnShelves: lowerParelStore?.milkUnits ?? a.stockOnShelves,
        suggestedAction: isTransferred ? "Van on the Way (Arriving 10:15 AM)" : a.suggestedAction,
        status: isTransferred ? ("Van on the Way" as const) : a.status,
        sendingStoreCode: bandraStore?.code || a.sendingStoreCode,
        sendingStoreName: bandraStore?.name || a.sendingStoreName,
        senderStartingStock: isTransferred ? (bandraStore?.milkUnits ?? 28) + 20 : (bandraStore?.milkUnits ?? 48),
      };
    }
    return a;
  });

  const filteredAlerts = alerts.filter((a) => {
    if (selectedFilter === "ALL") return true;
    if (selectedFilter === "URGENT") return a.urgency === "urgent";
    if (selectedFilter === "DAIRY") return a.category === "Dairy";
    if (selectedFilter === "BAKERY") return a.category === "Bakery" || a.category === "Pantry";
    return a.storeCode === selectedFilter;
  });

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || alerts[0];
  const senderResidual = Math.max(0, selectedAlert.senderStartingStock - selectedAlert.transferQuantity);
  const senderBufferSafe = Math.max(0, senderResidual - selectedAlert.senderLocalDemand);

  const criticalStoresCount = stores.filter((s) => s.milkUnits <= 12 || s.statusType === "critical").length;
  const totalStockUnits = stores.reduce((acc, s) => acc + s.milkUnits, 0);

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────────
          1. MORNING BRIEFING BANNER
      ───────────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="urgent">
                Morning Store Briefing · 8:15 AM
              </Badge>
              <span className="text-xs text-[#78716C] font-semibold">Mumbai Network</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] mt-1.5 tracking-tight leading-snug">
              Complete Control Over Your Store Stock.
            </h2>
            <p className="text-xs sm:text-sm text-[#78716C] mt-1 leading-relaxed font-normal">
              Autonomous stockout warnings, verified cross-dock van transfers, and zero lost customer orders across Mumbai.
            </p>
          </div>

          {/* Clean Scenario Toggle Dropdown Menu */}
          <div className="relative self-start lg:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsScenarioDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F5F2EB] text-[#1C1917] border border-[#EAE6DF] text-xs font-semibold cursor-pointer transition-all active:scale-[0.98] shadow-xs"
            >
              <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Simulate Scenario</span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-[#78716C] transition-transform duration-150",
                  isScenarioDropdownOpen && "rotate-180"
                )}
              />
            </button>

            {isScenarioDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsScenarioDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-60 bg-white border border-[#EAE6DF] rounded-xl shadow-lg p-1.5 z-40 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    onTriggerScenario("demand_spike");
                    setIsScenarioDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer",
                    activeScenario === "demand_spike"
                      ? "bg-[#EFF6FF] text-[#2563EB] font-bold"
                      : "hover:bg-[#FAF8F5] text-[#1C1917]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Match Rush (2.5x Orders)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onTriggerScenario("supplier_delay");
                    setIsScenarioDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer",
                    activeScenario === "supplier_delay"
                      ? "bg-[#EFF6FF] text-[#2563EB] font-bold"
                      : "hover:bg-[#FAF8F5] text-[#1C1917]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-rose-500" />
                    <span>Highway Jam (+4h Delay)</span>
                  </div>
                </button>

                <div className="border-t border-[#F0ECE4] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    setIsScenarioDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-[#FAF8F5] text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#78716C]" />
                  <span>Reset to Normal Mumbai</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenTestLab();
                    setIsScenarioDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 bg-[#1C1917] text-white hover:bg-[#292524] font-semibold transition-colors cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-white" />
                  <span>Open What-If Sandbox &rarr;</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          2. PRIME CENTER-STAGE HERO: CLEAN WHITE ENTERPRISE CARD
      ───────────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#EAE6DF] text-[#1C1917] rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden space-y-5">
        {/* Tier 1: Header Badges & Headline Problem */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="urgent">
                Most Urgent Alert
              </Badge>
              <Badge variant="neutral">
                {selectedAlert.storeName}
              </Badge>
            </div>
            <Badge variant="success">
              +₹{selectedAlert.moneySaved} Money Saved
            </Badge>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1C1917] leading-snug">
              {selectedAlert.storeName} runs out of {selectedAlert.productName} in ~{selectedAlert.runsOutInHours} hours.
            </h3>
            <p className="text-xs sm:text-sm text-[#57534E] max-w-2xl leading-relaxed font-normal">
              Customers are buying quickly (~{selectedAlert.orderSpeedPerHour} units/hr). {selectedAlert.sendingStoreName || "Bandra West Store"} has surplus stock on shelves and can safely transfer {selectedAlert.transferQuantity} packets before shelves empty at {selectedAlert.runsOutAtTime}.
            </p>
          </div>
        </div>

        {/* Tier 2: 3-Chip Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF]">
            <span className="text-[#78716C] block text-[11px] font-bold uppercase tracking-wider">STOCK ON SHELVES</span>
            <p className="text-xl font-bold text-[#1C1917] mt-0.5 tabular-nums">{selectedAlert.stockOnShelves} units</p>
            <span className="text-[#78716C] text-xs block mt-0.5">Min Buffer: 12 units</span>
          </div>

          <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF]">
            <span className="text-[#78716C] block text-[11px] font-bold uppercase tracking-wider">ORDER SPEED</span>
            <p className="text-xl font-bold text-[#1C1917] mt-0.5 tabular-nums">~{selectedAlert.orderSpeedPerHour} units / hour</p>
            <span className="text-[#78716C] text-xs block mt-0.5">Real customer orders</span>
          </div>

          <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF]">
            <span className="text-[#78716C] block text-[11px] font-bold uppercase tracking-wider">MONEY AT RISK</span>
            <p className="text-xl font-bold text-[#C2410C] mt-0.5 tabular-nums">₹{selectedAlert.moneyAtRisk}</p>
            <span className="text-[#78716C] text-xs block mt-0.5">Lost sales if shelves empty</span>
          </div>
        </div>

        {/* Tier 3: Visual Timeline Progress Bar with Scrubber */}
        <div className="pt-1 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#78716C] font-semibold">
            <span>8:15 AM (Now: {selectedAlert.stockOnShelves} units on shelf)</span>
            <span className="text-[#C2410C] font-bold bg-[#FFEDD5] border border-[#FDBA74] px-2 py-0.5 rounded-full">
              {selectedAlert.runsOutAtTime} (Empty Shelves Risk)
            </span>
            <span>6:40 PM (Warehouse Truck)</span>
          </div>
          <div className="w-full bg-[#FAF8F5] h-3 rounded-full relative overflow-visible border border-[#EAE6DF]">
            <div className="bg-[#2563EB] h-full rounded-full w-[45%]" />
            <div className="h-5 w-5 rounded-full bg-white shadow-sm border-2 border-[#2563EB] absolute top-1/2 -translate-y-1/2 left-[45%] -translate-x-1/2 flex items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
            </div>
          </div>
        </div>

        {/* Tier 4: Contextual Problem & Safety Cards */}
        {selectedAlert.actionCategory === "TRANSFER" || selectedAlert.id === "ALERT-01" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Warehouse Truck Delay Warning */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-amber-900 block mb-0.5">Warehouse Truck arrives at 6:40 PM:</strong>
                80 packets scheduled from Bhiwandi. That is too late! Shelves will stay completely empty for 5.5 hours unless we send a van from Bandra now.
              </div>
            </div>

            {/* Bandra Safety Proof */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="font-bold text-emerald-900 block mb-0.5">Bandra Store Safety Verified:</strong>
                <p className="text-emerald-900 leading-relaxed">
                  Bandra has {selectedAlert.senderStartingStock} units. After sending {selectedAlert.transferQuantity} units, it keeps {senderResidual} units. Bandra shoppers only need {selectedAlert.senderLocalDemand} units today (+{senderBufferSafe}u extra safe buffer).
                </p>
              </div>
            </div>
          </div>
        ) : selectedAlert.actionCategory === "DISCOUNT" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-4 bg-orange-50/80 border border-orange-200 rounded-xl text-xs text-orange-950 flex items-start gap-3">
              <Tag className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-orange-900 block mb-0.5">Expiry Risk Detected (6h Shelf Life):</strong>
                {selectedAlert.stockOnShelves} units expiring today. At current order velocity ({selectedAlert.orderSpeedPerHour} units/hr), {Math.max(1, selectedAlert.stockOnShelves - 5)} units will spoil without promotional intervention.
              </div>
            </div>
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-emerald-900 block mb-0.5">Dynamic Markdown ROI:</strong>
                Applying a 20% in-app flash markdown accelerates sales by 3.4x, recovering ₹{selectedAlert.moneySaved} in salvage value with zero dump waste.
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-950 flex items-start gap-3">
              <Truck className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-blue-900 block mb-0.5">Scheduled Replenishment Pipeline:</strong>
                Inbound PO-4902 from Bhiwandi RFC is on schedule. ETA: 12:30 PM ({selectedAlert.stockOnShelves} units currently holding shelf buffer).
              </div>
            </div>
            <div className="p-4 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl text-xs text-[#57534E] flex items-start gap-3">
              <Info className="w-4 h-4 text-[#78716C] shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-[#1C1917] block mb-0.5">Monitoring Active Consumption:</strong>
                Real-time velocity tracking is active. System will escalate to high-priority transfer if order velocity exceeds 8 units/hr.
              </div>
            </div>
          </div>
        )}

        {/* Tier 5: Contextual Action Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#F0ECE4]">
          {selectedAlert.id === "ALERT-01" ? (
            !isTransferred ? (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onExecuteTransfer}
                >
                  <Truck className="w-4 h-4 text-white" />
                  <span>Send Van from Bandra Now</span>
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => setShowRejectAlternative(!showRejectAlternative)}
                >
                  Reject Transfer
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-between w-full bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-950">
                    Van #MH-02 is on the road via Sea Link carrying 20 milk packets to Lower Parel.
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigateTab("deliveries")}
                >
                  Track Van &rarr;
                </Button>
              </div>
            )
          ) : selectedAlert.actionCategory === "DISCOUNT" ? (
            <Button
              variant="dark"
              size="lg"
              onClick={() => {
                toast.success(`Applied 20% Flash Discount to ${selectedAlert.productName}`, {
                  description: `Promoted to top carousel at ${selectedAlert.storeName}; ₹${selectedAlert.moneySaved} revenue protected.`,
                });
              }}
            >
              <Tag className="w-4 h-4 text-amber-400" />
              <span>Apply 20% In-App Flash Discount</span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                toast.info(`Alert Threshold Confirmed for ${selectedAlert.productName}`, {
                  description: `Monitoring hourly burn rate at ${selectedAlert.storeName}. Inbound truck scheduled.`,
                });
              }}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Acknowledge &amp; Monitor Velocity</span>
            </Button>
          )}
        </div>

        {/* Rejection Alternative Drawer */}
        {showRejectAlternative && !isTransferred && selectedAlert.id === "ALERT-01" && (
          <div className="p-4 bg-[#FAF8F5] text-[#1C1917] rounded-xl border border-[#EAE6DF] shadow-xs space-y-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-950">
                Alternative: Order Emergency Truck from Bhiwandi Warehouse
              </span>
              <Badge variant="urgent">
                HIGH COST
              </Badge>
            </div>
            <p className="text-[#57534E] leading-relaxed">
              If you reject moving stock from Bandra, the only alternative is paying an extra ₹450 expedite fee to rush a truck from Bhiwandi Warehouse (arriving ~2:30 PM).
            </p>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setIsEmergencyPoTriggered(true);
                setShowRejectAlternative(false);
              }}
              disabled={isEmergencyPoTriggered}
            >
              {isEmergencyPoTriggered ? "Emergency Truck Ordered" : "Order Emergency Truck (+₹450)"}
            </Button>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          3. 4 SUMMARY METRIC TILES (100% Dynamic Telemetry)
      ───────────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <MetricTile
          label="Stores Needing Action"
          value={`${criticalStoresCount} Stores`}
          badge={<Badge variant="urgent">Runs Out Soon</Badge>}
        />
        <MetricTile
          label="Vans on the Way"
          value={isTransferred ? "2 Vans" : "1 Van"}
          badge={<Badge variant="info">On Schedule</Badge>}
        />
        <MetricTile
          label="Money Saved Today"
          value="₹1,210"
          badge={<Badge variant="success">Protected Revenue</Badge>}
        />
        <MetricTile
          label="Zero Lost Stock Check"
          value={totalStockUnits + (isTransferred ? 20 : 0) === 140 ? "140u" : `${totalStockUnits}u`}
          badge={<Badge variant="success">100% Balanced</Badge>}
        />
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          4. ALL STORE STOCK ALERTS LIST (CLEAN ROUNDED CARDS)
      ───────────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-[#EAE6DF] shadow-xs overflow-hidden">
        {/* Header & Filter Pills */}
        <div className="p-4 sm:p-5 border-b border-[#F0ECE4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF8F5]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#1C1917] tracking-tight">
                All Store Stock Alerts
              </h3>
              <Badge variant="neutral">
                {filteredAlerts.length} active
              </Badge>
            </div>
            <p className="text-xs text-[#78716C] mt-0.5">
              Ranked by which store runs out of stock first. Click any alert to inspect details above.
            </p>
          </div>

          {/* Segmented Filter Pills Track */}
          <SegmentedControl
            items={[
              { id: "ALL", label: "All Alerts" },
              { id: "URGENT", label: "Urgent Only" },
              { id: "DAIRY", label: "Dairy Only" },
              { id: "BAKERY", label: "Bakery & Pantry" },
            ]}
            value={selectedFilter}
            onChange={setSelectedFilter}
          />
        </div>

        {/* Sleek Linear-Style Triage Queue */}
        <div className="divide-y divide-[#EAE6DF]">
          {filteredAlerts.map((item) => {
            const isSelected = item.id === selectedAlert.id;
            const isUrgent = item.urgency === "urgent";
            const isModerate = item.urgency === "moderate";

            return (
              <div
                key={item.id}
                onClick={() => setSelectedAlertId(item.id)}
                className={cn(
                  "p-3.5 sm:px-5 flex items-center justify-between gap-4 transition-all cursor-pointer border-l-4 select-none active:scale-[0.99]",
                  isSelected
                    ? "bg-[#EFF6FF] border-l-[#2563EB]"
                    : "border-l-transparent hover:bg-[#FAF8F5]"
                )}
              >
                {/* Left Cluster: Urgency Dot, Product SKU, Category & Store Pill */}
                <div className="flex items-center gap-2.5 min-w-0 shrink-0">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      isUrgent ? "bg-[#C2410C]" : isModerate ? "bg-[#B45309]" : "bg-emerald-500"
                    )}
                  />
                  <span className="font-bold text-sm text-[#1C1917] truncate">
                    {item.productName}
                  </span>
                  <Badge variant="neutral">
                    {item.storeName.replace(" Store", "")}
                  </Badge>
                </div>

                {/* Center Cluster: Action summary (Fluid, truncates cleanly) */}
                <div className="hidden lg:flex items-center min-w-0 flex-1 px-2">
                  <span className="text-xs text-[#57534E] truncate">
                    &rarr; {item.suggestedAction}
                  </span>
                </div>

                {/* Right Cluster: Telemetry & Status Pill */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <span className="font-mono text-xs font-bold text-[#1C1917] tabular-nums">
                    {item.stockOnShelves} <span className="font-sans font-normal text-xs text-[#78716C]">units</span>
                  </span>

                  <span className="hidden sm:inline font-mono text-xs text-[#78716C] tabular-nums">
                    ~{item.runsOutInHours}h left
                  </span>

                  <Badge
                    variant={
                      item.status === "Van on the Way"
                        ? "info"
                        : isUrgent
                        ? "urgent"
                        : isModerate
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
