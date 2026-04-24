import { notFound } from "next/navigation";

import {
  CompleteProductionBatchButton,
  PurchaseListFromBatchButton,
} from "@/components/forms/mto-shortcuts";
import { PageHeader } from "@/components/layout/page-helpers";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductImage } from "@/components/ui/product-image";
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
  const sourceOrder = batch.sourceOrderId
    ? state.orders.find((order) => order.id === batch.sourceOrderId)
    : undefined;
  const purchaseLists = state.purchaseLists.filter((list) => list.productionBatchId === batch.id);
  const batchMovements = state.inventoryMovements.filter(
    (movement) => movement.referenceType === "production_batch" && movement.referenceId === batch.id,
  );

  return (
    <>
      <PageHeader
        title={`${product?.name ?? "Production batch"}`}
        description={`${product?.name ?? "Product"} - ${formatDate(batch.date)} - ${formatQuantity(batch.quantityMade, "pcs")}`}
        eyebrow="Production detail"
        meta={
          <>
            {product ? <ProductImage product={product} size={72} className="rounded-lg" /> : null}
            <Badge variant={batch.status === "completed" ? "secondary" : "outline"}>
              {batch.status.replaceAll("_", " ")}
            </Badge>
          </>
        }
        action={
          <>
            <PurchaseListFromBatchButton state={state} batchId={batch.id} />
            <CompleteProductionBatchButton
              batchId={batch.id}
              disabled={batch.status === "completed" || batch.status === "cancelled"}
            />
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Source Order</CardTitle>
          <CardDescription>Trace the planned work back to customer demand.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {sourceOrder ? (
            <>
              <Badge variant="outline">{sourceOrder.orderNumber}</Badge>
              <Badge variant="outline">{sourceOrder.customerName}</Badge>
              <Badge variant="outline">{sourceOrder.status.replaceAll("_", " ")}</Badge>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Manual batch with no source order link.</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consumed Materials</CardTitle>
          <CardDescription>Every completed line should have a matching inventory movement.</CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle>Purchase Lists</CardTitle>
          <CardDescription>Non-stock-changing material plans created for this batch.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseLists.length ? purchaseLists.map((list) => {
                const listLines = state.purchaseListLines.filter((line) => line.purchaseListId === list.id);
                return (
                  <TableRow key={list.id}>
                    <TableCell>{formatDate(list.createdAt)}</TableCell>
                    <TableCell><Badge variant="outline">{list.status}</Badge></TableCell>
                    <TableCell>{listLines.length}</TableCell>
                    <TableCell>{list.notes}</TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={4}>No purchase lists are linked to this batch.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Posted Movements</CardTitle>
          <CardDescription>Completed batches write immutable inventory transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Movement</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>In</TableHead>
                <TableHead>Out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batchMovements.length ? batchMovements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{movement.movementType.replaceAll("_", " ")}</TableCell>
                  <TableCell>{movement.itemType.replaceAll("_", " ")}</TableCell>
                  <TableCell>{movement.quantityIn ? formatQuantity(movement.quantityIn, movement.unit) : "-"}</TableCell>
                  <TableCell>{movement.quantityOut ? formatQuantity(movement.quantityOut, movement.unit) : "-"}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4}>No stock movements have posted yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
