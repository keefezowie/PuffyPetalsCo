import "server-only";

import { getDemoInventoryState } from "@/lib/demo-data";
import type { Database } from "@/lib/supabase/database.types";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type {
  InventoryState,
  Material,
  MaterialPriceHistory,
  MaterialVariant,
  Order,
  OrderItem,
  PlatformFeeRule,
  Product,
  ProductBomLine,
  ProductionBatch,
  ProductionBatchLine,
  ProductionBatchOrderLink,
  Purchase,
  PurchaseLine,
  PurchaseList,
  PurchaseListLine,
  Settings,
  Supplier,
  Unit,
} from "@/lib/types";

type DbClient = {
  from: (table: string) => {
    select: (columns?: string) => QueryBuilder;
  };
};

type QueryBuilder = {
  eq: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
  then: <TResult1 = { data: unknown[] | null; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown[] | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
};

export async function getInventoryState(): Promise<InventoryState> {
  if (!hasSupabaseConfig()) {
    return getDemoInventoryState();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return getDemoInventoryState();
  }

  const db = supabase as unknown as DbClient;
  const [
    settings,
    suppliers,
    materials,
    materialVariants,
    products,
    bomLines,
    purchases,
    purchaseLines,
    productionBatches,
    productionBatchLines,
    productionBatchOrderLinks,
    purchaseLists,
    purchaseListLines,
    inventoryMovements,
    orders,
    orderItems,
    platformFeeRules,
    materialPriceHistory,
  ] = await Promise.all([
    maybeOne<SettingsRow>(db, "settings", user.id),
    listRows<SupplierRow>(db, "suppliers", user.id, "name"),
    listRows<MaterialRow>(db, "materials", user.id, "name"),
    listRows<MaterialVariantRow>(db, "material_variants", user.id, "name"),
    listRows<ProductRow>(db, "products", user.id, "name"),
    listRows<BomLineRow>(db, "product_bom_lines", user.id, "created_at"),
    listRows<PurchaseRow>(db, "purchases", user.id, "date", false),
    listRows<PurchaseLineRow>(db, "purchase_lines", user.id, "created_at", false),
    listRows<ProductionBatchRow>(db, "production_batches", user.id, "date", false),
    listRows<ProductionBatchLineRow>(db, "production_batch_lines", user.id, "created_at", false),
    listRows<ProductionBatchOrderLinkRow>(db, "production_batch_order_links", user.id, "created_at", false),
    listRows<PurchaseListRow>(db, "purchase_lists", user.id, "created_at", false),
    listRows<PurchaseListLineRow>(db, "purchase_list_lines", user.id, "created_at", false),
    listRows<InventoryMovementRow>(db, "inventory_movements", user.id, "occurred_at", false),
    listRows<OrderRow>(db, "orders", user.id, "order_date", false),
    listRows<OrderItemRow>(db, "order_items", user.id, "created_at", false),
    listRows<PlatformFeeRuleRow>(db, "platform_fee_rules", user.id, "platform"),
    listRows<MaterialPriceHistoryRow>(db, "material_price_history", user.id, "observed_at", false),
  ]);

  return {
    settings: settings ? mapSettings(settings) : defaultSettings(user.id),
    suppliers: suppliers.map(mapSupplier),
    materials: materials.map(mapMaterial),
    materialVariants: materialVariants.map(mapMaterialVariant),
    products: products.map(mapProduct),
    bomLines: bomLines.map(mapBomLine),
    purchases: purchases.map(mapPurchase),
    purchaseLines: purchaseLines.map(mapPurchaseLine),
    productionBatches: productionBatches.map(mapProductionBatch),
    productionBatchLines: productionBatchLines.map(mapProductionBatchLine),
    productionBatchOrderLinks: productionBatchOrderLinks.map(mapProductionBatchOrderLink),
    purchaseLists: purchaseLists.map(mapPurchaseList),
    purchaseListLines: purchaseListLines.map(mapPurchaseListLine),
    inventoryMovements: inventoryMovements.map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      occurredAt: row.occurred_at,
      itemType: row.item_type,
      itemId: row.item_id,
      movementType: row.movement_type,
      quantityIn: Number(row.quantity_in),
      quantityOut: Number(row.quantity_out),
      unit: row.unit,
      unitCost: Number(row.unit_cost),
      totalValue: Number(row.total_value),
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      notes: row.notes ?? undefined,
      createdBy: row.created_by ?? undefined,
    })),
    orders: orders.map(mapOrder),
    orderItems: orderItems.map(mapOrderItem),
    platformFeeRules: platformFeeRules.map(mapPlatformFeeRule),
    materialPriceHistory: materialPriceHistory.map(mapMaterialPriceHistory),
  };
}

