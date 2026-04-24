import { notFound } from "next/navigation";
import { BadgePercent, CircleDollarSign, PackageCheck, Wallet } from "lucide-react";

import { OrderFulfillmentButton } from "@/components/forms/order-fulfillment-button";
import { KpiCard, PageHeader } from "@/components/layout/page-helpers";
import { Badge } from "@/components/ui/badge";
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
import { formatPercent, formatQuantity, formatRupiah } from "@/lib/formatters";
import { calculateOrderProfit } from "@/lib/services/inventory";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const state = await getInventoryState();
  const order = state.orders.find((item) => item.id === id);

  if (!order) {
    notFound();
  }

  const items = state.orderItems.filter((item) => item.orderId === order.id);
  const profit = calculateOrderProfit(state, order.id);

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        description={`${order.customerName} · ${order.platform} · ${order.status.replaceAll("_", " ")}`}
        eyebrow="Order detail"
        action={
          <OrderFulfillmentButton orderId={order.id} disabled={order.stockDeducted} />
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
                    <TableCell className="font-medium">{product?.name}</TableCell>
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
    </>
  );
}
