import { AlertTriangle, Boxes, CircleDollarSign, PackageCheck, ShoppingBag, Wallet } from "lucide-react";
import Link from "next/link";

import { PlatformRevenueChart, SalesProfitChart } from "@/components/charts/dashboard-charts";
import { KpiCard, PageHeader } from "@/components/layout/page-helpers";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/state-views";
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
import {
  calculateOrderProfit,
  calculateProductManufacturingCost,
  getDashboardMetrics,
  getLowStockMaterials,
} from "@/lib/services/inventory";
import type { InventoryState } from "@/lib/types";

export default async function DashboardPage() {
  const stateResult = await getInventoryStateResult();
  if (!stateResult.ok) {
    return <WorkspaceDataError message={stateResult.error} />;
  }

  const state = stateResult.state;
  const metrics = getDashboardMetrics(state);
  const lowStock = getLowStockMaterials(state).slice(0, 5);
  const productMargins = state.products
    .map((product) => {
      const cost = calculateProductManufacturingCost(state, product.id).totalCost;
      return {
        product,
        cost,
        margin: product.sellingPrice > 0 ? (product.sellingPrice - cost) / product.sellingPrice : 0,
      };
    })
    .sort((a, b) => a.margin - b.margin);
  const salesData = getSalesProfitByMonth(state);
  const platformData = getRevenueByPlatform(state);
  const pendingFulfillment = state.orders.filter(
    (order) => !["fulfilled", "returned"].includes(order.fulfillmentStatus),
  ).length;
  const lowestMarginProduct = productMargins[0];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Cost, stock, production, and sales signals for the current handmade flower workflow."
        eyebrow="Operations command center"
        meta={
          <>
            <Badge variant="success">Live data</Badge>
            <Badge variant={metrics.lowStockMaterialCount > 0 ? "warning" : "secondary"}>
              {metrics.lowStockMaterialCount} stock alerts
            </Badge>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Raw material value"
          value={formatRupiah(metrics.rawMaterialInventoryValue)}
          detail={`${metrics.lowStockMaterialCount} material variants need attention`}
          icon={Boxes}
          tone={metrics.lowStockMaterialCount > 0 ? "warning" : "success"}
        />
        <KpiCard
          title="Finished goods value"
          value={formatRupiah(metrics.finishedGoodsInventoryValue)}
          detail="Current stock valued at latest production cost"
          icon={PackageCheck}
          tone="info"
        />
        <KpiCard
          title="Monthly revenue"
          value={formatRupiah(metrics.monthlyRevenue)}
          detail="Based on database orders in the current month"
          icon={CircleDollarSign}
          tone="success"
        />
        <KpiCard
          title="Monthly net profit"
          value={formatRupiah(metrics.monthlyNetProfit)}
          detail={`${metrics.pendingOrders} pending orders`}
          icon={Wallet}
          tone={metrics.pendingOrders > 0 ? "warning" : "success"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sales and Profit by Month</CardTitle>
            <CardDescription>Revenue and net profit trend for planning.</CardDescription>
          </CardHeader>
          <CardContent>
            {salesData.length ? (
              <SalesProfitChart data={salesData} />
            ) : (
              <EmptyState
                title="No sales trend yet"
                description="Order entries will populate this chart from the database."
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Platform</CardTitle>
            <CardDescription>Channel mix for platform fee decisions.</CardDescription>
          </CardHeader>
          <CardContent>
            {platformData.length ? (
              <PlatformRevenueChart data={platformData} />
            ) : (
              <EmptyState
                title="No platform revenue yet"
                description="Saved orders will populate platform revenue."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Low-Stock Materials</CardTitle>
            <CardDescription>Variants at or below minimum stock.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Buy</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
                {lowStock.length ? lowStock.map(({ material, variant, recommendedPurchaseQuantity }) => (
                  <TableRow key={variant.id}>
                    <TableCell>{variant.name}</TableCell>
                    <TableCell>{formatQuantity(variant.stockQuantity, material.usageUnit)}</TableCell>
                    <TableCell>{formatQuantity(recommendedPurchaseQuantity, material.usageUnit)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32">
                      <EmptyState
                        title="No low-stock materials"
                        description="All tracked material variants are currently above their minimum thresholds."
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products Needing Price Review</CardTitle>
            <CardDescription>Lowest margins based on live BOM cost.</CardDescription>
          </CardHeader>
          <CardContent>
            {productMargins.length ? (
              <div className="flex flex-col gap-3">
                {productMargins.slice(0, 4).map(({ product, cost, margin }) => (
                <div key={product.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                  <div>
                    <Link href={`/products/${product.id}`} className="font-medium hover:underline">
                      {product.name}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      Cost {formatRupiah(cost)}
                    </div>
                  </div>
                  <StatusBadge tone={margin < product.targetMargin ? "danger" : "success"}>
                    {formatPercent(margin)}
                  </StatusBadge>
                </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No products yet" description="Create products before reviewing margins." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Revenue, COGS, and net profit per order.</CardDescription>
          </CardHeader>
          <CardContent>
            {state.orders.length ? (
              <div className="flex flex-col gap-3">
                {state.orders.map((order) => {
                const profit = calculateOrderProfit(state, order.id);
                return (
                  <div key={order.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                    <div>
                      <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                        {order.orderNumber}
                      </Link>
                      <div className="text-sm text-muted-foreground">{order.platform}</div>
                    </div>
                    <div className="text-right">
                      <div>{formatRupiah(order.netRevenue)}</div>
                      <div className="text-sm text-muted-foreground">{formatRupiah(profit.netProfit)}</div>
                    </div>
                  </div>
                );
                })}
              </div>
            ) : (
              <EmptyState title="No orders recorded" description="New orders will appear here after they are imported or entered." />
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Operational Alerts</CardTitle>
          <CardDescription>Problems to resolve before production or fulfillment.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="flex items-start gap-3 rounded-lg border bg-[#a58b71]/15 p-3">
            <AlertTriangle aria-hidden className="text-[#5d4b3a] dark:text-[#e5dfd6]" />
            <div>
              <div className="font-medium">
                {lowStock[0] ? "Limiting material" : "Material stock healthy"}
              </div>
              <div className="text-sm text-muted-foreground">
                {lowStock[0]
                  ? `${lowStock[0].variant.name} is at ${formatQuantity(lowStock[0].variant.stockQuantity, lowStock[0].variant.usageUnit)}.`
                  : "No tracked material variants are below their minimum stock."}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-primary/5 p-3">
            <ShoppingBag aria-hidden className="text-primary" />
            <div>
              <div className="font-medium">Pending fulfillment</div>
              <div className="text-sm text-muted-foreground">
                {pendingFulfillment
                  ? `${pendingFulfillment} order${pendingFulfillment === 1 ? "" : "s"} still need fulfillment.`
                  : "All saved orders are fulfilled, returned, or closed."}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-accent p-3">
            <CircleDollarSign aria-hidden className="text-accent-foreground" />
            <div>
              <div className="font-medium">Margin review</div>
              <div className="text-sm text-muted-foreground">
                {lowestMarginProduct
                  ? `${lowestMarginProduct.product.name} has the lowest current margin at ${formatPercent(lowestMarginProduct.margin)}.`
                  : "Create products and BOMs to calculate margin alerts."}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function getSalesProfitByMonth(state: InventoryState) {
  const rows = new Map<string, { month: string; revenue: number; profit: number }>();

  for (const order of state.orders) {
    const date = new Date(order.orderDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing =
      rows.get(key) ??
      {
        month: date.toLocaleString("en", { month: "short", year: "2-digit" }),
        revenue: 0,
        profit: 0,
      };
    const profit = calculateOrderProfit(state, order.id);
    existing.revenue += profit.netRevenue;
    existing.profit += profit.netProfit;
    rows.set(key, existing);
  }

  return [...rows.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row);
}

function getRevenueByPlatform(state: InventoryState) {
  const rows = new Map<string, number>();

  for (const order of state.orders) {
    const profit = calculateOrderProfit(state, order.id);
    rows.set(order.platform, (rows.get(order.platform) ?? 0) + profit.netRevenue);
  }

  return [...rows.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([platform, value]) => ({ platform, value }));
}
