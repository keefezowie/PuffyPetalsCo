import type {
  BomLineCost,
  DashboardMetrics,
  InventoryMovement,
  InventoryState,
  MaterialVariant,
  Order,
  OrderItem,
  OrderProductionPlan,
  Product,
  ProductBomLine,
  ProductCostBreakdown,
  ProductionBatch,
  ProductionBatchLine,
  ProductionBatchOrderLink,
  ProductionFeasibility,
  ProductionPlanMode,
  Purchase,
  PurchaseLine,
  PurchaseList,
  PurchaseListLine,
  PurchaseListPlan,
  Unit,
} from "@/lib/types";

const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export function calculatePearlEstimate(
  sizeMm: number,
  baselineSizeMm = 10,
  baselinePcs = 33,
) {
  if (sizeMm <= 0) {
    throw new Error("Pearl size must be greater than 0.");
  }

  const exactPcs = baselinePcs * (baselineSizeMm / sizeMm) ** 3;
  return {
    exactPcs,
    roundedPcs: Math.round(exactPcs),
    formula: `${baselinePcs} × (${baselineSizeMm} / ${sizeMm})^3`,
  };
}

export function calculateMaterialUnitCost(
  variant: Pick<
    MaterialVariant,
    | "packPrice"
    | "actualCountedPcsPerPack"
    | "estimatedPcsPerPack"
    | "costPerUsageUnit"
  >,
) {
  const unitsPerPack =
    variant.actualCountedPcsPerPack ?? variant.estimatedPcsPerPack;

  if (!unitsPerPack || unitsPerPack <= 0) {
    return variant.costPerUsageUnit;
  }

  if (variant.packPrice < 0) {
    throw new Error("Pack price cannot be negative.");
  }

  return variant.packPrice / unitsPerPack;
}

export function calculateLaborCost(
  laborMinutes: number,
  laborRatePerHour: number,
) {
  if (laborMinutes < 0 || laborRatePerHour < 0) {
    throw new Error("Labor minutes and labor rate cannot be negative.");
  }

  return (laborMinutes / 60) * laborRatePerHour;
}

export function calculateBomLineCost(
  line: Pick<ProductBomLine, "quantityRequired" | "wastePercentage"> & {
    unitCost: number;
  },
) {
  if (line.quantityRequired < 0) {
    throw new Error("BOM quantity cannot be negative.");
  }

  if (line.wastePercentage < 0) {
    throw new Error("Waste percentage cannot be less than 0.");
  }

  const effectiveQuantity = line.quantityRequired * (1 + line.wastePercentage);
  return {
    effectiveQuantity,
    lineCost: effectiveQuantity * line.unitCost,
  };
}

export function getRecommendedPrice(
  totalCost: number,
  targetMargin: number,
  platformFeeRate: number,
) {
  if (targetMargin < 0 || targetMargin >= 1) {
    throw new Error("Target margin must be between 0 and 1.");
  }

  if (platformFeeRate < 0 || platformFeeRate >= 1) {
    throw new Error("Platform fee rate must be between 0 and 1.");
  }

  const denominator = 1 - targetMargin - platformFeeRate;
  if (denominator <= 0) {
    throw new Error(
      "Recommended price cannot be calculated because margin plus platform fee is too high.",
    );
  }

  return totalCost / denominator;
}

export function calculateBomLineCosts(
  state: InventoryState,
  productId: string,
) {
  return state.bomLines
    .filter((line) => line.productId === productId && line.active)
    .map<BomLineCost>((line) => {
      const variant = getVariant(state, line.materialVariantId);
      const material = state.materials.find(
        (item) => item.id === variant.materialId,
      );
      const unitCost =
        line.unitCostSnapshot ?? calculateMaterialUnitCost(variant);
      const { effectiveQuantity, lineCost } = calculateBomLineCost({
        ...line,
        unitCost,
      });

      return {
        bomLineId: line.id,
        materialVariantId: variant.id,
        materialName: formatMaterialVariantName(material?.name, variant.name),
        quantityRequired: line.quantityRequired,
        wastePercentage: line.wastePercentage,
        effectiveQuantity,
        unitCost,
        lineCost,
        missingCost: unitCost <= 0,
        optional: line.optional,
      };
    });
}

