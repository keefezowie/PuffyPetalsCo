import { notFound } from "next/navigation";
import { BadgePercent, CircleDollarSign, PackageCheck, Wallet } from "lucide-react";

import { OrderStatusUpdateForm } from "@/components/forms/master-data-forms";
import { OrderProductionPlanButton } from "@/components/forms/mto-shortcuts";
import { OrderFulfillmentButton } from "@/components/forms/order-fulfillment-button";
import { KpiCard, PageHeader } from "@/components/layout/page-helpers";
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
import { getInventoryStateResult } from "@/lib/data/inventory-loader";
import { WorkspaceDataError } from "@/components/ui/workspace-data-error";
import { formatPercent, formatQuantity, formatRupiah } from "@/lib/formatters";
import { calculateOrderProfit } from "@/lib/services/inventory";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stateResult = await getInventoryStateResult();
  if (!stateResult.ok) {
    return <WorkspaceDataError message={stateResult.error} />;
  }

  const state = stateResult.state;
  const order = state.orders.find((item) => item.id === id);

  if (!order) {
    notFound();
  }

  const items = state.orderItems.filter((item) => item.orderId === order.id);
  const profit = calculateOrderProfit(state, order.id);
  const linkedBatches = state.productionBatches.filter((batch) =>
    state.productionBatchOrderLinks.some(
      (link) => link.orderId === order.id && link.productionBatchId === batch.id,
    ),
  );
  const orderMovements = state.inventoryMovements.filter(
    (movement) => movement.referenceType === "order" && movement.referenceId === order.id,
  );

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        description={`${order.customerName} · ${order.platform} · ${order.status.replaceAll("_", " ")}`}
        eyebrow="Order detail"
        action={
          <>
            <OrderProductionPlanButton
              state={state}
              orderId={order.id}
              disabled={order.stockDeducted}
            />
            <OrderFulfillmentButton orderId={order.id} disabled={order.stockDeducted} />
            <OrderStatusUpdateForm order={order} />
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Net revenue" value={formatRupiah(profit.netRevenue)} icon={CircleDollarSign} tone="success" />
        <KpiCard title="COGS" value={formatRupiah(profit.cogs)} icon={PackageCheck} tone="info" />
        <KpiCard title="Net profit" value={formatRupiah(profit.netProfit)} icon={Wallet} tone={profit.netProfit < 0 ? "danger" : "success"} />
        <KpiCard title="Margin" value={formatPercent(profit.margin)} icon={BadgePercent} tone={profit.margin < 0 ? "danger" : "success"} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
          <CardDescription>Fulfillment deducts finished goods once using `stock_deducted`.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Gross Profit</TableHead>
                <TableHead>Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const product = state.products.find((entry) => entry.id === item.productId);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {product ? (
                        <div className="flex items-center gap-3">
                          <ProductImage product={product} size={40} />
                          <span>{product.name}</span>
                        </div>
                      ) : (
                        "Unknown product"
                      )}
                    </TableCell>
                    <TableCell>{formatQuantity(item.quantity, "pcs")}</TableCell>
                    <TableCell>{formatRupiah(item.unitSellingPrice)}</TableCell>
                    <TableCell>{formatRupiah(item.unitCost)}</TableCell>
                    <TableCell>{formatRupiah(item.lineRevenue)}</TableCell>
                    <TableCell>{formatRupiah(item.lineGrossProfit)}</TableCell>
                    <TableCell>{formatPercent(item.lineMargin)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant={order.stockDeducted ? "secondary" : "outline"}>
              {order.stockDeducted ? "Stock deducted" : "Stock not deducted"}
            </Badge>
            <Badge variant="outline">Payment: {order.paymentStatus}</Badge>
            <Badge variant="outline">Fulfillment: {order.fulfillmentStatus}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Traceability</CardTitle>
          <CardDescription>Source order, planned production, completed batches, and posted movements.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-medium">Linked Production Batches</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedBatches.length ? linkedBatches.map((batch) => {
                  const product = state.products.find((entry) => entry.id === batch.productId);
                  return (
                    <TableRow key={batch.id}>
                      <TableCell>{product?.name ?? "Unknown product"}</TableCell>
                      <TableCell>
                        <Badge variant={batch.status === "completed" ? "secondary" : "outline"}>
                          {batch.status.replaceAll("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatQuantity(batch.quantityMade, "pcs")}</TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={3}>No production batches are linked yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium">Inventory Movements</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty Out</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderMovements.length ? orderMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{movement.movementType.replaceAll("_", " ")}</TableCell>
                    <TableCell>{formatQuantity(movement.quantityOut, movement.unit)}</TableCell>
                    <TableCell>{formatRupiah(movement.totalValue)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3}>No fulfillment movements have posted yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
