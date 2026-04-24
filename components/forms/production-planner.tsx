"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Factory, Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshingIndicator } from "@/components/ui/state-views";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatQuantity, formatRupiah } from "@/lib/formatters";
import {
  canProduce,
  calculateProductManufacturingCost,
} from "@/lib/services/inventory";
import { createProductionBatchAction } from "@/lib/services/supabase-inventory";
import type { InventoryState } from "@/lib/types";
import { productionSchema } from "@/lib/validations";

type ProductionInput = z.input<typeof productionSchema>;
type ProductionValues = z.output<typeof productionSchema>;

export function ProductionPlanner({ initialState }: { initialState: InventoryState }) {
  const router = useRouter();
  const [state] = useState<InventoryState>(initialState);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const defaultProductId = initialState.products[0]?.id ?? "";
  const form = useForm<ProductionInput, unknown, ProductionValues>({
    resolver: zodResolver(productionSchema),
    defaultValues: {
      productId: defaultProductId,
      quantityMade: 10,
      date: new Date().toISOString().slice(0, 10),
      notes: "Made for Shopee order",
    },
    mode: "onChange",
  });
  // eslint-disable-next-line react-hooks/incompatible-library
  const values = form.watch();
  const selectedProduct = state.products.find((product) => product.id === values.productId);
  const feasibility = useMemo(() => {
    const parsed = productionSchema.safeParse(values);
    return parsed.success
      ? canProduce(state, parsed.data.productId, parsed.data.quantityMade)
      : null;
  }, [state, values]);
  const cost = selectedProduct
    ? calculateProductManufacturingCost(state, selectedProduct.id)
    : null;

  const onSubmit = form.handleSubmit(async (payload) => {
    try {
      const batchId = await createProductionBatchAction({
        productId: payload.productId,
        quantityMade: payload.quantityMade,
        date: payload.date,
        notes: payload.notes,
      });

      setLastBatchId(batchId);
      toast.success("Production batch saved", {
        description: `${selectedProduct?.name ?? "Product"} stock and material movements were updated.`,
      });
      startRefresh(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error("Production blocked", {
        description: error instanceof Error ? error.message : "Unknown production error.",
      });
    }
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory aria-hidden />
              Production Batch
            </CardTitle>
            <CardDescription>
              Saves a production batch through the database transaction.
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" aria-busy={form.formState.isSubmitting || isRefreshing}>
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.productId}>
                <FieldLabel>Product</FieldLabel>
                <Select
                  value={values.productId}
                  onValueChange={(value) => {
                    if (value) {
                      form.setValue("productId", value, { shouldValidate: true });
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {state.products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError errors={[form.formState.errors.productId]} />
              </Field>
              <Field data-invalid={!!form.formState.errors.quantityMade}>
                <FieldLabel htmlFor="quantityMade">Quantity made</FieldLabel>
                <Input id="quantityMade" type="number" {...form.register("quantityMade")} />
                <FieldError errors={[form.formState.errors.quantityMade]} />
              </Field>
              <Field data-invalid={!!form.formState.errors.date}>
                <FieldLabel htmlFor="date">Production date</FieldLabel>
                <Input id="date" type="date" {...form.register("date")} />
                <FieldError errors={[form.formState.errors.date]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                <Input id="notes" {...form.register("notes")} />
              </Field>
            </FieldGroup>
            <Button
              type="submit"
              disabled={!defaultProductId || !feasibility?.canProduceRequested || form.formState.isSubmitting}
              aria-busy={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />
                  Creating batch...
                </>
              ) : (
                "Create production batch"
              )}
            </Button>
            <RefreshingIndicator show={isRefreshing} />
            {lastBatchId ? (
              <Badge variant="secondary" className="w-fit">
                Last batch: {lastBatchId.slice(0, 18)}
              </Badge>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Material Feasibility</CardTitle>
          <CardDescription>
            {selectedProduct && cost
              ? `${selectedProduct.name} cost: ${formatRupiah(cost.totalCost)} per unit`
              : "Select a product to calculate requirements."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feasibility ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={feasibility.canProduceRequested ? "secondary" : "destructive"}>
                  {feasibility.canProduceRequested
                    ? `Can make ${feasibility.requestedQuantity}`
                    : `Can make ${feasibility.maxProducibleQuantity}`}
                </Badge>
                {feasibility.limitingMaterial ? (
                  <Badge variant="outline">Limiting: {feasibility.limitingMaterial}</Badge>
                ) : null}
              </div>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Need</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Shortage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feasibility.lines.map((line) => (
                      <TableRow key={line.materialVariantId}>
                        <TableCell>{line.materialName}</TableCell>
                        <TableCell>{formatQuantity(line.requiredQuantity, line.usageUnit)}</TableCell>
                        <TableCell>{formatQuantity(line.availableQuantity, line.usageUnit)}</TableCell>
                        <TableCell>
                          {line.shortageQuantity > 0 ? (
                            <Badge variant="destructive">
                              {formatQuantity(line.shortageQuantity, line.usageUnit)}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">None</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Enter valid production details.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