function formatMaterialVariantName(materialName: string | undefined, variantName: string) {
  if (!materialName) {
    return variantName;
  }

  const normalizedMaterial = materialName.trim().toLocaleLowerCase();
  const normalizedVariant = variantName.trim().toLocaleLowerCase();

  if (
    normalizedMaterial === normalizedVariant ||
    normalizedVariant.startsWith(`${normalizedMaterial} `) ||
    normalizedVariant.endsWith(` ${normalizedMaterial}`)
  ) {
    return variantName;
  }

  return `${materialName} ${variantName}`;
}

export function calculateProductManufacturingCost(
  state: InventoryState,
  productId: string,
): ProductCostBreakdown {
  const product = getProduct(state, productId);
  const bomLines = calculateBomLineCosts(state, productId);
  const materialCost = bomLines.reduce((sum, line) => sum + line.lineCost, 0);
  const laborCost = calculateLaborCost(
    product.laborMinutes,
    product.laborRatePerHour,
  );
  const totalCost =
    materialCost + laborCost + product.packagingCost + product.overheadCost;
  const warnings = bomLines
    .filter((line) => line.missingCost)
    .map((line) => `${line.materialName} has missing cost.`);

  if (!bomLines.length) {
    warnings.push(`${product.name} has no active BOM lines.`);
  }

  return {
    productId,
    materialCost,
    laborCost,
    packagingCost: product.packagingCost,
    overheadCost: product.overheadCost,
    totalCost,
    bomLines,
    warnings,
  };
}

export function canProduce(
  state: InventoryState,
  productId: string,
  quantity: number,
): ProductionFeasibility {
  if (quantity <= 0) {
    throw new Error("Production quantity must be greater than 0.");
  }

  const product = getProduct(state, productId);
  const costLines = calculateBomLineCosts(state, productId);
  const lines = costLines.map((line) => {
    const variant = getVariant(state, line.materialVariantId);
    const requiredQuantity = line.effectiveQuantity * quantity;
    const availableQuantity = variant.stockQuantity;
    const shortageQuantity = Math.max(0, requiredQuantity - availableQuantity);
    const maxProducibleByLine =
      line.effectiveQuantity > 0
        ? Math.floor(availableQuantity / line.effectiveQuantity)
        : Number.POSITIVE_INFINITY;

    return {
      materialVariantId: variant.id,
      materialName: line.materialName,
      requiredQuantity,
      availableQuantity,
      shortageQuantity,
      usageUnit: variant.usageUnit,
      maxProducibleByLine,
    };
  });
  const finiteMaxes = lines
    .map((line) => line.maxProducibleByLine)
    .filter((value) => Number.isFinite(value));
  const maxProducibleQuantity = finiteMaxes.length
    ? Math.min(...finiteMaxes)
    : quantity;
  const limitingLine = lines
    .filter((line) => line.shortageQuantity > 0)
    .sort((a, b) => a.maxProducibleByLine - b.maxProducibleByLine)[0];
  const warnings = [];

  if (!costLines.length) {
    warnings.push(`${product.name} cannot be produced because its BOM is empty.`);
  }

  return {
    productId,
    requestedQuantity: quantity,
    canProduceRequested:
      costLines.length > 0 && lines.every((line) => line.shortageQuantity === 0),
    maxProducibleQuantity,
    limitingMaterial: limitingLine?.materialName,
    lines,
    warnings,
  };
}

