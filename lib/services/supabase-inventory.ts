"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import {
  calculatePearlEstimate,
} from "@/lib/services/inventory";
import type {
  MaterialCategory,
  OrderStatus,
  PaymentStatus,
  ProductionPlanMode,
  SalesPlatform,
  Unit,
} from "@/lib/types";

type RpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type DbError = { message: string };

type SingleQuery = {
  single: () => Promise<{ data: unknown; error: DbError | null }>;
};

type SelectBuilder = {
  eq: (column: string, value: unknown) => SelectBuilder;
  single: () => Promise<{ data: unknown; error: DbError | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: DbError | null }>;
  then: <TResult1 = { data: unknown[] | null; error: DbError | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown[] | null; error: DbError | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
};

type WriteBuilder = {
  select: (columns?: string) => SingleQuery;
};

type UpdateBuilder = {
  eq: (column: string, value: unknown) => UpdateBuilder;
  then: <TResult1 = { data: unknown[] | null; error: DbError | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown[] | null; error: DbError | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
};

type DbClient = {
  from: (table: string) => {
    select: (columns?: string) => SelectBuilder;
    insert: (values: Record<string, unknown> | Record<string, unknown>[]) => WriteBuilder;
    update: (values: Record<string, unknown>) => UpdateBuilder;
    upsert: (
      values: Record<string, unknown>,
      options?: { onConflict?: string },
    ) => WriteBuilder;
  };
};

type User = { id: string };

async function getMutationContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return {
    supabase,
    db: supabase as unknown as DbClient,
    user: user as User,
  };
}

function requireText(value: string, field: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required.`);
  }
  return trimmed;
}

function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function optionalId(value?: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "none" ? trimmed : null;
}

function assertNonNegative(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} cannot be negative.`);
  }
}

function assertPositive(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be greater than 0.`);
  }
}

function assertRate(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${field} must be between 0 and 1.`);
  }
}

