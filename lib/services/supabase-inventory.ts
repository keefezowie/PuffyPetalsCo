"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

type RpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: string | null; error: { message: string } | null }>;
};

export async function createProductionBatchAction(input: {
  productId: string;
  quantityMade: number;
  date: string;
  notes?: string;
}) {
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  return data;
}

export async function fulfillOrderAction(orderId: string) {
  const supabase = await createClient();
  const rpc = supabase as unknown as RpcClient;
  const { data, error } = await rpc.rpc("fulfill_order", {
    p_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/orders");
  revalidatePath("/finished-goods");
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
  const supabase = await createClient();
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
  return data;
}
