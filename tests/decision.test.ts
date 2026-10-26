import { describe, it, expect, beforeEach, afterAll } from "vitest";
import dotenv from "dotenv";
dotenv.config();

import { db } from "../lib/db";
import { seedDatabase } from "../lib/db/seed";
import {
  calculateSafetyCushionAndSurplus,
  evaluateTransferProposal,
  resolveSimultaneousStockouts,
  getStoreSurplus,
  findCandidateSendingStores,
  generateReplenishmentRecommendation,
  evaluateMultiStoreReplenishment,
} from "../lib/engine/decision";

describe("Decision & Safety Engine (Task 2.4)", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await db.end();
  });

  describe("Pure Safety Cushion & Surplus Math", () => {
    it("calculates exact safety cushion and available surplus for Bandra Amul Milk", () => {
      // Bandra: 112 units on hand, 60 units projected demand, 20% cushion
      const result = calculateSafetyCushionAndSurplus(112, 60, 0.20);

      expect(result.currentStock).toBe(112);
      expect(result.projectedDemand).toBe(60);
      expect(result.safetyCushionPct).toBe(0.20);
      expect(result.safetyCushionUnits).toBe(12); // 60 * 0.20 = 12
      expect(result.requiredReserve).toBe(72);     // 60 + 12 = 72
      expect(result.availableSurplus).toBe(40);    // 112 - 72 = 40
      expect(result.canFulfill(40)).toBe(true);
      expect(result.canFulfill(41)).toBe(false);
      expect(result.allowedTransferQty(50)).toBe(40);
    });

    it("handles zero stock or stock below required reserve", () => {
      const belowReserve = calculateSafetyCushionAndSurplus(50, 60, 0.20);
      expect(belowReserve.requiredReserve).toBe(72);
      expect(belowReserve.availableSurplus).toBe(0);
      expect(belowReserve.canFulfill(1)).toBe(false);
      expect(belowReserve.allowedTransferQty(10)).toBe(0);

      const zeroStock = calculateSafetyCushionAndSurplus(0, 30, 0.20);
      expect(zeroStock.availableSurplus).toBe(0);
    });

    it("evaluates transfer proposal: approves safe transfers and scales down unsafe ones", () => {
      // Safe transfer: 40 units from 112 stock (reserve 72)
      const safe = evaluateTransferProposal(112, 60, 0.20, 40, "Bandra");
      expect(safe.isSafe).toBe(true);
      expect(safe.action).toBe("approve");
      expect(safe.approvedQty).toBe(40);
      expect(safe.sendingStoreRemainingStock).toBe(72);
      expect(safe.sendingStoreDeficit).toBe(0);

      // Unsafe transfer: 50 units requested (would leave 62, breaching 72 reserve by 10)
      const unsafe = evaluateTransferProposal(112, 60, 0.20, 50, "Bandra");
      expect(unsafe.isSafe).toBe(false);
      expect(unsafe.action).toBe("scale_down");
      expect(unsafe.approvedQty).toBe(40);
      expect(unsafe.sendingStoreDeficit).toBe(10);
      expect(unsafe.reason).toContain("breach Bandra's safety cushion by 10 units");

      // No surplus: stock already below reserve
      const blocked = evaluateTransferProposal(50, 60, 0.20, 10, "Bandra");
      expect(blocked.isSafe).toBe(false);
      expect(blocked.action).toBe("block");
      expect(blocked.approvedQty).toBe(0);

      // Zero or negative requested quantity
      const zeroQty = evaluateTransferProposal(112, 60, 0.20, 0, "Bandra");
      expect(zeroQty.isSafe).toBe(false);
      expect(zeroQty.action).toBe("block");
    });
  });

  describe("Simultaneous Stockout Multi-Store Tie-Breaking (ADR 0006)", () => {
    it("allocates surplus prioritizing highest sales velocity at risk and distributes odd remainders to rank 1", () => {
      // 41 units of surplus available across equal need (30 each)
      // Andheri has sales velocity 20.25 ₹/min
      // Powai has sales velocity 13.16 ₹/min
      const candidateStores = [
        { storeId: "powai", storeName: "Powai", neededQty: 30, salesVelocityPerMinute: 13.16 },
        { storeId: "andheri-west", storeName: "Andheri West", neededQty: 30, salesVelocityPerMinute: 20.25 },
      ];

      const allocations = resolveSimultaneousStockouts(41, candidateStores);

      expect(allocations.length).toBe(2);
      // Andheri has rank 1 due to higher velocity (20.25 vs 13.16)
      expect(allocations[0].storeId).toBe("andheri-west");
      expect(allocations[0].priorityRank).toBe(1);
      expect(allocations[1].storeId).toBe("powai");
      expect(allocations[1].priorityRank).toBe(2);

      // Rank 1 gets the odd leftover unit (21 vs 20)
      expect(allocations[0].allocatedQty).toBe(21);
      expect(allocations[1].allocatedQty).toBe(20);

      const totalAllocated = allocations.reduce(
        (sum, item) => sum + item.allocatedQty,
        0
      );
      expect(totalAllocated).toBe(41);
    });

    it("fulfills all stores in full if sending store surplus is sufficient", () => {
      const candidateStores = [
        { storeId: "andheri-west", storeName: "Andheri West", neededQty: 20, salesVelocityPerMinute: 20.25 },
        { storeId: "powai", storeName: "Powai", neededQty: 15, salesVelocityPerMinute: 13.16 },
      ];

      const allocations = resolveSimultaneousStockouts(50, candidateStores);
      expect(allocations[0].allocatedQty).toBe(20);
      expect(allocations[1].allocatedQty).toBe(15);
    });
  });

  describe("Live Database Verification (Mumbai Dark Stores)", () => {
    it("proves Bandra transfer recommendation without causing Bandra deficit using live demand curves", async () => {
      // At 08:00 AM, Andheri West Amul Milk is critical (~50 mins left).
      // Bandra has 112 units on hand and live demand curves sum to 60 units for daytime replenishment.
      const recommendation = await generateReplenishmentRecommendation(
        "andheri-west",
        "amul-taaza-500",
        {
          hour: 8,
          neededQty: 40,
        }
      );

      expect(recommendation).not.toBeNull();
      if (!recommendation) return;

      expect(recommendation.type).toBe("van_transfer");
      if (recommendation.type === "van_transfer") {
        expect(recommendation.receivingStoreId).toBe("andheri-west");
        expect(recommendation.receivingStoreName).toBe("Andheri West");
        expect(recommendation.sendingStoreId).toBe("bandra");
        expect(recommendation.sendingStoreName).toBe("Bandra");
        expect(recommendation.recommendedTransferQty).toBe(40);
        expect(recommendation.sendingStoreSurplus).toBe(40);
        expect(recommendation.sendingStoreRequiredReserve).toBe(72);
        expect(recommendation.travelMinutes).toBe(45);
        expect(recommendation.incomingWarehousePo).toBe("PO-4471");
        expect(recommendation.warehouseEta).toBe("18:40");

        // Verify sending store safety: transferring 40 leaves 72 (112 - 40), exactly meeting reserve
        const bandraRemaining = 112 - recommendation.recommendedTransferQty;
        expect(bandraRemaining).toBeGreaterThanOrEqual(recommendation.sendingStoreRequiredReserve);
      }
    });

    it("correctly identifies Bandra as having surplus while Powai has zero surplus", async () => {
      const candidates = await findCandidateSendingStores("andheri-west", "amul-taaza-500", {
        hour: 8,
      });

      expect(candidates.length).toBe(2); // Bandra and Powai connect to Andheri
      const bandra = candidates.find((candidate) => candidate.storeId === "bandra");
      const powai = candidates.find((candidate) => candidate.storeId === "powai");

      expect(bandra).toBeDefined();
      expect(bandra?.availableSurplus).toBe(40);
      expect(bandra?.travelMinutes).toBe(45);

      expect(powai).toBeDefined();
      // Powai has 50 stock and its demand until warehouse arrival is > 50, so surplus is 0
      expect(powai?.availableSurplus).toBe(0);
    });

    it("falls back to Cart Rationing with priority dock receiving flag when no sending store has surplus", async () => {
      // Bounding window across all 24 hours drains surplus across all stores
      const recommendation = await generateReplenishmentRecommendation(
        "andheri-west",
        "amul-taaza-500",
        {
          hour: 8,
          fromHour: 6,
          untilHour: 22,
        }
      );

      expect(recommendation).not.toBeNull();
      if (!recommendation) return;

      expect(recommendation.type).toBe("cart_rationing");
      if (recommendation.type === "cart_rationing") {
        expect(recommendation.receivingStoreId).toBe("andheri-west");
        expect(recommendation.productId).toBe("amul-taaza-500");
        expect(recommendation.maxCartLimit).toBe(2);
        expect(recommendation.priorityDockReceiving).toBe(true);
        expect(recommendation.reason).toContain("Cart rationing limits orders to 2 units");
        expect(recommendation.incomingWarehousePo).toBe("PO-4471");
        expect(recommendation.warehouseEta).toBe("18:40");
      }
    });

    it("evaluates multi-store replenishment dispatch from Bandra surplus", async () => {
      const multiStoreResult = await evaluateMultiStoreReplenishment(
        "bandra",
        "amul-taaza-500",
        [
          { storeId: "andheri-west", storeName: "Andheri West", neededQty: 25, salesVelocityPerMinute: 20.25 },
          { storeId: "powai", storeName: "Powai", neededQty: 20, salesVelocityPerMinute: 13.16 },
        ],
        { hour: 8 }
      );

      expect(multiStoreResult).not.toBeNull();
      if (!multiStoreResult) return;

      expect(multiStoreResult.sendingStoreId).toBe("bandra");
      expect(multiStoreResult.availableSurplus).toBe(40);
      expect(multiStoreResult.allocations.length).toBe(2);
      expect(multiStoreResult.allocations[0].storeId).toBe("andheri-west");
      expect(multiStoreResult.allocations[0].priorityRank).toBe(1);

      const totalAllocated = multiStoreResult.allocations.reduce(
        (sum, item) => sum + item.allocatedQty,
        0
      );
      expect(totalAllocated).toBe(40);
    });
  });
});