export function planProductionFromOrder(
  state: InventoryState,
  orderId: string,
  mode: ProductionPlanMode,
): OrderProductionPlan {
  const order = getOrder(state, orderId);
  const orderItems = state.orderItems.filter((item) => item.orderId === order.id);
  const orderedByProduct = orderItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.productId] = (acc[item.productId] ?? 0) + item.quantity;
    return acc;
  }, {});
  const openBatchIds = new Set(
    state.productionBatches
      .filter((batch) => batch.status === "planned" || batch.status === "in_progress")
      .map((batch) => batch.id),
  );
  const openByProduct = state.productionBatchOrderLinks
    .filter((link) => link.orderId === order.id && openBatchIds.has(link.productionBatchId))
    .reduce<Record<string, number>>((acc, link) => {
      acc[link.productId] = (acc[link.productId] ?? 0) + link.quantityPlanned;
      return acc;
    }, {});
  const lines = Object.entries(orderedByProduct).map(([productId, orderedQuantity]) => {
    const product = getProduct(state, productId);
    const alreadyOpenQuantity = openByProduct[productId] ?? 0;
    const targetQuantity =
      mode === "full"
        ? orderedQuantity
        : Math.max(0, orderedQuantity - product.currentStock);
    return {
      productId,
      productName: product.name,
      orderedQuantity,
      currentStock: product.currentStock,
      alreadyOpenQuantity,
      quantityToProduce: Math.max(0, targetQuantity - alreadyOpenQuantity),
      mode,
    };
  });
  const warnings = [];

  if (!orderItems.length) {
    warnings.push("Order has no product lines.");
  }

  if (order.stockDeducted) {
    warnings.push("Order is already fulfilled.");
  }

  return {
    orderId,
    mode,
    lines,
    hasProduction: lines.some((line) => line.quantityToProduce > 0),
    warnings,
  };
}

export function createPlannedProductionFromOrder(
  state: InventoryState,
  input: {
    ownerId: string;
    orderId: string;
    mode: ProductionPlanMode;
    date: string;
    notes?: string;
    createdBy?: string;
  },
) {
  const order = getOrder(state, input.orderId);
  const plan = planProductionFromOrder(state, input.orderId, input.mode);
  const batches: ProductionBatch[] = [];
  const links: ProductionBatchOrderLink[] = [];
  const orderItems = state.orderItems.filter((item) => item.orderId === input.orderId);
  const now = new Date().toISOString();

  if (!plan.hasProduction) {
    throw new Error("No production is required for this order.");
  }

  for (const line of plan.lines.filter((item) => item.quantityToProduce > 0)) {
    const cost = calculateProductManufacturingCost(state, line.productId);
    const batch: ProductionBatch = {
      id: id("batch"),
      ownerId: input.ownerId,
      productId: line.productId,
      quantityMade: line.quantityToProduce,
      date: input.date,
      status: "planned",
      sourceOrderId: input.orderId,
      unitManufacturingCost: cost.totalCost,
      totalManufacturingCost: cost.totalCost * line.quantityToProduce,
      notes: input.notes,
    };
    batches.push(batch);

    let remaining = line.quantityToProduce;
    for (const item of orderItems.filter((entry) => entry.productId === line.productId)) {
      if (remaining <= 0) {
        break;
      }

      const quantityPlanned = Math.min(item.quantity, remaining);
      remaining -= quantityPlanned;
      links.push({
        id: id("batch_order_link"),
        ownerId: input.ownerId,
        productionBatchId: batch.id,
        orderId: input.orderId,
        orderItemId: item.id,
        productId: line.productId,
        quantityPlanned,
        createdAt: now,
      });
    }
  }

  return {
    state: {
      ...state,
      productionBatches: [...batches, ...state.productionBatches],
      productionBatchOrderLinks: [...links, ...state.productionBatchOrderLinks],
      orders: state.orders.map((item) =>
        item.id === order.id &&
        (item.status === "draft" || item.status === "confirmed")
          ? { ...item, status: "in_production" }
          : item,
      ),
    },
    plan,
    batches,
    links,
  };
}

