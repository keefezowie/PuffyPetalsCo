"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PendingButton } from "@/components/ui/pending-button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    <Card>
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
              <Select name="itemId" defaultValue={defaultVariant}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select material variant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {state.materialVariants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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
  );
}