async function listRows<T>(
  db: DbClient,
  table: string,
  ownerId: string,
  orderColumn: string,
  ascending = true,
) {
  const { data, error } = await db
    .from(table)
    .select("*")
    .eq("owner_id", ownerId)
    .order(orderColumn, { ascending });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as T[];
}

async function maybeOne<T>(db: DbClient, table: string, ownerId: string) {
  const { data, error } = await db
    .from(table)
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as T | null;
}

function defaultSettings(ownerId: string): Settings {
  return {
    id: "settings-default",
    ownerId,
    allowNegativeStock: false,
    targetMargin: 0.45,
    laborRatePerHour: 20000,
    defaultPlatformFeeRate: 0.08,
    costingMethod: "latest_purchase",
  };
}

function mapSettings(row: SettingsRow): Settings {
  return {
    id: row.id,
    ownerId: row.owner_id,
    allowNegativeStock: row.allow_negative_stock,
    targetMargin: Number(row.target_margin),
    laborRatePerHour: row.labor_rate_per_hour,
    defaultPlatformFeeRate: Number(row.default_platform_fee_rate),
    costingMethod: row.costing_method,
  };
}

function mapSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    channel: row.channel,
    contact: row.contact ?? undefined,
    marketplaceUrl: row.marketplace_url ?? undefined,
    notes: row.notes ?? undefined,
    isPreferred: row.is_preferred,
  };
}

function mapMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    category: normalizeMaterialCategory(row.category),
    purchaseUnit: row.purchase_unit,
    usageUnit: row.usage_unit,
    conversionFactor: Number(row.conversion_factor),
    conversionIsEstimated: row.conversion_is_estimated,
    minStock: Number(row.min_stock),
    targetStock: Number(row.target_stock),
    preferredSupplierId: row.preferred_supplier_id ?? undefined,
    active: row.active,
    notes: row.notes ?? undefined,
  };
}

function mapMaterialVariant(row: MaterialVariantRow): MaterialVariant {
  return {
    id: row.id,
    ownerId: row.owner_id,
    materialId: row.material_id,
    name: row.name,
    sku: row.sku ?? undefined,
    color: row.color ?? undefined,
    sizeMm: row.size_mm == null ? undefined : Number(row.size_mm),
    packWeightGram:
      row.pack_weight_gram == null ? undefined : Number(row.pack_weight_gram),
    packPrice: row.pack_price,
    estimatedPcsPerPack:
      row.estimated_pcs_per_pack == null
        ? undefined
        : Number(row.estimated_pcs_per_pack),
    estimatedPcsPerPackRounded: row.estimated_pcs_per_pack_rounded ?? undefined,
    actualCountedPcsPerPack:
      row.actual_counted_pcs_per_pack == null
        ? undefined
        : Number(row.actual_counted_pcs_per_pack),
    estimationStatus: row.estimation_status,
    costPerUsageUnit: Number(row.cost_per_usage_unit),
    stockQuantity: Number(row.stock_quantity),
    minPurchaseQuantity: Number(row.min_purchase_quantity ?? 0),
    purchaseIncrementQuantity: Number(row.purchase_increment_quantity ?? 0),
    usageUnit: row.usage_unit,
    active: row.active,
    notes: row.notes ?? undefined,
  };
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    sellingPrice: row.selling_price,
    laborMinutes: Number(row.labor_minutes),
    laborRatePerHour: row.labor_rate_per_hour,
    packagingCost: row.packaging_cost,
    overheadCost: row.overhead_cost,
    targetMargin: Number(row.target_margin),
    currentStock: Number(row.current_stock),
    reservedStock: Number(row.reserved_stock),
    averageUnitManufacturingCost: Number(row.average_unit_manufacturing_cost),
    lastProductionCost: Number(row.last_production_cost),
    active: row.active,
    photoUrl: row.photo_url ?? undefined,
  };
}