export function completeProductionBatch(
  state: InventoryState,
  input: {
    productionBatchId: string;
    date?: string;
    notes?: string;
    createdBy?: string;
  },
) {
  const existingBatch = getProductionBatch(state, input.productionBatchId);

  if (existingBatch.status === "completed") {
    throw new Error("Production batch is already completed.");
  }

  if (existingBatch.status === "cancelled") {
    throw new Error("Cancelled production batches cannot be completed.");
  }

  const withoutBatchState: InventoryState = {
    ...state,
    productionBatches: state.productionBatches.filter(
      (batch) => batch.id !== existingBatch.id,
    ),
  };
  const completed = createProductionBatch(withoutBatchState, {
    ownerId: existingBatch.ownerId,
    productId: existingBatch.productId,
    quantityMade: existingBatch.quantityMade,
    date: input.date ?? existingBatch.date,
    notes: input.notes ?? existingBatch.notes,
    createdBy: input.createdBy,
  });
  const completedBatch: ProductionBatch = {
    ...completed.batch,
    id: existingBatch.id,
    sourceOrderId: existingBatch.sourceOrderId,
    notes: input.notes ?? existingBatch.notes,
    completedAt: new Date().toISOString(),
    completedBy: input.createdBy,
  };
  const batchLines = completed.batchLines.map((line) => ({
    ...line,
    productionBatchId: existingBatch.id,
  }));
  const movements = completed.movements.map((move) => ({
    ...move,
    referenceId: existingBatch.id,
  }));

  return {
    state: {
      ...completed.state,
      productionBatches: [
        completedBatch,
        ...completed.state.productionBatches.filter(
          (batch) => batch.id !== completed.batch.id,
        ),
      ],
      productionBatchLines: [
        ...batchLines,
        ...completed.state.productionBatchLines.filter(
          (line) => line.productionBatchId !== completed.batch.id,
        ),
      ],
      inventoryMovements: [
        ...movements,
        ...completed.state.inventoryMovements.filter(
          (move) => move.referenceId !== completed.batch.id,
        ),
      ],
    },
    batch: completedBatch,
    batchLines,
    movements,
  };
}

export function planPurchaseListFromBatch(
  state: InventoryState,
  productionBatchId: string,
): PurchaseListPlan {
  const batch = getProductionBatch(state, productionBatchId);
  const product = getProduct(state, batch.productId);
  const costLines = calculateBomLineCosts(state, batch.productId);
  const lines = costLines
    .map((line) => {
      const variant = getVariant(state, line.materialVariantId);
      const material = getMaterialForVariant(state, variant);
      const supplier = material.preferredSupplierId
        ? state.suppliers.find((item) => item.id === material.preferredSupplierId)
        : undefined;
      const requiredQuantity = line.effectiveQuantity * batch.quantityMade;
      const shortageQuantity = Math.max(0, requiredQuantity - variant.stockQuantity);
      return {
        materialVariantId: variant.id,
        materialName: line.materialName,
        supplierId: supplier?.id,
        supplierName: supplier?.name,
        requiredQuantity,
        availableQuantity: variant.stockQuantity,
        shortageQuantity,
        recommendedPurchaseQuantity: shortageQuantity,
        purchaseUnit: material.purchaseUnit,
        usageUnit: variant.usageUnit,
      };
    })
    .filter((line) => line.shortageQuantity > 0);
  const warnings = [];

  if (!costLines.length) {
    warnings.push(`${product.name} has no active BOM lines.`);
  }

  if (batch.status === "completed") {
    warnings.push("Batch is already completed; purchase planning reflects current stock only.");
  }

  return {
    productionBatchId,
    lines,
    hasShortages: lines.length > 0,
    warnings,
  };
}

export function createPurchaseListFromBatch(
  state: InventoryState,
  input: {
    ownerId: string;
    productionBatchId: string;
    notes?: string;
  },
) {
  const plan = planPurchaseListFromBatch(state, input.productionBatchId);
  const now = new Date().toISOString();
  const purchaseList: PurchaseList = {
    id: id("purchase_list"),
    ownerId: input.ownerId,
    productionBatchId: input.productionBatchId,
    status: "draft" as const,
    createdAt: now,
    notes: input.notes,
  };
  const purchaseListLines: PurchaseListLine[] = plan.lines.map((line) => ({
    id: id("purchase_list_line"),
    ownerId: input.ownerId,
    purchaseListId: purchaseList.id,
    materialVariantId: line.materialVariantId,
    supplierId: line.supplierId,
    requiredQuantity: line.requiredQuantity,
    availableQuantity: line.availableQuantity,
    shortageQuantity: line.shortageQuantity,
    recommendedPurchaseQuantity: line.recommendedPurchaseQuantity,
    purchaseUnit: line.purchaseUnit,
    usageUnit: line.usageUnit,
    notes: line.supplierName ? undefined : "No preferred supplier assigned.",
  }));

  if (!plan.hasShortages) {
    throw new Error("No material shortages were found for this batch.");
  }

  return {
    state: {
      ...state,
      purchaseLists: [purchaseList, ...state.purchaseLists],
      purchaseListLines: [...purchaseListLines, ...state.purchaseListLines],
    },
    plan,
    purchaseList,
    purchaseListLines,
  };
}

