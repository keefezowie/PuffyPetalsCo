import Link from "next/link";

import { OrderCreateForm } from "@/components/forms/master-data-forms";
import { PageHeader } from "@/components/layout/page-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyCell, StatusBadge } from "@/components/ui/data-display";
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
import { formatDate, formatPercent, formatRupiah } from "@/lib/formatters";
import { calculateOrderProfit } from "@/lib/services/inventory";

export default async function OrdersPage() {
  const state = await getInventoryState();

  return (
    <>
      <PageHeader
        title="Orders"
        description="Track platform orders, status, revenue, COGS, and profit without double-deducting stock."
        eyebrow="Sales operations"
        action={<OrderCreateForm state={state} />}
      />
      <Card>
        <CardHeader>
          <CardTitle>Sales Orders</CardTitle>
          <CardDescription>Status transitions control reservation and fulfillment behavior.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Net Revenue</TableHead>
                  <TableHead>Net Profit</TableHead>
                  <TableHead>Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.orders.length ? state.orders.map((order) => {
                  const profit = calculateOrderProfit(state, order.id);
                  const items = state.orderItems.filter((item) => item.orderId === order.id);
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                          {order.orderNumber}
                        </Link>
                        <div className="text-xs text-muted-foreground">{order.customerName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {items.map((item) => {
                            const product = state.products.find((entry) => entry.id === item.productId);
                            return (
                              <span key={item.id} className="flex items-center gap-2 text-sm">
                                {product ? <ProductImage product={product} size={28} /> : null}
                                {product?.name ?? "Unknown product"} x {item.quantity}
                              </span>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                      <TableCell>{order.platform}</TableCell>
                      <TableCell>
                        <StatusBadge tone={order.stockDeducted ? "success" : "warning"}>
                          {order.status.replaceAll("_", " ")}
                        </StatusBadge>
                      </TableCell>
                      <TableCell><MoneyCell value={formatRupiah(profit.netRevenue)} /></TableCell>
                      <TableCell><MoneyCell value={formatRupiah(profit.netProfit)} /></TableCell>
                      <TableCell>{formatPercent(profit.margin)}</TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40">
                      <EmptyState
                        title="No orders recorded"
                        description="Create orders with the form beside this table."
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