function mapBomLine(row: BomLineRow): ProductBomLine {
  return {
    id: row.id,
    ownerId: row.owner_id,
    productId: row.product_id,
    materialVariantId: row.material_variant_id,
    quantityRequired: Number(row.quantity_required),
    usageUnit: row.usage_unit,
    wastePercentage: Number(row.waste_percentage),
    unitCostSnapshot:
      row.unit_cost_snapshot == null ? undefined : Number(row.unit_cost_snapshot),
    optional: row.optional,
    active: row.active,
    notes: row.notes ?? undefined,
    updatedAt: row.updated_at,
  };
}

function mapPurchase(row: PurchaseRow): Purchase {
  return {
    id: row.id,
    ownerId: row.owner_id,
    date: row.date,
    supplierId: row.supplier_id,
    purchaseListId: row.purchase_list_id ?? undefined,
    subtotal: row.subtotal,
    shippingCost: row.shipping_cost,
    discount: row.discount,
    effectiveTotal: row.effective_total,
    receiptUrl: row.receipt_url ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function mapPurchaseLine(row: PurchaseLineRow): PurchaseLine {
  return {
    id: row.id,
    ownerId: row.owner_id,
    purchaseId: row.purchase_id,
    materialVariantId: row.material_variant_id,
    quantityPurchased: Number(row.quantity_purchased),
    purchaseUnit: row.purchase_unit,
    packSize: row.pack_size == null ? undefined : Number(row.pack_size),
    totalPrice: row.total_price,
    shippingAllocation: row.shipping_allocation,
    discountAllocation: row.discount_allocation,
    effectiveCost: row.effective_cost,
    quantityAddedUsageUnit: Number(row.quantity_added_usage_unit),
    costPerUsageUnit: Number(row.cost_per_usage_unit),
    notes: row.notes ?? undefined,
  };
}

function mapProductionBatch(row: ProductionBatchRow): ProductionBatch {
  return {
    id: row.id,
    ownerId: row.owner_id,
    productId: row.product_id,
    quantityMade: Number(row.quantity_made),
    date: row.date,
    status: row.status,
    sourceOrderId: row.source_order_id ?? undefined,
    unitManufacturingCost: Number(row.unit_manufacturing_cost),
    totalManufacturingCost: Number(row.total_manufacturing_cost),
    notes: row.notes ?? undefined,
    completedAt: row.completed_at ?? undefined,
    completedBy: row.completed_by ?? undefined,
  };
}

export async function getInventoryStateResult(): Promise<
  | { ok: true; state: InventoryState }
  | { ok: false; error: string }
> {
  try {
    return {
      ok: true,
      state: await getInventoryState(),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Supabase data loading error.",
    };
  }
}

function normalizeMaterialCategory(category: string): Material["category"] {
  if (category === "wire") {
    return "stem";
  }
  if (category === "string") {
    return "accessory";
  }
  return category as Material["category"];
}

function mapProductionBatchLine(row: ProductionBatchLineRow): ProductionBatchLine {
  return {
    id: row.id,
    ownerId: row.owner_id,
    productionBatchId: row.production_batch_id,
    materialVariantId: row.material_variant_id,
    quantityConsumed: Number(row.quantity_consumed),
    unitCost: Number(row.unit_cost),
    totalCost: Number(row.total_cost),
    usageUnit: row.usage_unit,
  };
}

function mapProductionBatchOrderLink(
  row: ProductionBatchOrderLinkRow,
): ProductionBatchOrderLink {
  return {
    id: row.id,
    ownerId: row.owner_id,
    productionBatchId: row.production_batch_id,
    orderId: row.order_id,
    orderItemId: row.order_item_id ?? undefined,
    productId: row.product_id,
    quantityPlanned: Number(row.quantity_planned),
    createdAt: row.created_at,
  };
}

function mapPurchaseList(row: PurchaseListRow): PurchaseList {
  return {
    id: row.id,
    ownerId: row.owner_id,
    productionBatchId: row.production_batch_id,
    status: row.status,
    createdAt: row.created_at,
    notes: row.notes ?? undefined,
  };
}

function mapPurchaseListLine(row: PurchaseListLineRow): PurchaseListLine {
  return {
    id: row.id,
    ownerId: row.owner_id,
    purchaseListId: row.purchase_list_id,
    materialVariantId: row.material_variant_id,
    supplierId: row.supplier_id ?? undefined,
    requiredQuantity: Number(row.required_quantity),
    availableQuantity: Number(row.available_quantity),
    shortageQuantity: Number(row.shortage_quantity),
    recommendedPurchaseQuantity: Number(row.recommended_purchase_quantity),
    purchaseUnit: row.purchase_unit,
    usageUnit: row.usage_unit,
    notes: row.notes ?? undefined,
  };
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    ownerId: row.owner_id,
    orderNumber: row.order_number,
    orderDate: row.order_date,
    customerName: row.customer_name,
    platform: row.platform,
    status: row.status,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    subtotal: row.subtotal,
    discount: row.discount,
    shippingFeeCharged: row.shipping_fee_charged,
    shippingCostPaid: row.shipping_cost_paid,
    platformFee: row.platform_fee,
    packagingCost: row.packaging_cost,
    netRevenue: row.net_revenue,
    cogs: Number(row.cogs),
    grossProfit: Number(row.gross_profit),
    netProfit: Number(row.net_profit),
    stockDeducted: row.stock_deducted,
    notes: row.notes ?? undefined,
  };
}

function mapOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    ownerId: row.owner_id,
    orderId: row.order_id,
    productId: row.product_id,
    quantity: Number(row.quantity),
    unitSellingPrice: row.unit_selling_price,
    discountAllocated: row.discount_allocated,
    unitCost: Number(row.unit_cost),
    lineRevenue: row.line_revenue,
    lineCogs: Number(row.line_cogs),
    lineGrossProfit: Number(row.line_gross_profit),
    lineMargin: Number(row.line_margin),
  };
}