export async function createProductionBatchAction(input: {
  productId: string;
  quantityMade: number;
  date: string;
  notes?: string;
}) {
  const { supabase } = await getMutationContext();
  const rpc = supabase as unknown as RpcClient;
  const { data, error } = await rpc.rpc("create_production_batch", {
    p_product_id: input.productId,
    p_quantity_made: input.quantityMade,
    p_date: input.date,
    p_notes: input.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/production");
  revalidatePath("/materials");
  revalidatePath("/finished-goods");
  revalidatePath("/dashboard");
  return data;
}

async function generateOrderNumber(db: DbClient, ownerId: string, orderDate: string) {
  const year = new Date(orderDate).getFullYear();
  const prefix = `SO-${year}-`;
  const { data, error } = await db
    .from("orders")
    .select("order_number")
    .eq("owner_id", ownerId);

  if (error) {
    throw new Error(error.message);
  }

  const nextSequence = ((data ?? []) as Array<{ order_number?: string }>)
    .map((row) => row.order_number ?? "")
    .filter((orderNumber) => orderNumber.startsWith(prefix))
    .map((orderNumber) => Number(orderNumber.slice(prefix.length)))
    .filter((value) => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0) + 1;

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
}

export async function planProductionFromOrderAction(input: {
  orderId: string;
  mode: ProductionPlanMode;
  date: string;
  notes?: string;
}) {
  const { supabase } = await getMutationContext();
  const rpc = supabase as unknown as RpcClient;
  const { data, error } = await rpc.rpc("plan_production_from_order", {
    p_order_id: input.orderId,
    p_mode: input.mode,
    p_date: input.date,
    p_notes: input.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${input.orderId}`);
  revalidatePath("/production");
  revalidatePath("/dashboard");
  return data;
}

export async function completeProductionBatchAction(input: {
  productionBatchId: string;
  date?: string;
  notes?: string;
}) {
  const { supabase } = await getMutationContext();
  const rpc = supabase as unknown as RpcClient;
  const { data, error } = await rpc.rpc("complete_production_batch", {
    p_production_batch_id: input.productionBatchId,
    p_date: input.date ?? null,
    p_notes: input.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/production");
  revalidatePath(`/production/${input.productionBatchId}`);
  revalidatePath("/materials");
  revalidatePath("/finished-goods");
  revalidatePath("/dashboard");
  return data;
}

export async function createPurchaseListFromBatchAction(input: {
  productionBatchId: string;
  notes?: string;
}) {
  const { supabase } = await getMutationContext();
  const rpc = supabase as unknown as RpcClient;
  const { data, error } = await rpc.rpc("create_purchase_list_from_batch", {
    p_production_batch_id: input.productionBatchId,
    p_notes: input.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/production");
  revalidatePath(`/production/${input.productionBatchId}`);
  revalidatePath("/purchases");
  revalidatePath("/dashboard");
  return data;
}

export async function recordPurchaseAction(input: {
  supplierId: string;
  date: string;
  shippingCost: number;
  discount: number;
  lines: Json;
  purchaseListId?: string;
  purchaseUrl?: string;
  notes?: string;
}) {
  const { supabase, db, user } = await getMutationContext();
  const rpc = supabase as unknown as RpcClient;
  const { data, error } = await rpc.rpc("record_purchase", {
    p_supplier_id: input.supplierId,
    p_date: input.date,
    p_shipping_cost: input.shippingCost,
    p_discount: input.discount,
    p_lines: input.lines,
    p_purchase_list_id: input.purchaseListId ?? null,
    p_notes: input.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (input.purchaseUrl && data) {
    const { error: linkError } = await db
      .from("purchases")
      .update({ receipt_url: optionalText(input.purchaseUrl) })
      .eq("id", data)
      .eq("owner_id", user.id);

    if (linkError) {
      throw new Error(linkError.message);
    }
  }

  revalidatePath("/purchases");
  revalidatePath("/materials");
  revalidatePath("/suppliers");
  revalidatePath("/dashboard");
  return data;
}

export async function fulfillOrderAction(orderId: string) {
  const { supabase, db, user } = await getMutationContext();
  const rpc = supabase as unknown as RpcClient;
  const { data, error } = await rpc.rpc("fulfill_order", {
    p_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { error: statusError } = await db
    .from("orders")
    .update({
      status: "packed",
      fulfillment_status: "fulfilled",
      stock_deducted: true,
    })
    .eq("id", orderId)
    .eq("owner_id", user.id);

  if (statusError) {
    throw new Error(statusError.message);
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/finished-goods");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return data;
}

export async function createStockAdjustmentAction(input: {
  itemType: "raw_material" | "finished_good";
  itemId: string;
  deltaQuantity: number;
  unit: "pcs" | "pack" | "gram" | "meter" | "cm" | "roll" | "set";
  unitCost: number;
  reason: string;
  notes?: string;
}) {
  const { supabase } = await getMutationContext();
  const rpc = supabase as unknown as RpcClient;
  const { data, error } = await rpc.rpc("create_stock_adjustment", {
    p_item_type: input.itemType,
    p_item_id: input.itemId,
    p_delta_quantity: input.deltaQuantity,
    p_unit: input.unit,
    p_unit_cost: input.unitCost,
    p_reason: input.reason,
    p_notes: input.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/materials");
  revalidatePath("/finished-goods");
  revalidatePath("/dashboard");
  return data;
}

export async function createSupplierAction(input: {
  name: string;
  channel: string;
  contact?: string;
  marketplaceUrl?: string;
  notes?: string;
  isPreferred: boolean;
}) {
  const { db, user } = await getMutationContext();
  const name = requireText(input.name, "Supplier name");
  const channel = requireText(input.channel, "Channel");
  const { data, error } = await db
    .from("suppliers")
    .insert({
      owner_id: user.id,
      name,
      channel,
      contact: optionalText(input.contact),
      marketplace_url: optionalText(input.marketplaceUrl),
      notes: optionalText(input.notes),
      is_preferred: input.isPreferred,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/suppliers");
  revalidatePath("/materials");
  revalidatePath("/purchases");
  return (data as { id: string }).id;
}

export async function createMaterialWithVariantAction(input: {
  materialName: string;
  category: MaterialCategory;
  purchaseUnit: Unit;
  usageUnit: Unit;
  conversionFactor: number;
  minStock: number;
  targetStock: number;
  preferredSupplierId?: string;
  materialNotes?: string;
  variantName: string;
  sku?: string;
  color?: string;
  sizeMm?: number;
  packWeightGram?: number;
  packPrice: number;
  unitsPerPack?: number;
  initialStock: number;
  minPurchaseQuantity?: number;
  purchaseIncrementQuantity?: number;
  variantNotes?: string;
}) {
  const { db, user } = await getMutationContext();
  const materialName = requireText(input.materialName, "Material name");
  const variantName = requireText(input.variantName, "Variant name");

  assertPositive(input.conversionFactor, "Conversion factor");
  assertNonNegative(input.minStock, "Minimum stock");
  assertNonNegative(input.targetStock, "Target stock");
  assertNonNegative(input.packPrice, "Pack price");
  assertNonNegative(input.initialStock, "Initial stock");
  assertNonNegative(input.minPurchaseQuantity ?? 0, "Minimum purchase quantity");
  assertNonNegative(input.purchaseIncrementQuantity ?? 0, "Purchase increment quantity");

  const unitsPerPack =
    input.unitsPerPack && input.unitsPerPack > 0
      ? input.unitsPerPack
      : input.category === "pearl" && input.sizeMm && input.sizeMm > 0
        ? calculatePearlEstimate(input.sizeMm).exactPcs
        : input.conversionFactor;
  const roundedUnitsPerPack = Math.round(unitsPerPack);
  const costPerUsageUnit = unitsPerPack > 0 ? input.packPrice / unitsPerPack : 0;

  const { data: materialData, error: materialError } = await db
    .from("materials")
    .insert({
      owner_id: user.id,
      name: materialName,
      category: input.category,
      purchase_unit: input.purchaseUnit,
      usage_unit: input.usageUnit,
      conversion_factor: input.conversionFactor,
      conversion_is_estimated: true,
      min_stock: input.minStock,
      target_stock: input.targetStock,
      preferred_supplier_id: optionalId(input.preferredSupplierId),
      active: true,
      notes: optionalText(input.materialNotes),
    })
    .select("id")
    .single();

  if (materialError) {
    throw new Error(materialError.message);
  }

  const materialId = (materialData as { id: string }).id;
  const { data: variantData, error: variantError } = await db
    .from("material_variants")
    .insert({
      owner_id: user.id,
      material_id: materialId,
      name: variantName,
      sku: optionalText(input.sku),
      color: optionalText(input.color),
      size_mm: input.sizeMm && input.sizeMm > 0 ? input.sizeMm : null,
      pack_weight_gram:
        input.packWeightGram && input.packWeightGram > 0 ? input.packWeightGram : null,
      pack_price: Math.round(input.packPrice),
      estimated_pcs_per_pack: unitsPerPack,
      estimated_pcs_per_pack_rounded: roundedUnitsPerPack,
      actual_counted_pcs_per_pack: input.unitsPerPack && input.unitsPerPack > 0 ? input.unitsPerPack : null,
      estimation_status:
        input.unitsPerPack && input.unitsPerPack > 0 ? "manually_verified" : "formula_estimated",
      cost_per_usage_unit: costPerUsageUnit,
      stock_quantity: input.initialStock,
      min_purchase_quantity: input.minPurchaseQuantity ?? 0,
      purchase_increment_quantity: input.purchaseIncrementQuantity ?? 0,
      usage_unit: input.usageUnit,
      active: true,
      notes: optionalText(input.variantNotes),
    })
    .select("id")
    .single();

  if (variantError) {
    throw new Error(variantError.message);
  }

  revalidatePath("/materials");
  revalidatePath("/purchases");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  return (variantData as { id: string }).id;
}

export async function createProductWithBomAction(input: {
  name: string;
  sku: string;
  category: string;
  sellingPrice: number;
  laborMinutes: number;
  laborRatePerHour: number;
  packagingCost: number;
  overheadCost: number;
  targetMargin: number;
  materialVariantId?: string;
  quantityRequired?: number;
  wastePercentage?: number;
  bomNotes?: string;
  bomLines?: Array<{
    materialVariantId: string;
    quantityRequired: number;
    wastePercentage: number;
    notes?: string;
  }>;
}) {
  const { db, user } = await getMutationContext();
  const name = requireText(input.name, "Product name");
  const sku = requireText(input.sku, "SKU");
  const category = requireText(input.category, "Category");
  const bomLines = input.bomLines?.length
    ? input.bomLines
    : [{
        materialVariantId: requireText(input.materialVariantId ?? "", "BOM material"),
        quantityRequired: input.quantityRequired ?? 1,
        wastePercentage: input.wastePercentage ?? 0,
        notes: input.bomNotes,
      }];

  assertNonNegative(input.sellingPrice, "Selling price");
  assertNonNegative(input.laborMinutes, "Labor minutes");
  assertNonNegative(input.laborRatePerHour, "Labor rate");
  assertNonNegative(input.packagingCost, "Packaging cost");
  assertNonNegative(input.overheadCost, "Overhead cost");
  assertRate(input.targetMargin, "Target margin");
  for (const [index, line] of bomLines.entries()) {
    requireText(line.materialVariantId, `BOM line ${index + 1} material`);
    assertPositive(line.quantityRequired, `BOM line ${index + 1} quantity`);
    assertNonNegative(line.wastePercentage, `BOM line ${index + 1} waste percentage`);
  }

  const { data: productData, error: productError } = await db
    .from("products")
    .insert({
      owner_id: user.id,
      name,
      sku,
      category,
      selling_price: Math.round(input.sellingPrice),
      labor_minutes: input.laborMinutes,
      labor_rate_per_hour: Math.round(input.laborRatePerHour),
      packaging_cost: Math.round(input.packagingCost),
      overhead_cost: Math.round(input.overheadCost),
      target_margin: input.targetMargin,
      current_stock: 0,
      reserved_stock: 0,
      average_unit_manufacturing_cost: 0,
      last_production_cost: 0,
      active: true,
    })
    .select("id")
    .single();

  if (productError) {
    throw new Error(productError.message);
  }

  const productId = (productData as { id: string }).id;
  const bomRows = [];
  for (const line of bomLines) {
    const { data: variantData, error: variantError } = await db
      .from("material_variants")
      .select("usage_unit,cost_per_usage_unit")
      .eq("id", line.materialVariantId)
      .eq("owner_id", user.id)
      .single();

    if (variantError) {
      throw new Error(variantError.message);
    }

    const variant = variantData as { usage_unit: Unit; cost_per_usage_unit: number };
    bomRows.push({
      owner_id: user.id,
      product_id: productId,
      material_variant_id: line.materialVariantId,
      quantity_required: line.quantityRequired,
      usage_unit: variant.usage_unit,
      waste_percentage: line.wastePercentage,
      unit_cost_snapshot: Number(variant.cost_per_usage_unit),
      optional: false,
      active: true,
      notes: optionalText(line.notes),
    });
  }

  for (const row of bomRows) {
    const { error: bomError } = await db
      .from("product_bom_lines")
      .insert(row)
      .select("id")
      .single();

    if (bomError) {
      throw new Error(bomError.message);
    }
  }

  revalidatePath("/products");
  revalidatePath("/production");
  revalidatePath("/finished-goods");
  revalidatePath("/dashboard");
  return productId;
}

export async function updateProductAction(input: {
  productId: string;
  name: string;
  sku: string;
  category: string;
  sellingPrice: number;
  laborMinutes: number;
  laborRatePerHour: number;
  packagingCost: number;
  overheadCost: number;
  targetMargin: number;
  bomLines: Array<{
    materialVariantId: string;
    quantityRequired: number;
    wastePercentage: number;
    notes?: string;
  }>;
}) {
  const { db, user } = await getMutationContext();
  const productId = requireText(input.productId, "Product");
  const name = requireText(input.name, "Product name");
  const sku = requireText(input.sku, "SKU");
  const category = requireText(input.category, "Category");

  assertNonNegative(input.sellingPrice, "Selling price");
  assertNonNegative(input.laborMinutes, "Labor minutes");
  assertNonNegative(input.laborRatePerHour, "Labor rate");
  assertNonNegative(input.packagingCost, "Packaging cost");
  assertNonNegative(input.overheadCost, "Overhead cost");
  assertRate(input.targetMargin, "Target margin");
  if (!input.bomLines.length) {
    throw new Error("Product must include at least one BOM line.");
  }

  for (const [index, line] of input.bomLines.entries()) {
    requireText(line.materialVariantId, `BOM line ${index + 1} material`);
    assertPositive(line.quantityRequired, `BOM line ${index + 1} quantity`);
    assertNonNegative(line.wastePercentage, `BOM line ${index + 1} waste percentage`);
  }

  const { error: productError } = await db
    .from("products")
    .update({
      name,
      sku,
      category,
      selling_price: Math.round(input.sellingPrice),
      labor_minutes: input.laborMinutes,
      labor_rate_per_hour: Math.round(input.laborRatePerHour),
      packaging_cost: Math.round(input.packagingCost),
      overhead_cost: Math.round(input.overheadCost),
      target_margin: input.targetMargin,
    })
    .eq("id", productId)
    .eq("owner_id", user.id);

  if (productError) {
    throw new Error(productError.message);
  }

  const { error: deactivateError } = await db
    .from("product_bom_lines")
    .update({ active: false })
    .eq("product_id", productId)
    .eq("owner_id", user.id);

  if (deactivateError) {
    throw new Error(deactivateError.message);
  }

  const bomRows = [];
  for (const line of input.bomLines) {
    const { data: variantData, error: variantError } = await db
      .from("material_variants")
      .select("usage_unit,cost_per_usage_unit")
      .eq("id", line.materialVariantId)
      .eq("owner_id", user.id)
      .single();

    if (variantError) {
      throw new Error(variantError.message);
    }

    const variant = variantData as { usage_unit: Unit; cost_per_usage_unit: number };
    bomRows.push({
      owner_id: user.id,
      product_id: productId,
      material_variant_id: line.materialVariantId,
      quantity_required: line.quantityRequired,
      usage_unit: variant.usage_unit,
      waste_percentage: line.wastePercentage,
      unit_cost_snapshot: Number(variant.cost_per_usage_unit),
      optional: false,
      active: true,
      notes: optionalText(line.notes),
    });
  }

  for (const row of bomRows) {
    const { error: bomError } = await db
      .from("product_bom_lines")
      .insert(row)
      .select("id")
      .single();

    if (bomError) {
      throw new Error(bomError.message);
    }
  }

  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/production");
  revalidatePath("/finished-goods");
  revalidatePath("/dashboard");
  return productId;
}

export async function createOrderAction(input: {
  orderNumber?: string;
  orderDate: string;
  customerName: string;
  platform: SalesPlatform;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  productId?: string;
  quantity?: number;
  unitSellingPrice?: number;
  discount: number;
  shippingFeeCharged: number;
  shippingCostPaid: number;
  platformFee: number;
  packagingCost: number;
  notes?: string;
  items?: Array<{
    productId: string;
    quantity: number;
    unitSellingPrice: number;
    discountAllocated?: number;
  }>;
}) {
  const { db, user } = await getMutationContext();
  const orderDate = input.orderDate || new Date().toISOString().slice(0, 10);
  const orderNumber = optionalText(input.orderNumber) ?? await generateOrderNumber(db, user.id, orderDate);
  const customerName = requireText(input.customerName, "Customer name");
  const orderItems = input.items?.length
    ? input.items
    : [{
        productId: requireText(input.productId ?? "", "Product"),
        quantity: input.quantity ?? 1,
        unitSellingPrice: input.unitSellingPrice ?? 0,
        discountAllocated: input.discount,
      }];

  for (const [index, item] of orderItems.entries()) {
    requireText(item.productId, `Order line ${index + 1} product`);
    assertPositive(item.quantity, `Order line ${index + 1} quantity`);
    assertNonNegative(item.unitSellingPrice, `Order line ${index + 1} unit selling price`);
    assertNonNegative(item.discountAllocated ?? 0, `Order line ${index + 1} discount`);
  }
  assertNonNegative(input.discount, "Discount");
  assertNonNegative(input.shippingFeeCharged, "Shipping fee charged");
  assertNonNegative(input.shippingCostPaid, "Shipping cost paid");
  assertNonNegative(input.platformFee, "Platform fee");
  assertNonNegative(input.packagingCost, "Packaging cost");

  const preparedItems = [];
  for (const item of orderItems) {
    const { data: productData, error: productError } = await db
      .from("products")
      .select("selling_price,average_unit_manufacturing_cost,last_production_cost,reserved_stock")
      .eq("id", item.productId)
      .eq("owner_id", user.id)
      .single();

    if (productError) {
      throw new Error(productError.message);
    }

    const product = productData as {
      selling_price: number;
      average_unit_manufacturing_cost: number;
      last_production_cost: number;
      reserved_stock: number;
    };
    const unitSellingPrice = item.unitSellingPrice || product.selling_price;
    const discountAllocated = item.discountAllocated ?? 0;
    const lineRevenue = Math.round(item.quantity * unitSellingPrice) - discountAllocated;
    const unitCost =
      Number(product.average_unit_manufacturing_cost) || Number(product.last_production_cost) || 0;
    const lineCogs = item.quantity * unitCost;
    const lineGrossProfit = lineRevenue - lineCogs;
    preparedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      unitSellingPrice,
      discountAllocated,
      unitCost,
      lineRevenue,
      lineCogs,
      lineGrossProfit,
      lineMargin: lineRevenue > 0 ? lineGrossProfit / lineRevenue : 0,
      reservedStock: Number(product.reserved_stock),
    });
  }

  const subtotal = preparedItems.reduce((sum, item) => sum + item.lineRevenue, 0);
  const cogs = preparedItems.reduce((sum, item) => sum + item.lineCogs, 0);
  const grossProfit = subtotal - cogs;
  const netRevenue = subtotal - input.platformFee + input.shippingFeeCharged;
  const netProfit =
    netRevenue - cogs - input.shippingCostPaid - input.packagingCost;

  const { data: orderData, error: orderError } = await db
    .from("orders")
    .insert({
      owner_id: user.id,
      order_number: orderNumber,
      order_date: orderDate,
      customer_name: customerName,
      platform: input.platform,
      status: input.status,
      payment_status: input.paymentStatus,
      fulfillment_status: input.status === "confirmed" ? "reserved" : "unfulfilled",
      subtotal,
      discount: input.discount,
      shipping_fee_charged: input.shippingFeeCharged,
      shipping_cost_paid: input.shippingCostPaid,
      platform_fee: input.platformFee,
      packaging_cost: input.packagingCost,
      net_revenue: netRevenue,
      cogs,
      gross_profit: grossProfit,
      net_profit: netProfit,
      stock_deducted: false,
      notes: optionalText(input.notes),
    })
    .select("id")
    .single();

  if (orderError) {
    throw new Error(orderError.message);
  }

  const orderId = (orderData as { id: string }).id;
  for (const item of preparedItems) {
    const { error: itemError } = await db
      .from("order_items")
      .insert({
        owner_id: user.id,
        order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_selling_price: Math.round(item.unitSellingPrice),
        discount_allocated: item.discountAllocated,
        unit_cost: item.unitCost,
        line_revenue: item.lineRevenue,
        line_cogs: item.lineCogs,
        line_gross_profit: item.lineGrossProfit,
        line_margin: item.lineMargin,
      })
      .select("id")
      .single();

    if (itemError) {
      throw new Error(itemError.message);
    }
  }

  if (input.status === "confirmed") {
    const reservationByProduct = preparedItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.productId] = (acc[item.productId] ?? 0) + item.quantity;
      return acc;
    }, {});

    for (const [productId, quantity] of Object.entries(reservationByProduct)) {
      const reservedStock = preparedItems.find((item) => item.productId === productId)?.reservedStock ?? 0;
      const { error: reserveError } = await db
        .from("products")
        .update({
          reserved_stock: reservedStock + quantity,
        })
        .eq("id", productId)
        .eq("owner_id", user.id);

      if (reserveError) {
        throw new Error(reserveError.message);
      }
    }
  }

  revalidatePath("/orders");
  revalidatePath("/finished-goods");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return orderId;
}

export async function updateOrderStatusAction(input: {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}) {
  const { db, user } = await getMutationContext();
  const orderId = requireText(input.orderId, "Order");

  const { data: orderData, error: orderError } = await db
    .from("orders")
    .select("status,stock_deducted")
    .eq("id", orderId)
    .eq("owner_id", user.id)
    .single();

  if (orderError) {
    throw new Error(orderError.message);
  }

  const order = orderData as { status: OrderStatus; stock_deducted: boolean };
  const allowedAfterPacked: OrderStatus[] = ["packed", "shipped", "completed", "cancelled", "returned"];

  if (order.stock_deducted && !allowedAfterPacked.includes(input.status)) {
    throw new Error("Fulfilled orders can only move from packed onward.");
  }

  const { error } = await db
    .from("orders")
    .update({
      status: input.status,
      payment_status: input.paymentStatus,
    })
    .eq("id", orderId)
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return orderId;
}

export async function updateSettingsAction(input: {
  allowNegativeStock: boolean;
  targetMargin: number;
  laborRatePerHour: number;
  defaultPlatformFeeRate: number;
}) {
  const { db, user } = await getMutationContext();
  assertRate(input.targetMargin, "Target margin");
  assertRate(input.defaultPlatformFeeRate, "Default platform fee rate");
  assertNonNegative(input.laborRatePerHour, "Labor rate");

  const { data, error } = await db
    .from("settings")
    .upsert(
      {
        owner_id: user.id,
        allow_negative_stock: input.allowNegativeStock,
        target_margin: input.targetMargin,
        labor_rate_per_hour: Math.round(input.laborRatePerHour),
        default_platform_fee_rate: input.defaultPlatformFeeRate,
        costing_method: "latest_purchase",
      },
      { onConflict: "owner_id" },
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/products");
  revalidatePath("/production");
  revalidatePath("/dashboard");
  return (data as { id: string }).id;
}
