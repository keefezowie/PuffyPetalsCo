import {
  calculatePearlEstimate,
  calculateProductManufacturingCost,
} from "@/lib/services/inventory";
import type {
  InventoryState,
  Material,
  MaterialVariant,
  Product,
  ProductBomLine,
  Supplier,
} from "@/lib/types";

const ownerId = "demo-owner";
const demoDate = new Date().toISOString();

const pearlSizes = [
  { sizeMm: 3, packPrice: 4085 },
  { sizeMm: 4, packPrice: 2990 },
  { sizeMm: 5, packPrice: 4500 },
  { sizeMm: 6, packPrice: 4500 },
  { sizeMm: 8, packPrice: 4500 },
  { sizeMm: 10, packPrice: 4500 },
  { sizeMm: 12, packPrice: 4500 },
  { sizeMm: 14, packPrice: 4500 },
];

export function getDemoInventoryState(): InventoryState {
  const suppliers: Supplier[] = [
    {
      id: "supplier-shopee-bobo",
      ownerId,
      name: "Shopee bObO Acc",
      channel: "Shopee",
      marketplaceUrl: "https://shopee.co.id",
      isPreferred: true,
      notes: "Sample supplier from current costing worksheet.",
    },
  ];

  const materials: Material[] = [
    {
      id: "mat-pearl",
      ownerId,
      name: "Pearl beads / manik-manik mutiara",
      category: "pearl",
      purchaseUnit: "pack",
      usageUnit: "pcs",
      conversionFactor: 19,
      conversionIsEstimated: true,
      minStock: 30,
      targetStock: 150,
      preferredSupplierId: suppliers[0].id,
      active: true,
      notes: "Pearl variants share the 15g pack purchase pattern.",
    },
    {
      id: "mat-copper-wire",
      ownerId,
      name: "Copper wire",
      category: "wire",
      purchaseUnit: "roll",
      usageUnit: "meter",
      conversionFactor: 50,
      conversionIsEstimated: true,
      minStock: 5,
      targetStock: 50,
      preferredSupplierId: suppliers[0].id,
      active: true,
      notes: "Sample conversion. Replace with measured meters per roll.",
    },
    {
      id: "mat-elastic",
      ownerId,
      name: "Elastic string",
      category: "string",
      purchaseUnit: "roll",
      usageUnit: "meter",
      conversionFactor: 20,
      conversionIsEstimated: true,
      minStock: 3,
      targetStock: 30,
      active: true,
      notes: "Sample data.",
    },
    {
      id: "mat-packaging",
      ownerId,
      name: "Packaging set",
      category: "packaging",
      purchaseUnit: "set",
      usageUnit: "set",
      conversionFactor: 1,
      conversionIsEstimated: false,
      minStock: 10,
      targetStock: 80,
      active: true,
      notes: "Box, label, and protective wrap grouped for MVP costing.",
    },
    {
      id: "mat-ribbon",
      ownerId,
      name: "Ribbon",
      category: "accessory",
      purchaseUnit: "roll",
      usageUnit: "meter",
      conversionFactor: 20,
      conversionIsEstimated: true,
      minStock: 4,
      targetStock: 25,
      active: true,
      notes: "Sample data.",
    },
    {
      id: "mat-glue",
      ownerId,
      name: "Glue",
      category: "adhesive",
      purchaseUnit: "pack",
      usageUnit: "gram",
      conversionFactor: 100,
      conversionIsEstimated: true,
      minStock: 20,
      targetStock: 200,
      active: true,
      notes: "Sample data.",
    },
  ];

  const pearlVariants: MaterialVariant[] = pearlSizes.map((item) => {
    const estimate = calculatePearlEstimate(item.sizeMm);
    return {
      id: `var-pearl-${item.sizeMm}mm`,
      ownerId,
      materialId: "mat-pearl",
      name: `${item.sizeMm}mm pearl`,
      sku: `PEARL-${item.sizeMm}MM-15G`,
      sizeMm: item.sizeMm,
      packWeightGram: 15,
      packPrice: item.packPrice,
      estimatedPcsPerPack: estimate.exactPcs,
      estimatedPcsPerPackRounded: estimate.roundedPcs,
      estimationStatus: "formula_estimated",
      costPerUsageUnit: item.packPrice / estimate.exactPcs,
      stockQuantity: item.sizeMm === 12 ? 20 : 0,
      usageUnit: "pcs",
      active: true,
      notes:
        item.sizeMm === 12
          ? "Current flowers use this size. Exact estimate is about 19.10 pcs per 15g; rounded planning count is 19 pcs."
          : "Formula-estimated from 10mm = 33 pcs per 15g baseline.",
    };
  });

  const variants: MaterialVariant[] = [
    ...pearlVariants,
    {
      id: "var-copper-wire-gold",
      ownerId,
      materialId: "mat-copper-wire",
      name: "Gold copper wire",
      color: "Gold",
      packPrice: 15000,
      estimationStatus: "sample_data",
      costPerUsageUnit: 300,
      stockQuantity: 18,
      usageUnit: "meter",
      active: true,
      notes: "Sample data: Rp300 per meter.",
    },
    {
      id: "var-elastic-clear",
      ownerId,
      materialId: "mat-elastic",
      name: "Clear elastic string",
      color: "Clear",
      packPrice: 12000,
      estimationStatus: "sample_data",
      costPerUsageUnit: 600,
      stockQuantity: 12,
      usageUnit: "meter",
      active: true,
      notes: "Sample data.",
    },
    {
      id: "var-packaging-standard",
      ownerId,
      materialId: "mat-packaging",
      name: "Standard packaging set",
      packPrice: 10000,
      estimationStatus: "sample_data",
      costPerUsageUnit: 1000,
      stockQuantity: 25,
      usageUnit: "set",
      active: true,
      notes: "Sample bundled packaging set.",
    },
    {
      id: "var-ribbon-blush",
      ownerId,
      materialId: "mat-ribbon",
      name: "Blush ribbon",
      color: "Blush",
      packPrice: 18000,
      estimationStatus: "sample_data",
      costPerUsageUnit: 900,
      stockQuantity: 9,
      usageUnit: "meter",
      active: true,
      notes: "Sample data.",
    },
    {
      id: "var-glue-clear",
      ownerId,
      materialId: "mat-glue",
      name: "Clear glue",
      packPrice: 20000,
      estimationStatus: "sample_data",
      costPerUsageUnit: 200,
      stockQuantity: 80,
      usageUnit: "gram",
      active: true,
      notes: "Sample data.",
    },
  ];

  const products: Product[] = [
    {
      id: "prod-cherry-blossoms",
      ownerId,
      name: "Cherry Blossoms",
      sku: "FLOWER-CHERRY-BLOSSOMS",
      category: "Flower",
      sellingPrice: 35000,
      laborMinutes: 18,
      laborRatePerHour: 20000,
      packagingCost: 1000,
      overheadCost: 1500,
      targetMargin: 0.45,
      currentStock: 6,
      reservedStock: 2,
      averageUnitManufacturingCost: 0,
      lastProductionCost: 0,
      active: true,
      photoUrl: "/flowers/cherry-blossoms.svg",
    },
    {
      id: "prod-orchid",
      ownerId,
      name: "Orchid",
      sku: "FLOWER-ORCHID",
      category: "Flower",
      sellingPrice: 45000,
      laborMinutes: 24,
      laborRatePerHour: 20000,
      packagingCost: 1000,
      overheadCost: 1800,
      targetMargin: 0.45,
      currentStock: 3,
      reservedStock: 1,
      averageUnitManufacturingCost: 0,
      lastProductionCost: 0,
      active: true,
      photoUrl: "/flowers/orchid.svg",
    },
    {
      id: "prod-hydrangea",
      ownerId,
      name: "Hydrangea",
      sku: "FLOWER-HYDRANGEA",
      category: "Flower",
      sellingPrice: 65000,
      laborMinutes: 42,
      laborRatePerHour: 20000,
      packagingCost: 1200,
      overheadCost: 2500,
      targetMargin: 0.5,
      currentStock: 2,
      reservedStock: 0,
      averageUnitManufacturingCost: 0,
      lastProductionCost: 0,
      active: true,
      photoUrl: "/flowers/hydrangea.svg",
    },
    {
      id: "prod-puffy-blush",
      ownerId,
      name: "Puffy Blush Bloom",
      sku: "FLOWER-PUFFY-BLUSH",
      category: "Flower",
      sellingPrice: 52000,
      laborMinutes: 30,
      laborRatePerHour: 20000,
      packagingCost: 1200,
      overheadCost: 2200,
      targetMargin: 0.48,
      currentStock: 4,
      reservedStock: 1,
      averageUnitManufacturingCost: 0,
      lastProductionCost: 0,
      active: true,
      photoUrl: "/flowers/puffy-blush.svg",
    },
  ];

  const bomLines: ProductBomLine[] = [
    bom("bom-cherry-pearl", "prod-cherry-blossoms", "var-pearl-12mm", 5, "pcs", 0.05),
    bom("bom-cherry-wire", "prod-cherry-blossoms", "var-copper-wire-gold", 0.6, "meter", 0.1),
    bom("bom-cherry-pack", "prod-cherry-blossoms", "var-packaging-standard", 1, "set", 0),
    bom("bom-orchid-pearl", "prod-orchid", "var-pearl-12mm", 7, "pcs", 0.05),
    bom("bom-orchid-wire", "prod-orchid", "var-copper-wire-gold", 0.8, "meter", 0.1),
    bom("bom-orchid-elastic", "prod-orchid", "var-elastic-clear", 0.4, "meter", 0.05),
    bom("bom-orchid-pack", "prod-orchid", "var-packaging-standard", 1, "set", 0),
    bom("bom-hydrangea-pearl", "prod-hydrangea", "var-pearl-12mm", 12, "pcs", 0.08),
    bom("bom-hydrangea-wire", "prod-hydrangea", "var-copper-wire-gold", 1.2, "meter", 0.1),
    bom("bom-hydrangea-ribbon", "prod-hydrangea", "var-ribbon-blush", 0.6, "meter", 0.05),
    bom("bom-hydrangea-pack", "prod-hydrangea", "var-packaging-standard", 1, "set", 0),
    bom("bom-puffy-pearl", "prod-puffy-blush", "var-pearl-12mm", 9, "pcs", 0.07),
    bom("bom-puffy-wire", "prod-puffy-blush", "var-copper-wire-gold", 0.9, "meter", 0.1),
    bom("bom-puffy-glue", "prod-puffy-blush", "var-glue-clear", 1.5, "gram", 0.1),
    bom("bom-puffy-pack", "prod-puffy-blush", "var-packaging-standard", 1, "set", 0),
  ];

  const baseState: InventoryState = {
    settings: {
      id: "settings-demo",
      ownerId,
      allowNegativeStock: false,
      targetMargin: 0.45,
      laborRatePerHour: 20000,
      defaultPlatformFeeRate: 0.08,
      costingMethod: "latest_purchase",
    },
    suppliers,
    materials,
    materialVariants: variants,
    products,
    bomLines,
    purchases: [
      {
        id: "purchase-demo-001",
        ownerId,
        date: demoDate,
        supplierId: suppliers[0].id,
        subtotal: 45000,
        shippingCost: 6000,
        discount: 0,
        effectiveTotal: 51000,
        notes: "Sample purchase from Shopee.",
      },
    ],
    purchaseLines: [],
    productionBatches: [
      {
        id: "batch-demo-001",
        ownerId,
        productId: "prod-cherry-blossoms",
        quantityMade: 6,
        date: demoDate,
        status: "completed",
        unitManufacturingCost: 0,
        totalManufacturingCost: 0,
        notes: "Sample batch.",
        completedAt: demoDate,
      },
    ],
    productionBatchLines: [],
    productionBatchOrderLinks: [],
    purchaseLists: [],
    purchaseListLines: [],
    inventoryMovements: [],
    orders: [
      {
        id: "order-demo-001",
        ownerId,
        orderNumber: "SO-2026-0001",
        orderDate: demoDate,
        customerName: "Shopee Customer",
        platform: "Shopee",
        status: "confirmed",
        paymentStatus: "paid",
        fulfillmentStatus: "reserved",
        subtotal: 70000,
        discount: 0,
        shippingFeeCharged: 10000,
        shippingCostPaid: 9000,
        platformFee: 5600,
        packagingCost: 2000,
        netRevenue: 74400,
        cogs: 0,
        grossProfit: 0,
        netProfit: 0,
        stockDeducted: false,
        notes: "Pending fulfillment.",
      },
      {
        id: "order-demo-002",
        ownerId,
        orderNumber: "SO-2026-0002",
        orderDate: demoDate,
        customerName: "Offline buyer",
        platform: "Offline",
        status: "completed",
        paymentStatus: "paid",
        fulfillmentStatus: "fulfilled",
        subtotal: 52000,
        discount: 0,
        shippingFeeCharged: 0,
        shippingCostPaid: 0,
        platformFee: 0,
        packagingCost: 1200,
        netRevenue: 52000,
        cogs: 0,
        grossProfit: 0,
        netProfit: 0,
        stockDeducted: true,
        notes: "Sample completed order.",
      },
    ],
    orderItems: [
      {
        id: "order-item-demo-001",
        ownerId,
        orderId: "order-demo-001",
        productId: "prod-cherry-blossoms",
        quantity: 2,
        unitSellingPrice: 35000,
        discountAllocated: 0,
        unitCost: 0,
        lineRevenue: 70000,
        lineCogs: 0,
        lineGrossProfit: 0,
        lineMargin: 0,
      },
      {
        id: "order-item-demo-002",
        ownerId,
        orderId: "order-demo-002",
        productId: "prod-puffy-blush",
        quantity: 1,
        unitSellingPrice: 52000,
        discountAllocated: 0,
        unitCost: 0,
        lineRevenue: 52000,
        lineCogs: 0,
        lineGrossProfit: 0,
        lineMargin: 0,
      },
    ],
    platformFeeRules: [
      fee("fee-shopee", "Shopee", 0.08, 0),
      fee("fee-instagram", "Instagram", 0, 0),
      fee("fee-whatsapp", "WhatsApp", 0, 0),
      fee("fee-offline", "Offline", 0, 0),
      fee("fee-other", "Other", 0.03, 0),
    ],
    materialPriceHistory: [
      {
        id: "price-demo-12mm",
        ownerId,
        supplierId: suppliers[0].id,
        materialVariantId: "var-pearl-12mm",
        observedAt: demoDate,
        packPrice: 4500,
        costPerUsageUnit:
          4500 / calculatePearlEstimate(12).exactPcs,
        notes: "Formula-based estimate. Planning cost using rounded 19 pcs is Rp236.84.",
      },
    ],
  };

  const costedProducts = baseState.products.map((product) => {
    const cost = calculateProductManufacturingCost(baseState, product.id).totalCost;
    return {
      ...product,
      averageUnitManufacturingCost: cost,
      lastProductionCost: cost,
    };
  });

  const costedState = {
    ...baseState,
    products: costedProducts,
  };

  return {
    ...costedState,
    orders: costedState.orders.map((order) => {
      const items = costedState.orderItems.filter((item) => item.orderId === order.id);
      const cogs = items.reduce((sum, item) => {
        const product = costedProducts.find((entry) => entry.id === item.productId);
        return sum + item.quantity * (product?.averageUnitManufacturingCost ?? 0);
      }, 0);
      const grossProfit = order.subtotal - cogs;
      return {
        ...order,
        cogs,
        grossProfit,
        netProfit:
          order.netRevenue - cogs - order.shippingCostPaid - order.packagingCost,
      };
    }),
    orderItems: costedState.orderItems.map((item) => {
      const product = costedProducts.find((entry) => entry.id === item.productId);
      const unitCost = product?.averageUnitManufacturingCost ?? 0;
      const lineCogs = item.quantity * unitCost;
      const lineGrossProfit = item.lineRevenue - lineCogs;
      return {
        ...item,
        unitCost,
        lineCogs,
        lineGrossProfit,
        lineMargin: item.lineRevenue > 0 ? lineGrossProfit / item.lineRevenue : 0,
      };
    }),
  };
}

function bom(
  id: string,
  productId: string,
  materialVariantId: string,
  quantityRequired: number,
  usageUnit: MaterialVariant["usageUnit"],
  wastePercentage: number,
): ProductBomLine {
  return {
    id,
    ownerId,
    productId,
    materialVariantId,
    quantityRequired,
    usageUnit,
    wastePercentage,
    optional: false,
    active: true,
    notes: "Sample BOM quantity. Replace with measured recipe data.",
    updatedAt: demoDate,
  };
}

function fee(
  id: string,
  platform: "Shopee" | "Instagram" | "WhatsApp" | "Offline" | "Other",
  feeRate: number,
  fixedFee: number,
) {
  return {
    id,
    ownerId,
    platform,
    feeRate,
    fixedFee,
    active: true,
    notes: platform === "Shopee" ? "Sample Shopee fee rate." : undefined,
  };
}