function mapPlatformFeeRule(row: PlatformFeeRuleRow): PlatformFeeRule {
  return {
    id: row.id,
    ownerId: row.owner_id,
    platform: row.platform,
    feeRate: Number(row.fee_rate),
    fixedFee: row.fixed_fee,
    active: row.active,
    notes: row.notes ?? undefined,
  };
}

function mapMaterialPriceHistory(row: MaterialPriceHistoryRow): MaterialPriceHistory {
  return {
    id: row.id,
    ownerId: row.owner_id,
    supplierId: row.supplier_id,
    materialVariantId: row.material_variant_id,
    purchaseLineId: row.purchase_line_id ?? undefined,
    observedAt: row.observed_at,
    packPrice: row.pack_price,
    costPerUsageUnit: Number(row.cost_per_usage_unit),
    notes: row.notes ?? undefined,
  };
}

type Enums = Database["public"]["Enums"];

type SettingsRow = {
  id: string;
  owner_id: string;
  allow_negative_stock: boolean;
  target_margin: number | string;
  labor_rate_per_hour: number;
  default_platform_fee_rate: number | string;
  costing_method: Enums["costing_method"];
};

type SupplierRow = {
  id: string;
  owner_id: string;
  name: string;
  channel: string;
  contact: string | null;
  marketplace_url: string | null;
  notes: string | null;
  is_preferred: boolean;
};

type MaterialRow = {
  id: string;
  owner_id: string;
  name: string;
  category: Enums["material_category"];
  purchase_unit: Unit;
  usage_unit: Unit;
  conversion_factor: number | string;
  conversion_is_estimated: boolean;
  min_stock: number | string;
  target_stock: number | string;
  preferred_supplier_id: string | null;
  active: boolean;
  notes: string | null;
};

type MaterialVariantRow = {
  id: string;
  owner_id: string;
  material_id: string;
  name: string;
  sku: string | null;
  color: string | null;
  size_mm: number | string | null;
  pack_weight_gram: number | string | null;
  pack_price: number;
  estimated_pcs_per_pack: number | string | null;
  estimated_pcs_per_pack_rounded: number | null;
  actual_counted_pcs_per_pack: number | string | null;
  estimation_status: Enums["estimation_status"];
  cost_per_usage_unit: number | string;
  stock_quantity: number | string;
  min_purchase_quantity: number | string | null;
  purchase_increment_quantity: number | string | null;
  usage_unit: Unit;
  active: boolean;
  notes: string | null;
};

type ProductRow = {
  id: string;
  owner_id: string;
  name: string;
  sku: string;
  category: string;
  selling_price: number;
  labor_minutes: number | string;
  labor_rate_per_hour: number;
  packaging_cost: number;
  overhead_cost: number;
  target_margin: number | string;
  current_stock: number | string;
  reserved_stock: number | string;
  average_unit_manufacturing_cost: number | string;
  last_production_cost: number | string;
  active: boolean;
  photo_url: string | null;
};

