import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getInventoryState } from "@/lib/data/inventory-loader";
import { formatDate, formatQuantity, formatRupiahDecimal } from "@/lib/formatters";

export default async function ProductionBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const state = await getInventoryState();
  const batch = state.productionBatches.find((item) => item.id === id);

  if (!batch) {
    notFound();
  }

  const product = state.products.find((item) => item.id === batch.productId);
  const lines = state.productionBatchLines.filter((line) => line.productionBatchId === batch.id);

  return (
    <>
      <PageHeader
        title={`${product?.name ?? "Production batch"}`}
        description={`${product?.name ?? "Product"} · ${formatDate(batch.date)} · ${formatQuantity(batch.quantityMade, "pcs")}`}
        eyebrow="Production detail"
      />
      <Card>
        <CardHeader>
          <CardTitle>Consumed Materials</CardTitle>
          <CardDescription>Every line should have a matching inventory movement.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Qty Consumed</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length ? (
                lines.map((line) => {
                  const variant = state.materialVariants.find((item) => item.id === line.materialVariantId);
                  return (
                    <TableRow key={line.id}>
                      <TableCell>{variant?.name}</TableCell>
                      <TableCell>{formatQuantity(line.quantityConsumed, line.usageUnit)}</TableCell>
                      <TableCell>{formatRupiahDecimal(line.unitCost)}</TableCell>
                      <TableCell>{formatRupiahDecimal(line.totalCost)}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4}>No material detail lines are recorded for this batch.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
