import { describe, expect, it } from "vitest";

import { getDemoInventoryState } from "@/lib/demo-data";
import {
  calculateBomLineCost,
  calculateMaterialUnitCost,
  calculatePearlEstimate,
  calculateProductManufacturingCost,
  canProduce,
  createProductionBatch,
  fulfillOrder,
  getDashboardMetrics,
  getLowStockMaterials,
  getRecommendedPrice,
  recordPurchase,
} from "@/lib/services/inventory";
import { pearlCalculatorSchema, settingsSchema } from "@/lib/validations";

describe("pearl calculations", () => {
  it("estimates 12mm pearls from the corrected 10mm baseline", () => {
    const estimate = calculatePearlEstimate(12);

    expect(estimate.exactPcs).toBeCloseTo(19.0972, 4);
    expect(estimate.roundedPcs).toBe(19);
    expect(4500 / estimate.roundedPcs).toBeCloseTo(236.84, 2);
  });

  it("uses a manual counted quantity when available", () => {
    const cost = calculateMaterialUnitCost({
      packPrice: 4500,
      estimatedPcsPerPack: 19.0972,
      actualCountedPcsPerPack: 18,
      costPerUsageUnit: 0,
    });

    expect(cost).toBe(250);
  });
});

describe("costing", () => {
  it("calculates BOM line waste and cost", () => {
    const result = calculateBomLineCost({
      quantityRequired: 10,
      wastePercentage: 0.1,
      unitCost: 200,
    });

    expect(result.effectiveQuantity).toBe(11);
    expect(result.lineCost).toBe(2200);
  });

  it("calculates product manufacturing cost", () => {
    const state = getDemoInventoryState();
    const cost = calculateProductManufacturingCost(state, "prod-cherry-blossoms");

    expect(cost.materialCost).toBeGreaterThan(0);
    expect(cost.laborCost).toBe(6000);
    expect(cost.totalCost).toBeGreaterThan(cost.materialCost);
  });

  it("validates recommended price denominator", () => {
    expect(() => getRecommendedPrice(10000, 0.8, 0.3)).toThrow(
      /denominator|margin/i,
    );
    expect(getRecommendedPrice(10000, 0.45, 0.08)).toBeCloseTo(21276.6, 1);
  });
});

describe("inventory operations", () => {
  it("detects production shortages and limiting material", () => {
    const state = getDemoInventoryState();
    const feasibility = canProduce(state, "prod-cherry-blossoms", 10);

    expect(feasibility.canProduceRequested).toBe(false);
    expect(feasibility.limitingMaterial).toContain("12mm pearl");
  });

  it("creates a production batch with material and finished-good movements", () => {
    const state = getDemoInventoryState();
    const beforePearl = state.materialVariants.find(
      (variant) => variant.id === "var-pearl-12mm",
    )!;
    const result = createProductionBatch(state, {
      ownerId: state.settings.ownerId,
      productId: "prod-cherry-blossoms",
      quantityMade: 1,
      date: "2026-04-24",
    });
    const afterPearl = result.state.materialVariants.find(
      (variant) => variant.id === "var-pearl-12mm",
    )!;

    expect(result.batch.unitManufacturingCost).toBeGreaterThan(0);
    expect(afterPearl.stockQuantity).toBeLessThan(beforePearl.stockQuantity);
    expect(result.movements.some((move) => move.movementType === "production_output")).toBe(true);
    expect(result.movements.some((move) => move.movementType === "production_consumption")).toBe(true);
  });

  it("records purchase stock, latest cost, movements, and price history", () => {
    const state = getDemoInventoryState();
    const result = recordPurchase(state, {
      ownerId: state.settings.ownerId,
      supplierId: state.suppliers[0].id,
      date: "2026-04-24",
      shippingCost: 0,
      discount: 0,
      lines: [
        {
          materialVariantId: "var-pearl-12mm",
          quantityPurchased: 1,
          purchaseUnit: "pack",
          totalPrice: 4500,
          quantityAddedUsageUnit: 19,
        },
      ],
    });
    const variant = result.state.materialVariants.find(
      (item) => item.id === "var-pearl-12mm",
    )!;

    expect(variant.stockQuantity).toBe(39);
    expect(variant.costPerUsageUnit).toBeCloseTo(236.84, 2);
    expect(result.movements).toHaveLength(1);
    expect(result.state.materialPriceHistory[0].materialVariantId).toBe("var-pearl-12mm");
  });

  it("fulfills an order exactly once", () => {
    const state = getDemoInventoryState();
    const first = fulfillOrder(state, "order-demo-001");

    expect(first.order.stockDeducted).toBe(true);
    expect(first.movements).toHaveLength(1);
    expect(() => fulfillOrder(first.state, "order-demo-001")).toThrow(/already/i);
  });

  it("deducts repeated product lines as one fulfilled quantity", () => {
    const state = getDemoInventoryState();
    const productBefore = state.products.find((product) => product.id === "prod-cherry-blossoms")!;
    const result = fulfillOrder(
      {
        ...state,
        orderItems: [
          ...state.orderItems,
          {
            id: "order-item-demo-001-extra",
            ownerId: state.settings.ownerId,
            orderId: "order-demo-001",
            productId: "prod-cherry-blossoms",
            quantity: 1,
            unitSellingPrice: 35000,
            discountAllocated: 0,
            unitCost: 0,
            lineRevenue: 35000,
            lineCogs: 0,
            lineGrossProfit: 0,
            lineMargin: 0,
          },
        ],
      },
      "order-demo-001",
    );
    const productAfter = result.state.products.find((product) => product.id === "prod-cherry-blossoms")!;

    expect(productAfter.currentStock).toBe(productBefore.currentStock - 3);
    expect(productAfter.reservedStock).toBe(0);
    expect(result.movements).toHaveLength(2);
  });
});

describe("alerts and metrics", () => {
  it("finds low-stock materials", () => {
    const state = getDemoInventoryState();
    const lowStock = getLowStockMaterials(state);

    expect(lowStock.some((item) => item.variant.id === "var-pearl-12mm")).toBe(true);
  });

  it("calculates dashboard metrics", () => {
    const state = getDemoInventoryState();
    const metrics = getDashboardMetrics(state);

    expect(metrics.rawMaterialInventoryValue).toBeGreaterThan(0);
    expect(metrics.finishedGoodsInventoryValue).toBeGreaterThan(0);
    expect(metrics.pendingOrders).toBeGreaterThan(0);
  });
});

describe("zod validation", () => {
  it("rejects invalid pearl and settings inputs", () => {
    expect(pearlCalculatorSchema.safeParse({ sizeMm: 0, packPrice: 1, packWeightGram: 15 }).success).toBe(false);
    expect(settingsSchema.safeParse({
      targetMargin: 1.2,
      defaultPlatformFeeRate: 0.1,
      laborRatePerHour: 20000,
      allowNegativeStock: false,
    }).success).toBe(false);
  });
});
