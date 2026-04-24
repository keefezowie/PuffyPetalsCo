import { PageHeader } from "@/components/layout/page-helpers";
import { ProductionPlanner } from "@/components/forms/production-planner";
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
import { formatDate, formatQuantity, formatRupiah } from "@/lib/formatters";

export default async function ProductionPage() {
  const state = await getInventoryState();

  return (
    <>
      <PageHeader
        title="Production"
        description="Check shortages before saving a batch. Negative stock is blocked by default."
      />
      <ProductionPlanner initialState={state} />

      <Card>
        <CardHeader>
          <CardTitle>Recent Production Batches</CardTitle>
          <CardDescription>Batch cost snapshots are stored at production time.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.productionBatches.map((batch) => {
                const product = state.products.find((item) => item.id === batch.productId);
                return (
                  <TableRow key={batch.id}>
                    <TableCell>{formatDate(batch.date)}</TableCell>
                    <TableCell>{product?.name}</TableCell>
                    <TableCell>{formatQuantity(batch.quantityMade, "pcs")}</TableCell>
                    <TableCell>{formatRupiah(product?.lastProductionCost ?? 0)}</TableCell>
                    <TableCell>{formatRupiah((product?.lastProductionCost ?? 0) * batch.quantityMade)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