export function createProductionBatch(
  state: InventoryState,
  input: {
    ownerId: string;
    productId: string;
    quantityMade: number;
    date: string;
    notes?: string;
    createdBy?: string;
  },
) {
  const feasibility = canProduce(state, input.productId, input.quantityMade);
  const product = getProduct(state, input.productId);

  if (!feasibility.canProduceRequested && !state.settings.allowNegativeStock) {
    throw new Error(
      `Insufficient material stock. Limiting material: ${
        feasibility.limitingMaterial ?? "unknown"
      }.`,
    );
  }

  const cost = calculateProductManufacturingCost(state, input.productId);
  const batch: ProductionBatch = {
    id: id("batch"),
    ownerId: input.ownerId,
    productId: input.productId,
    quantityMade: input.quantityMade,
    date: input.date,
    status: "completed",
    unitManufacturingCost: cost.totalCost,
    totalManufacturingCost: cost.totalCost * input.quantityMade,
    notes: input.notes,
    completedAt: input.date,
    completedBy: input.createdBy,
  };
  const batchLines: ProductionBatchLine[] = feasibility.lines.map((line) => ({
    id: id("batch_line"),
    ownerId: input.ownerId,
    productionBatchId: batch.id,
    materialVariantId: line.materialVariantId,
    quantityConsumed: line.requiredQuantity,
    unitCost: getVariant(state, line.materialVariantId).costPerUsageUnit,
    totalCost:
      line.requiredQuantity *
      getVariant(state, line.materialVariantId).costPerUsageUnit,
    usageUnit: line.usageUnit,
  }));
  const materialMovements = batchLines.map<InventoryMovement>((line) => ({
    id: id("move"),
    ownerId: input.ownerId,
    occurredAt: input.date,
    itemType: "raw_material",
    itemId: line.materialVariantId,
    movementType: "production_consumption",
    quantityIn: 0,
    quantityOut: line.quantityConsumed,
    unit: line.usageUnit,
    unitCost: line.unitCost,
    totalValue: line.totalCost,
    referenceType: "production_batch",
    referenceId: batch.id,
    notes: input.notes,
    createdBy: input.createdBy,
  }));
  const outputMovement: InventoryMovement = {
    id: id("move"),
    ownerId: input.ownerId,
    occurredAt: input.date,
    itemType: "finished_good",
    itemId: product.id,
    movementType: "production_output",
    quantityIn: input.quantityMade,
    quantityOut: 0,
    unit: "pcs",
    unitCost: cost.totalCost,
    totalValue: cost.totalCost * input.quantityMade,
    referenceType: "production_batch",
    referenceId: batch.id,
    notes: input.notes,
    createdBy: input.createdBy,
  };
  const materialVariants = state.materialVariants.map((variant) => {
    const consumed = batchLines.find(
      (line) => line.materialVariantId === variant.id,
    );
    return consumed
      ? {
          ...variant,
          stockQuantity: variant.stockQuantity - consumed.quantityConsumed,
        }
      : variant;
  });
  const products = state.products.map((item) =>
    item.id === input.productId
      ? {
          ...item,
          currentStock: item.currentStock + input.quantityMade,
          lastProductionCost: cost.totalCost,
          averageUnitManufacturingCost: cost.totalCost,
        }
      : item,
  );

  return {
    state: {
      ...state,
      materialVariants,
      products,
      productionBatches: [batch, ...state.productionBatches],
      productionBatchLines: [...batchLines, ...state.productionBatchLines],
      inventoryMovements: [
        ...materialMovements,
        outputMovement,
        ...state.inventoryMovements,
      ],
    },
    batch,
    batchLines,
    movements: [...materialMovements, outputMovement],
  };
}

