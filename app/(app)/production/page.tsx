import Link from "next/link";

import { PageHeader } from "@/components/layout/page-helpers";
import { ProductionPlanner } from "@/components/forms/production-planner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyCell, QuantityCell } from "@/components/ui/data-display";
import { ProductImage } from "@/components/ui/product-image";
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
                <TableHead>Status</TableHead>
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
                    <TableCell>
                      {product ? (
                        <div className="flex items-center gap-3">
                          <ProductImage product={product} size={44} />
                          <Link href={`/production/${batch.id}`} className="font-medium hover:underline">
                            {product.name}
                          </Link>
                        </div>
                      ) : (
                        "Unknown product"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={batch.status === "completed" ? "secondary" : "outline"}>
                        {batch.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell><QuantityCell value={formatQuantity(batch.quantityMade, "pcs")} /></TableCell>
                    <TableCell><MoneyCell value={formatRupiah(batch.unitManufacturingCost)} muted /></TableCell>
                    <TableCell><MoneyCell value={formatRupiah(batch.totalManufacturingCost)} /></TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-40">
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
