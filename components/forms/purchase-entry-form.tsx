"use client";

import { PackagePlus } from "lucide-react";
import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EntitySelect } from "@/components/forms/entity-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PendingButton } from "@/components/ui/pending-button";
import { RefreshingIndicator } from "@/components/ui/state-views";
import { formatQuantity, formatRupiahDecimal } from "@/lib/formatters";
import { recordPurchaseAction } from "@/lib/services/supabase-inventory";
import type { InventoryState } from "@/lib/types";

export function PurchaseEntryForm({ state }: { state: InventoryState }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const defaultSupplier = state.suppliers[0]?.id ?? "";
  const defaultVariant =
    state.materialVariants.find((variant) => variant.sizeMm === 12)?.id ??
    state.materialVariants[0]?.id ??
    "";
  const selectedVariant = state.materialVariants.find(
    (variant) => variant.id === defaultVariant,
  );
  const selectedMaterial = state.materials.find(
    (material) => material.id === selectedVariant?.materialId,
  );
  const estimatedAdded = useMemo(() => {
    if (!selectedVariant || !selectedMaterial) {
      return 0;
    }
    if (selectedVariant.actualCountedPcsPerPack) {
      return selectedVariant.actualCountedPcsPerPack;
    }
    if (selectedVariant.estimatedPcsPerPack) {
      return selectedVariant.estimatedPcsPerPack;
    }
    return selectedMaterial.conversionFactor;
  }, [selectedMaterial, selectedVariant]);

  async function action(formData: FormData) {
    const supplierId = String(formData.get("supplierId") ?? "");
    const materialVariantId = String(formData.get("materialVariantId") ?? "");
    const quantityPurchased = Number(formData.get("quantityPurchased") ?? 0);
    const totalPrice = Number(formData.get("totalPrice") ?? 0);
    const shippingCost = Number(formData.get("shippingCost") ?? 0);
    const discount = Number(formData.get("discount") ?? 0);
    const date = String(formData.get("date") ?? new Date().toISOString().slice(0, 10));
    const quantityAddedUsageUnit = Number(formData.get("quantityAddedUsageUnit") ?? 0);
    const purchaseUnit = String(formData.get("purchaseUnit") ?? "pack") as "pcs" | "pack" | "gram" | "meter" | "cm" | "roll" | "set";
    const notes = String(formData.get("notes") ?? "");

    try {
      await recordPurchaseAction({
        supplierId,
        date,
        shippingCost,
        discount,
        notes,
        lines: [
          {
            material_variant_id: materialVariantId,
            quantity_purchased: quantityPurchased,
            purchase_unit: purchaseUnit,
            total_price: totalPrice,
            quantity_added_usage_unit: quantityAddedUsageUnit,
          },
        ],
      });
      toast.success("Purchase saved", {
        description: "Material stock, latest cost, movement log, and price history were updated.",
      });
      startRefresh(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error("Purchase failed", {
        description: error instanceof Error ? error.message : "Unknown purchase error.",
      });
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button />}>
        <PackagePlus data-icon="inline-start" aria-hidden />
        Record purchase
      </DialogTrigger>
      <DialogContent className="max-h-[min(90svh,920px)] overflow-y-auto sm:max-w-2xl">
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackagePlus aria-hidden />
          Purchase Entry
        </CardTitle>
        <CardDescription>
          Saves through the `record_purchase` RPC transaction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-5" aria-busy={isRefreshing}>
          <FieldGroup>
            <Field>
              <FieldLabel>Supplier</FieldLabel>
              <EntitySelect
                name="supplierId"
                defaultValue={defaultSupplier}
                placeholder="Select supplier"
                items={state.suppliers.map((supplier) => ({
                  value: supplier.id,
                  label: supplier.name,
                  description: supplier.channel,
                }))}
              />
            </Field>
            <Field>
              <FieldLabel>Material variant</FieldLabel>
              <EntitySelect
                name="materialVariantId"
                defaultValue={defaultVariant}
                placeholder="Select material"
                items={state.materialVariants.map((variant) => {
                  const material = state.materials.find((entry) => entry.id === variant.materialId);
                  return {
                    value: variant.id,
                    label: variant.name,
                    description: material?.name,
                  };
                })}
              />
              <FieldDescription>
                Default quantity added uses the selected variant estimate.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="quantityPurchased">Quantity purchased</FieldLabel>
              <Input id="quantityPurchased" name="quantityPurchased" type="number" step="0.01" defaultValue="1" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="purchaseUnit">Purchase unit</FieldLabel>
              <Input id="purchaseUnit" name="purchaseUnit" defaultValue={selectedMaterial?.purchaseUnit ?? "pack"} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="quantityAddedUsageUnit">Quantity added to stock</FieldLabel>
              <Input
                id="quantityAddedUsageUnit"
                name="quantityAddedUsageUnit"
                type="number"
                step="0.0001"
                defaultValue={estimatedAdded.toFixed(4)}
                required
              />
              <FieldDescription>
                {selectedVariant
                  ? `${formatQuantity(estimatedAdded, selectedVariant.usageUnit)} at current estimate ${formatRupiahDecimal(selectedVariant.costPerUsageUnit)}`
                  : "Create material variants before recording purchases."}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="totalPrice">Line total price</FieldLabel>
              <Input id="totalPrice" name="totalPrice" type="number" defaultValue={selectedVariant?.packPrice ?? 0} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="shippingCost">Shipping cost</FieldLabel>
              <Input id="shippingCost" name="shippingCost" type="number" defaultValue="0" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="discount">Discount</FieldLabel>
              <Input id="discount" name="discount" type="number" defaultValue="0" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="date">Date</FieldLabel>
              <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Input id="notes" name="notes" placeholder="Shopee order, receipt number, or supplier note" />
            </Field>
          </FieldGroup>
          <PendingButton type="submit" disabled={!defaultSupplier || !defaultVariant} pendingText="Saving purchase...">
            Save purchase
          </PendingButton>
          <RefreshingIndicator show={isRefreshing} />
        </form>
      </CardContent>
    </Card>
      </DialogContent>
    </Dialog>
  );
}
