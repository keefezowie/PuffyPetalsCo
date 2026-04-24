import { SlidersHorizontal } from "lucide-react";

import { MaterialCreateForm } from "@/components/forms/master-data-forms";
import { StockAdjustmentForm } from "@/components/forms/stock-adjustment-form";
import { PageHeader } from "@/components/layout/page-helpers";
import { MaterialsTable, type MaterialRow } from "@/components/tables/materials-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInventoryState } from "@/lib/data/inventory-loader";

export default async function MaterialsPage() {
  const state = await getInventoryState();
  const rows: MaterialRow[] = state.materialVariants.map((variant) => {
    const material = state.materials.find((item) => item.id === variant.materialId);
    return {
      id: variant.id,
      materialId: variant.materialId,
      materialName: material?.name ?? "Unknown material",
      variantName: variant.name,
      category: material?.category ?? "accessory",
      stockQuantity: variant.stockQuantity,
      minStock: material?.minStock ?? 0,
      targetStock: material?.targetStock ?? 0,
      usageUnit: variant.usageUnit,
      costPerUsageUnit: variant.costPerUsageUnit,
      estimationStatus: variant.estimationStatus,
    };
  });

  return (
    <>
      <PageHeader
        title="Materials"
        description="Raw material families and variants, including pearl sizes stored as variants instead of unrelated materials."
        eyebrow="Raw inventory"
        action={
          <Button variant="outline">
            <SlidersHorizontal data-icon="inline-start" aria-hidden />
            Quick adjustment
          </Button>
        }
      />
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <MaterialCreateForm state={state} />
        <Card>
          <CardHeader>
            <CardTitle>Raw Material Stock</CardTitle>
            <CardDescription>
              Search, sort, and review stock thresholds before purchasing or production.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MaterialsTable data={rows} />
          </CardContent>
        </Card>
      </section>
      <StockAdjustmentForm state={state} />
    </>
  );
}
