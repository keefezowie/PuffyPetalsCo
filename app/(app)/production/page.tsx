import { PageHeader } from "@/components/layout/page-helpers";
import { ProductionPlanner } from "@/components/forms/production-planner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyCell, QuantityCell } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/state-views";
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
        eyebrow="Batch workflow"
        action={<ProductionPlanner initialState={state} />}
      />

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
              {state.productionBatches.length ? state.productionBatches.map((batch) => {
                const product = state.products.find((item) => item.id === batch.productId);
                return (
                  <TableRow key={batch.id}>
                    <TableCell>{formatDate(batch.date)}</TableCell>
                    <TableCell>{product?.name}</TableCell>
                    <TableCell><QuantityCell value={formatQuantity(batch.quantityMade, "pcs")} /></TableCell>
                    <TableCell><MoneyCell value={formatRupiah(product?.lastProductionCost ?? 0)} muted /></TableCell>
                    <TableCell><MoneyCell value={formatRupiah((product?.lastProductionCost ?? 0) * batch.quantityMade)} /></TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-40">
                    <EmptyState
                      title="No production batches"
                      description="Create a batch above to consume materials and increase finished goods stock."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