export function recordPurchase(
  state: InventoryState,
  input: {
    ownerId: string;
    supplierId: string;
    date: string;
    shippingCost: number;
    discount: number;
    purchaseListId?: string;
    notes?: string;
    receiptUrl?: string;
    lines: Array<{
      materialVariantId: string;
      quantityPurchased: number;
      purchaseUnit: Unit;
      packSize?: number;
      totalPrice: number;
      shippingAllocation?: number;
      discountAllocation?: number;
      quantityAddedUsageUnit: number;
      notes?: string;
    }>;
  },
) {
  if (!input.lines.length) {
    throw new Error("Purchase must include at least one line.");
  }

  const subtotal = input.lines.reduce((sum, line) => sum + line.totalPrice, 0);
  const effectiveTotal = subtotal + input.shippingCost - input.discount;
  const purchase: Purchase = {
    id: id("purchase"),
    ownerId: input.ownerId,
    supplierId: input.supplierId,
    purchaseListId: input.purchaseListId,
    date: input.date,
    subtotal,
    shippingCost: input.shippingCost,
    discount: input.discount,
    effectiveTotal,
    receiptUrl: input.receiptUrl,
    notes: input.notes,
  };
  const purchaseLines = input.lines.map<PurchaseLine>((line) => {
    if (line.quantityPurchased <= 0 || line.quantityAddedUsageUnit <= 0) {
      throw new Error("Purchase quantities must be greater than 0.");
    }
    if (line.totalPrice < 0) {
      throw new Error("Purchase price cannot be negative.");
    }

    const shippingAllocation = line.shippingAllocation ?? 0;
    const discountAllocation = line.discountAllocation ?? 0;
    const effectiveCost = line.totalPrice + shippingAllocation - discountAllocation;
    return {
      id: id("purchase_line"),
      ownerId: input.ownerId,
      purchaseId: purchase.id,
      materialVariantId: line.materialVariantId,
      quantityPurchased: line.quantityPurchased,
      purchaseUnit: line.purchaseUnit,
      packSize: line.packSize,
      totalPrice: line.totalPrice,
      shippingAllocation,
      discountAllocation,
      effectiveCost,
      quantityAddedUsageUnit: line.quantityAddedUsageUnit,
      costPerUsageUnit: effectiveCost / line.quantityAddedUsageUnit,
      notes: line.notes,
    };
  });
  const materialVariants = state.materialVariants.map((variant) => {
    const line = purchaseLines.find(
      (item) => item.materialVariantId === variant.id,
    );
    return line
      ? {
          ...variant,
          stockQuantity: variant.stockQuantity + line.quantityAddedUsageUnit,
          packPrice: line.totalPrice / line.quantityPurchased,
          costPerUsageUnit: line.costPerUsageUnit,
        }
      : variant;
  });
  const movements = purchaseLines.map<InventoryMovement>((line) => ({
    id: id("move"),
    ownerId: input.ownerId,
    occurredAt: input.date,
    itemType: "raw_material",
    itemId: line.materialVariantId,
    movementType: "purchase",
    quantityIn: line.quantityAddedUsageUnit,
    quantityOut: 0,
    unit: getVariant(state, line.materialVariantId).usageUnit,
    unitCost: line.costPerUsageUnit,
    totalValue: line.effectiveCost,
    referenceType: "purchase",
    referenceId: purchase.id,
    notes: input.notes,
  }));
  const materialPriceHistory = purchaseLines.map((line) => ({
    id: id("price"),
    ownerId: input.ownerId,
    supplierId: input.supplierId,
    materialVariantId: line.materialVariantId,
    purchaseLineId: line.id,
    observedAt: input.date,
    packPrice: line.totalPrice / line.quantityPurchased,
    costPerUsageUnit: line.costPerUsageUnit,
    notes: line.notes,
  }));

  return {
    state: {
      ...state,
      materialVariants,
      purchases: [purchase, ...state.purchases],
      purchaseLines: [...purchaseLines, ...state.purchaseLines],
      inventoryMovements: [...movements, ...state.inventoryMovements],
      materialPriceHistory: [
        ...materialPriceHistory,
        ...state.materialPriceHistory,
      ],
    },
    purchase,
    purchaseLines,
    movements,
  };
}

