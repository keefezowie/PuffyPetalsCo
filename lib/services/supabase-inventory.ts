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
  SalesPlatform,
  Unit,
} from "@/lib/types";

type RpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: string | null; error: { message: string } | null }>;
};

type DbError = { message: string };

type SingleQuery = {
  single: () => Promise<{ data: unknown; error: DbError | null }>;
};

type SelectBuilder = {
  eq: (column: string, value: unknown) => SelectBuilder;
  single: () => Promise<{ data: unknown; error: DbError | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: DbError | null }>;
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

export async function recordPurchaseAction(input: {
  supplierId: string;
  date: string;
  shippingCost: number;
  discount: number;
  lines: Json;
  notes?: string;
}) {
  const { supabase } = await getMutationContext();
  const rpc = supabase as unknown as RpcClient;
  const { data, error } = await rpc.rpc("record_purchase", {
    p_supplier_id: input.supplierId,
    p_date: input.date,
    p_shipping_cost: input.shippingCost,
    p_discount: input.discount,
    p_lines: input.lines,
    p_notes: input.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/purchases");
  revalidatePath("/materials");
  revalidatePath("/suppliers");
  revalidatePath("/dashboard");
  return data;
}

export async function fulfillOrderAction(orderId: string) {
  const { supabase } = await getMutationContext();
  const rpc = supabase as unknown as RpcClient;
  const { data, error } = await rpc.rpc("fulfill_order", {
    p_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/orders");
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
  materialVariantId: string;
  quantityRequired: number;
  wastePercentage: number;
  bomNotes?: string;
}) {
  const { db, user } = await getMutationContext();
  const name = requireText(input.name, "Product name");
  const sku = requireText(input.sku, "SKU");
  const category = requireText(input.category, "Category");
  const materialVariantId = requireText(input.materialVariantId, "BOM material");

  assertNonNegative(input.sellingPrice, "Selling price");
  assertNonNegative(input.laborMinutes, "Labor minutes");
  assertNonNegative(input.laborRatePerHour, "Labor rate");
  assertNonNegative(input.packagingCost, "Packaging cost");
  assertNonNegative(input.overheadCost, "Overhead cost");
  assertRate(input.targetMargin, "Target margin");
  assertPositive(input.quantityRequired, "BOM quantity");
  assertNonNegative(input.wastePercentage, "Waste percentage");

  const { data: variantData, error: variantError } = await db
    .from("material_variants")
    .select("usage_unit,cost_per_usage_unit")
    .eq("id", materialVariantId)
    .eq("owner_id", user.id)
    .single();

  if (variantError) {
    throw new Error(variantError.message);
  }

  const variant = variantData as { usage_unit: Unit; cost_per_usage_unit: number };
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
  const { error: bomError } = await db
    .from("product_bom_lines")
    .insert({
      owner_id: user.id,
      product_id: productId,
      material_variant_id: materialVariantId,
      quantity_required: input.quantityRequired,
      usage_unit: variant.usage_unit,
      waste_percentage: input.wastePercentage,
      unit_cost_snapshot: Number(variant.cost_per_usage_unit),
      optional: false,
      active: true,
      notes: optionalText(input.bomNotes),
    })
    .select("id")
    .single();

  if (bomError) {
    throw new Error(bomError.message);
  }

  revalidatePath("/products");
  revalidatePath("/production");
  revalidatePath("/finished-goods");
  revalidatePath("/dashboard");
  return productId;
}

export async function createOrderAction(input: {
  orderNumber: string;
  orderDate: string;
  customerName: string;
  platform: SalesPlatform;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  productId: string;
  quantity: number;
  unitSellingPrice: number;
  discount: number;
  shippingFeeCharged: number;
  shippingCostPaid: number;
  platformFee: number;
  packagingCost: number;
  notes?: string;
}) {
  const { db, user } = await getMutationContext();
  const orderNumber = requireText(input.orderNumber, "Order number");
  const customerName = requireText(input.customerName, "Customer name");
  const productId = requireText(input.productId, "Product");

  assertPositive(input.quantity, "Quantity");
  assertNonNegative(input.unitSellingPrice, "Unit selling price");
  assertNonNegative(input.discount, "Discount");
  assertNonNegative(input.shippingFeeCharged, "Shipping fee charged");
  assertNonNegative(input.shippingCostPaid, "Shipping cost paid");
  assertNonNegative(input.platformFee, "Platform fee");
  assertNonNegative(input.packagingCost, "Packaging cost");

  const { data: productData, error: productError } = await db
    .from("products")
    .select("selling_price,average_unit_manufacturing_cost,last_production_cost,reserved_stock")
    .eq("id", productId)
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
  const unitSellingPrice = input.unitSellingPrice || product.selling_price;
  const lineRevenue = Math.round(input.quantity * unitSellingPrice) - input.discount;
  const unitCost =
    Number(product.average_unit_manufacturing_cost) || Number(product.last_production_cost) || 0;
  const lineCogs = input.quantity * unitCost;
  const grossProfit = lineRevenue - lineCogs;
  const lineMargin = lineRevenue > 0 ? grossProfit / lineRevenue : 0;
  const netRevenue =
    lineRevenue - input.platformFee + input.shippingFeeCharged;
  const netProfit =
    netRevenue - lineCogs - input.shippingCostPaid - input.packagingCost;

  const { data: orderData, error: orderError } = await db
    .from("orders")
    .insert({
      owner_id: user.id,
      order_number: orderNumber,
      order_date: input.orderDate,
      customer_name: customerName,
      platform: input.platform,
      status: input.status,
      payment_status: input.paymentStatus,
      fulfillment_status: input.status === "confirmed" ? "reserved" : "unfulfilled",
      subtotal: lineRevenue,
      discount: 0,
      shipping_fee_charged: input.shippingFeeCharged,
      shipping_cost_paid: input.shippingCostPaid,
      platform_fee: input.platformFee,
      packaging_cost: input.packagingCost,
      net_revenue: netRevenue,
      cogs: lineCogs,
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
  const { error: itemError } = await db
    .from("order_items")
    .insert({
      owner_id: user.id,
      order_id: orderId,
      product_id: productId,
      quantity: input.quantity,
      unit_selling_price: Math.round(unitSellingPrice),
      discount_allocated: input.discount,
      unit_cost: unitCost,
      line_revenue: lineRevenue,
      line_cogs: lineCogs,
      line_gross_profit: grossProfit,
      line_margin: lineMargin,
    })
    .select("id")
    .single();

  if (itemError) {
    throw new Error(itemError.message);
  }

  if (input.status === "confirmed") {
    const { error: reserveError } = await db
      .from("products")
      .update({
        reserved_stock: Number(product.reserved_stock) + input.quantity,
      })
      .eq("id", productId)
      .eq("owner_id", user.id);

    if (reserveError) {
      throw new Error(reserveError.message);
    }
  }

  revalidatePath("/orders");
  revalidatePath("/finished-goods");
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
