"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { EntitySelect } from "@/components/forms/entity-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PendingButton } from "@/components/ui/pending-button";
import { RefreshingIndicator } from "@/components/ui/state-views";
import { createStockAdjustmentAction } from "@/lib/services/supabase-inventory";
import type { InventoryState } from "@/lib/types";

export function StockAdjustmentForm({ state }: { state: InventoryState }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const defaultVariant = state.materialVariants[0]?.id ?? "";

  async function action(formData: FormData) {
    const itemId = String(formData.get("itemId") ?? "");
    const variant = state.materialVariants.find((entry) => entry.id === itemId);
    const deltaQuantity = Number(formData.get("deltaQuantity") ?? 0);
    const unitCost = Number(formData.get("unitCost") ?? variant?.costPerUsageUnit ?? 0);
    const reason = String(formData.get("reason") ?? "");
    const notes = String(formData.get("notes") ?? "");

    try {
      await createStockAdjustmentAction({
        itemType: "raw_material",
        itemId,
        deltaQuantity,
        unit: variant?.usageUnit ?? "pcs",
        unitCost,
        reason,
        notes,
      });
      toast.success("Stock adjustment saved", {
        description: "The adjustment and matching inventory movement were recorded.",
      });
      startRefresh(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error("Adjustment failed", {
        description: error instanceof Error ? error.message : "Unknown adjustment error.",
      });
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <SlidersHorizontal data-icon="inline-start" aria-hidden />
        Quick adjustment
      </DialogTrigger>
      <DialogContent className="max-h-[min(90svh,720px)] overflow-y-auto sm:max-w-xl">
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal aria-hidden />
          Quick Stock Adjustment
        </CardTitle>
        <CardDescription>
          Use only for counts, corrections, damage, or waste found outside normal flows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-5" aria-busy={isRefreshing}>
          <FieldGroup>
            <Field>
              <FieldLabel>Raw material variant</FieldLabel>
              <EntitySelect
                name="itemId"
                defaultValue={defaultVariant}
                placeholder="Select material variant"
                items={state.materialVariants.map((variant) => {
                  const material = state.materials.find((entry) => entry.id === variant.materialId);
                  return {
                    value: variant.id,
                    label: variant.name,
                    description: material?.name,
                  };
                })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="deltaQuantity">Adjustment quantity</FieldLabel>
              <Input id="deltaQuantity" name="deltaQuantity" type="number" step="0.0001" defaultValue="0" required />
              <FieldDescription>Use positive numbers to add stock and negative numbers to remove stock.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="unitCost">Unit cost</FieldLabel>
              <Input id="unitCost" name="unitCost" type="number" step="0.0001" defaultValue="0" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="reason">Reason</FieldLabel>
              <Input id="reason" name="reason" placeholder="Stock count correction, damage, waste" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Input id="notes" name="notes" placeholder="Optional details" />
            </Field>
          </FieldGroup>
          <PendingButton type="submit" disabled={!defaultVariant} pendingText="Saving adjustment...">
            Save adjustment
          </PendingButton>
          <RefreshingIndicator show={isRefreshing} />
        </form>
      </CardContent>
    </Card>
      </DialogContent>
    </Dialog>
  );
}