export function fulfillOrder(state: InventoryState, orderId: string) {
  const order = getOrder(state, orderId);
  if (order.stockDeducted) {
    throw new Error("Order stock has already been deducted.");
  }

  const items = state.orderItems.filter((item) => item.orderId === orderId);
  if (!items.length) {
    throw new Error("Order has no items.");
  }

  if (!state.settings.allowNegativeStock) {
    for (const item of items) {
      const product = getProduct(state, item.productId);
      if (product.currentStock < item.quantity) {
        throw new Error(`${product.name} has insufficient finished stock.`);
      }
    }
  }

  const updatedItems = items.map<OrderItem>((item) => {
    const product = getProduct(state, item.productId);
    const unitCost =
      product.averageUnitManufacturingCost ||
      product.lastProductionCost ||
      calculateProductManufacturingCost(state, product.id).totalCost;
    const lineRevenue = item.quantity * item.unitSellingPrice - item.discountAllocated;
    const lineCogs = item.quantity * unitCost;
    const lineGrossProfit = lineRevenue - lineCogs;
    return {
      ...item,
      unitCost,
      lineRevenue,
      lineCogs,
      lineGrossProfit,
      lineMargin: lineRevenue > 0 ? lineGrossProfit / lineRevenue : 0,
    };
  });
  const subtotal = updatedItems.reduce((sum, item) => sum + item.lineRevenue, 0);
  const cogs = updatedItems.reduce((sum, item) => sum + item.lineCogs, 0);
  const grossProfit = subtotal - cogs;
  const netRevenue =
    subtotal - order.platformFee - order.discount + order.shippingFeeCharged;
  const netProfit =
    netRevenue - cogs - order.shippingCostPaid - order.packagingCost;
  const updatedOrder: Order = {
    ...order,
    status: order.status === "confirmed" ? "packed" : order.status,
    fulfillmentStatus: "fulfilled",
    subtotal,
    netRevenue,
    cogs,
    grossProfit,
    netProfit,
    stockDeducted: true,
  };
  const soldByProduct = updatedItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.productId] = (acc[item.productId] ?? 0) + item.quantity;
    return acc;
  }, {});
  const products = state.products.map((product) => {
    const quantitySold = soldByProduct[product.id] ?? 0;
    return quantitySold
      ? {
          ...product,
          currentStock: product.currentStock - quantitySold,
          reservedStock: Math.max(0, product.reservedStock - quantitySold),
        }
      : product;
  });
  const movements = updatedItems.map<InventoryMovement>((item) => ({
    id: id("move"),
    ownerId: order.ownerId,
    occurredAt: new Date().toISOString(),
    itemType: "finished_good",
    itemId: item.productId,
    movementType: "sale",
    quantityIn: 0,
    quantityOut: item.quantity,
    unit: "pcs",
    unitCost: item.unitCost,
    totalValue: item.lineCogs,
    referenceType: "order",
    referenceId: order.id,
    notes: order.orderNumber,
  }));

  return {
    state: {
      ...state,
      products,
      orders: state.orders.map((item) =>
        item.id === orderId ? updatedOrder : item,
      ),
      orderItems: state.orderItems.map((item) => {
        const updated = updatedItems.find((line) => line.id === item.id);
        return updated ?? item;
      }),
      inventoryMovements: [...movements, ...state.inventoryMovements],
    },
    order: updatedOrder,
    orderItems: updatedItems,
    movements,
  };
}

