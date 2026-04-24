"use client";

import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
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

function getLineDefaults(state: InventoryState, variantId: string) {
  const selectedVariant = state.materialVariants.find((variant) => variant.id === variantId);
  const selectedMaterial = state.materials.find(
    (material) => material.id === selectedVariant?.materialId,
  );
  const estimatedAdded =
    selectedVariant?.actualCountedPcsPerPack ??
    selectedVariant?.estimatedPcsPerPack ??
    selectedMaterial?.conversionFactor ??
    0;

  return {
    selectedVariant,
    selectedMaterial,
    estimatedAdded,
  };
}

function PurchaseLinesEditor({
  state,
  defaultVariant,
}: {
  state: InventoryState;
  defaultVariant: string;
}) {
  const [rows, setRows] = useState(() => [{
    key: "1",
    materialVariantId: defaultVariant,
  }]);
  const items = state.materialVariants.map((variant) => {
    const material = state.materials.find((entry) => entry.id === variant.materialId);
    return {
      value: variant.id,
      label: variant.name,
      description: material?.name,
    };
  });

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="purchaseLineKeys" value={rows.map((row) => row.key).join(",")} />
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>Raw material lines</FieldLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!defaultVariant}
          onClick={() => {
            setRows((current) => [
              ...current,
              {
                key: crypto.randomUUID(),
                materialVariantId: defaultVariant,
              },
            ]);
          }}
        >
          <Plus data-icon="inline-start" aria-hidden />
          Add material
        </Button>
      </div>
      {rows.map((row, index) => {
        const { selectedVariant, selectedMaterial, estimatedAdded } = getLineDefaults(
          state,
          row.materialVariantId,
        );

        return (
          <div key={row.key} className="rounded-lg border bg-muted/20 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Purchase line {index + 1}</div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove purchase line ${index + 1}`}
                disabled={rows.length === 1}
                onClick={() => setRows((current) => current.filter((entry) => entry.key !== row.key))}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel>Material variant</FieldLabel>
                <EntitySelect
                  name={`materialVariantId-${row.key}`}
                  value={row.materialVariantId}
                  onValueChange={(value) => {
                    setRows((current) =>
                      current.map((entry) =>
                        entry.key === row.key ? { ...entry, materialVariantId: value } : entry,
                      ),
                    );
                  }}
                  placeholder="Select material"
                  items={items}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`quantity-purchased-${row.key}`}>Quantity purchased</FieldLabel>
                <Input id={`quantity-purchased-${row.key}`} name={`quantityPurchased-${row.key}`} type="number" step="0.01" defaultValue="1" required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`purchase-unit-${row.key}`}>Purchase unit</FieldLabel>
                <Input id={`purchase-unit-${row.key}`} name={`purchaseUnit-${row.key}`} defaultValue={selectedMaterial?.purchaseUnit ?? "pack"} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`quantity-added-${row.key}`}>Quantity added to stock</FieldLabel>
                <Input
                  key={`quantity-added-${row.key}-${row.materialVariantId}`}
                  id={`quantity-added-${row.key}`}
                  name={`quantityAddedUsageUnit-${row.key}`}
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
                <FieldLabel htmlFor={`total-price-${row.key}`}>Line total price</FieldLabel>
                <Input
                  key={`total-price-${row.key}-${row.materialVariantId}`}
                  id={`total-price-${row.key}`}
                  name={`totalPrice-${row.key}`}
                  type="number"
                  defaultValue={selectedVariant?.packPrice ?? 0}
                  required
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor={`line-notes-${row.key}`}>Line notes</FieldLabel>
                <Input id={`line-notes-${row.key}`} name={`lineNotes-${row.key}`} />
              </Field>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PurchaseEntryForm({ state }: { state: InventoryState }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const defaultSupplier = state.suppliers[0]?.id ?? "";
  const defaultVariant =
    state.materialVariants.find((variant) => variant.sizeMm === 12)?.id ??
    state.materialVariants[0]?.id ??
    "";

  async function action(formData: FormData) {
    const supplierId = String(formData.get("supplierId") ?? "");
    const lineKeys = String(formData.get("purchaseLineKeys") ?? "")
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);
    const shippingCost = Number(formData.get("shippingCost") ?? 0);
    const discount = Number(formData.get("discount") ?? 0);
    const date = String(formData.get("date") ?? new Date().toISOString().slice(0, 10));
    const purchaseUrl = String(formData.get("purchaseUrl") ?? "");
    const notes = String(formData.get("notes") ?? "");

    try {
      await recordPurchaseAction({
        supplierId,
        date,
        shippingCost,
        discount,
        purchaseUrl,
        notes,
        lines: lineKeys.map((key) => ({
          material_variant_id: String(formData.get(`materialVariantId-${key}`) ?? ""),
          quantity_purchased: Number(formData.get(`quantityPurchased-${key}`) ?? 0),
          purchase_unit: String(formData.get(`purchaseUnit-${key}`) ?? "pack"),
          total_price: Number(formData.get(`totalPrice-${key}`) ?? 0),
          quantity_added_usage_unit: Number(formData.get(`quantityAddedUsageUnit-${key}`) ?? 0),
          notes: String(formData.get(`lineNotes-${key}`) ?? ""),
        })),
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
            <PurchaseLinesEditor state={state} defaultVariant={defaultVariant} />
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
              <FieldLabel htmlFor="purchaseUrl">Purchase link</FieldLabel>
              <Input id="purchaseUrl" name="purchaseUrl" type="url" placeholder="https://shopee.co.id/..." />
              <FieldDescription>Used by the purchase history repurchase button.</FieldDescription>
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
