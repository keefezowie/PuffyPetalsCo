import Link from "next/link";

import { PageHeader } from "@/components/layout/page-helpers";
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
import { formatDate, formatPercent, formatRupiah } from "@/lib/formatters";
import { calculateOrderProfit } from "@/lib/services/inventory";

export default async function OrdersPage() {
  const state = await getInventoryState();

  return (
    <>
      <PageHeader
        title="Orders"
        description="Track platform orders, status, revenue, COGS, and profit without double-deducting stock."
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
                <TableHead>Date</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Net Revenue</TableHead>
                <TableHead>Net Profit</TableHead>
                <TableHead>Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.orders.map((order) => {
                const profit = calculateOrderProfit(state, order.id);
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                        {order.orderNumber}
                      </Link>
                      <div className="text-xs text-muted-foreground">{order.customerName}</div>
                    </TableCell>
                    <TableCell>{formatDate(order.orderDate)}</TableCell>
                    <TableCell>{order.platform}</TableCell>
                    <TableCell>
                      <Badge variant={order.stockDeducted ? "secondary" : "outline"}>
                        {order.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatRupiah(profit.netRevenue)}</TableCell>
                    <TableCell>{formatRupiah(profit.netProfit)}</TableCell>
                    <TableCell>{formatPercent(profit.margin)}</TableCell>
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