export function calculateOrderProfit(state: InventoryState, orderId: string) {
  const order = getOrder(state, orderId);
  const items = state.orderItems.filter((item) => item.orderId === orderId);
  const lineRevenue = items.reduce(
    (sum, item) =>
      sum + (item.lineRevenue || item.quantity * item.unitSellingPrice),
    0,
  );
  const cogs =
    order.cogs ||
    items.reduce((sum, item) => {
      const product = getProduct(state, item.productId);
      const unitCost =
        item.unitCost ||
        product.averageUnitManufacturingCost ||
        product.lastProductionCost ||
        calculateProductManufacturingCost(state, product.id).totalCost;
      return sum + item.quantity * unitCost;
    }, 0);
  const netRevenue =
    lineRevenue - order.discount - order.platformFee + order.shippingFeeCharged;
  const netProfit =
    netRevenue - cogs - order.shippingCostPaid - order.packagingCost;

  return {
    lineRevenue,
    cogs,
    grossProfit: lineRevenue - cogs,
    netRevenue,
    netProfit,
    margin: netRevenue > 0 ? netProfit / netRevenue : 0,
  };
}

export function getLowStockMaterials(state: InventoryState) {
  return state.materialVariants
    .map((variant) => {
      const material = getMaterialForVariant(state, variant);
      return {
        material,
        variant,
        isLow: variant.stockQuantity <= material.minStock,
        recommendedPurchaseQuantity: Math.max(
          0,
          material.targetStock - variant.stockQuantity,
        ),
      };
    })
    .filter((item) => item.isLow);
}

export function getDashboardMetrics(state: InventoryState): DashboardMetrics {
  const rawMaterialInventoryValue = state.materialVariants.reduce(
    (sum, variant) => sum + variant.stockQuantity * variant.costPerUsageUnit,
    0,
  );
  const finishedGoodsInventoryValue = state.products.reduce(
    (sum, product) =>
      sum + product.currentStock * product.averageUnitManufacturingCost,
    0,
  );
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthOrders = state.orders.filter((order) => {
    const date = new Date(order.orderDate);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const monthlyRevenue = monthOrders.reduce(
    (sum, order) => sum + order.netRevenue,
    0,
  );
  const monthlyNetProfit = monthOrders.reduce(
    (sum, order) => sum + order.netProfit,
    0,
  );
  const productSales = state.orderItems.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.productId] = (acc[item.productId] ?? 0) + item.quantity;
      return acc;
    },
    {},
  );
  const rankedSales = Object.entries(productSales).sort((a, b) => b[1] - a[1]);
  const productMargins = state.products
    .map((product) => {
      const cost = calculateProductManufacturingCost(state, product.id).totalCost;
      const margin =
        product.sellingPrice > 0 ? (product.sellingPrice - cost) / product.sellingPrice : 0;
      return { product, margin };
    })
    .sort((a, b) => b.margin - a.margin);

  return {
    rawMaterialInventoryValue,
    finishedGoodsInventoryValue,
    monthlyRevenue,
    monthlyNetProfit,
    pendingOrders: state.orders.filter(
      (order) =>
        !["completed", "cancelled", "returned"].includes(order.status),
    ).length,
    lowStockMaterialCount: getLowStockMaterials(state).length,
    bestSellingProduct: rankedSales.length
      ? getProduct(state, rankedSales[0][0]).name
      : undefined,
    highestMarginProduct: productMargins.at(0)?.product.name,
    lowestMarginProduct: productMargins.at(-1)?.product.name,
  };
}

function getProduct(state: InventoryState, productId: string): Product {
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }
  return product;
}

function getVariant(
  state: InventoryState,
  materialVariantId: string,
): MaterialVariant {
  const variant = state.materialVariants.find(
    (item) => item.id === materialVariantId,
  );
  if (!variant) {
    throw new Error(`Material variant not found: ${materialVariantId}`);
  }
  return variant;
}

function getMaterialForVariant(
  state: InventoryState,
  variant: MaterialVariant,
) {
  const material = state.materials.find((item) => item.id === variant.materialId);
  if (!material) {
    throw new Error(`Material not found: ${variant.materialId}`);
  }
  return material;
}

function getOrder(state: InventoryState, orderId: string) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }
  return order;
}

function getProductionBatch(
  state: InventoryState,
  productionBatchId: string,
): ProductionBatch {
  const batch = state.productionBatches.find(
    (item) => item.id === productionBatchId,
  );
  if (!batch) {
    throw new Error(`Production batch not found: ${productionBatchId}`);
  }
  return batch;
}