type BomLineRow = {
  id: string;
  owner_id: string;
  product_id: string;
  material_variant_id: string;
  quantity_required: number | string;
  usage_unit: Unit;
  waste_percentage: number | string;
  unit_cost_snapshot: number | string | null;
  optional: boolean;
  active: boolean;
  notes: string | null;
  updated_at: string;
};

type PurchaseRow = {
  id: string;
  owner_id: string;
  date: string;
  supplier_id: string;
  purchase_list_id: string | null;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  effective_total: number;
  receipt_url: string | null;
  notes: string | null;
};

type PurchaseLineRow = {
  id: string;
  owner_id: string;
  purchase_id: string;
  material_variant_id: string;
  quantity_purchased: number | string;
  purchase_unit: Unit;
  pack_size: number | string | null;
  total_price: number;
  shipping_allocation: number;
  discount_allocation: number;
  effective_cost: number;
  quantity_added_usage_unit: number | string;
  cost_per_usage_unit: number | string;
  notes: string | null;
};

type ProductionBatchRow = {
  id: string;
  owner_id: string;
  product_id: string;
  quantity_made: number | string;
  date: string;
  status: Enums["production_batch_status"];
  source_order_id: string | null;
  unit_manufacturing_cost: number | string;
  total_manufacturing_cost: number | string;
  notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
};

type ProductionBatchLineRow = {
  id: string;
  owner_id: string;
  production_batch_id: string;
  material_variant_id: string;
  quantity_consumed: number | string;
  unit_cost: number | string;
  total_cost: number | string;
  usage_unit: Unit;
};

type ProductionBatchOrderLinkRow = {
  id: string;
  owner_id: string;
  production_batch_id: string;
  order_id: string;
  order_item_id: string | null;
  product_id: string;
  quantity_planned: number | string;
  created_at: string;
};

type PurchaseListRow = {
  id: string;
  owner_id: string;
  production_batch_id: string;
  status: Enums["purchase_list_status"];
  created_at: string;
  notes: string | null;
};

type PurchaseListLineRow = {
  id: string;
  owner_id: string;
  purchase_list_id: string;
  material_variant_id: string;
  supplier_id: string | null;
  required_quantity: number | string;
  available_quantity: number | string;
  shortage_quantity: number | string;
  recommended_purchase_quantity: number | string;
  purchase_unit: Unit;
  usage_unit: Unit;
  notes: string | null;
};

type InventoryMovementRow = {
  id: string;
  owner_id: string;
  occurred_at: string;
  item_type: Enums["inventory_item_type"];
  item_id: string;
  movement_type: Enums["inventory_movement_type"];
  quantity_in: number | string;
  quantity_out: number | string;
  unit: Unit;
  unit_cost: number | string;
  total_value: number | string;
  reference_type: string;
  reference_id: string;
  notes: string | null;
  created_by: string | null;
};

type OrderRow = {
  id: string;
  owner_id: string;
  order_number: string;
  order_date: string;
  customer_name: string;
  platform: Enums["sales_platform"];
  status: Enums["order_status"];
  payment_status: Enums["payment_status"];
  fulfillment_status: Enums["fulfillment_status"];
  subtotal: number;
  discount: number;
  shipping_fee_charged: number;
  shipping_cost_paid: number;
  platform_fee: number;
  packaging_cost: number;
  net_revenue: number;
  cogs: number | string;
  gross_profit: number | string;
  net_profit: number | string;
  stock_deducted: boolean;
  notes: string | null;
};

type OrderItemRow = {
  id: string;
  owner_id: string;
  order_id: string;
  product_id: string;
  quantity: number | string;
  unit_selling_price: number;
  discount_allocated: number;
  unit_cost: number | string;
  line_revenue: number;
  line_cogs: number | string;
  line_gross_profit: number | string;
  line_margin: number | string;
};

type PlatformFeeRuleRow = {
  id: string;
  owner_id: string;
  platform: Enums["sales_platform"];
  fee_rate: number | string;
  fixed_fee: number;
  active: boolean;
  notes: string | null;
};

type MaterialPriceHistoryRow = {
  id: string;
  owner_id: string;
  supplier_id: string;
  material_variant_id: string;
  purchase_line_id: string | null;
  observed_at: string;
  pack_price: number;
  cost_per_usage_unit: number | string;
  notes: string | null;
};
