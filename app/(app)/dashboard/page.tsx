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
import { getInventoryState } from "@/lib/data/inventory-loader";
import { formatPercent, formatQuantity, formatRupiah } from "@/lib/formatters";
import {
  calculateOrderProfit,
  calculateProductManufacturingCost,
  getDashboardMetrics,
  getLowStockMaterials,
} from "@/lib/services/inventory";

export default async function DashboardPage() {
  const state = await getInventoryState();
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
  const salesData = [
    { month: "Jan", revenue: 125000, profit: 46000 },
    { month: "Feb", revenue: 180000, profit: 72000 },
    { month: "Mar", revenue: 215000, profit: 92000 },
    { month: "Apr", revenue: metrics.monthlyRevenue, profit: metrics.monthlyNetProfit },
  ];
  const platformData = state.platformFeeRules.map((rule) => ({
    platform: rule.platform,
    value: state.orders
      .filter((order) => order.platform === rule.platform)
      .reduce((sum, order) => sum + order.netRevenue, 0),
  }));

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
          detail="Based on sample orders in the current month"
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
            <SalesProfitChart data={salesData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Platform</CardTitle>
            <CardDescription>Channel mix for platform fee decisions.</CardDescription>
          </CardHeader>
          <CardContent>
            <PlatformRevenueChart data={platformData} />
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
          <div className="flex items-start gap-3 rounded-lg border bg-amber-500/5 p-3">
            <AlertTriangle aria-hidden className="text-amber-600" />
            <div>
              <div className="font-medium">Limiting material</div>
              <div className="text-sm text-muted-foreground">12mm pearls are below the target stock.</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-primary/5 p-3">
            <ShoppingBag aria-hidden className="text-primary" />
            <div>
              <div className="font-medium">Pending fulfillment</div>
              <div className="text-sm text-muted-foreground">Confirmed orders are reserving finished goods.</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-emerald-500/5 p-3">
            <CircleDollarSign aria-hidden className="text-emerald-600" />
            <div>
              <div className="font-medium">Margin review</div>
              <div className="text-sm text-muted-foreground">Recommended prices include target margin and platform fees.</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
