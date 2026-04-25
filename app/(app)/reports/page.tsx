import { PageHeader } from "@/components/layout/page-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyCell, QuantityCell, StatusBadge } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/state-views";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { formatPercent, formatQuantity, formatRupiah, formatRupiahDecimal } from "@/lib/formatters";
import {
  calculateProductManufacturingCost,
  getLowStockMaterials,
} from "@/lib/services/inventory";

const reportNames = [
  "Product Cost Report",
  "BOM Report",
  "Raw Material Inventory Report",
  "Finished Goods Inventory Report",
  "Production Report",
  "Sales Report",
  "Profitability Report",
  "Supplier Price History Report",
  "Restock Report",
  "Inventory Movement Report",
];

export default async function ReportsPage() {
  const stateResult = await getInventoryStateResult();
  if (!stateResult.ok) {
    return <WorkspaceDataError message={stateResult.error} />;
  }

  const state = stateResult.state;
  const lowStock = getLowStockMaterials(state);

  return (
    <>
      <PageHeader
        title="Reports"
        description="MVP report views for costing, stock, production, sales, profitability, and audit trail."
        eyebrow="Analysis"
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {reportNames.map((name, index) => (
          <div key={name} className="rounded-lg border bg-card p-3 shadow-sm shadow-foreground/5">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{name}</div>
              <StatusBadge tone={index < 2 ? "success" : "info"}>
                {index < 2 ? "Ready" : "Planned"}
              </StatusBadge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Export-ready table planned for MVP iteration.</div>
          </div>
        ))}
      </section>

      <Tabs defaultValue="costs">
        <TabsList>
          <TabsTrigger value="costs">Product costs</TabsTrigger>
          <TabsTrigger value="restock">Restock</TabsTrigger>
        </TabsList>
        <TabsContent value="costs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Cost Report</CardTitle>
              <CardDescription>Cost breakdown by finished flower.</CardDescription>
            </CardHeader>
            <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Materials</TableHead>
                <TableHead>Labor</TableHead>
                <TableHead>Packaging</TableHead>
                <TableHead>Overhead</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.products.length ? state.products.map((product) => {
                const cost = calculateProductManufacturingCost(state, product.id);
                const margin =
                  product.sellingPrice > 0
                    ? (product.sellingPrice - cost.totalCost) / product.sellingPrice
                    : 0;
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell><MoneyCell value={formatRupiah(cost.materialCost)} muted /></TableCell>
                    <TableCell><MoneyCell value={formatRupiah(cost.laborCost)} muted /></TableCell>
                    <TableCell><MoneyCell value={formatRupiah(cost.packagingCost)} muted /></TableCell>
                    <TableCell><MoneyCell value={formatRupiah(cost.overheadCost)} muted /></TableCell>
                    <TableCell><MoneyCell value={formatRupiah(cost.totalCost)} /></TableCell>
                    <TableCell>
                      <StatusBadge tone={margin < product.targetMargin ? "danger" : "success"}>
                        {formatPercent(margin)}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-40">
                    <EmptyState title="No product costs" description="Create products and BOMs to populate this report." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="restock" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Restock Report</CardTitle>
              <CardDescription>Recommended quantity = target stock - current stock.</CardDescription>
            </CardHeader>
            <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Recommended Buy</TableHead>
                <TableHead>Last Unit Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStock.length ? lowStock.map(({ material, variant, recommendedPurchaseQuantity }) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-medium">{variant.name}</TableCell>
                  <TableCell><QuantityCell value={formatQuantity(variant.stockQuantity, variant.usageUnit)} /></TableCell>
                  <TableCell><QuantityCell value={formatQuantity(material.targetStock, material.usageUnit)} muted /></TableCell>
                  <TableCell><QuantityCell value={formatQuantity(recommendedPurchaseQuantity, material.usageUnit)} /></TableCell>
                  <TableCell><MoneyCell value={formatRupiahDecimal(variant.costPerUsageUnit)} /></TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-40">
                    <EmptyState title="No restock needed" description="All material variants are above their minimum thresholds." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
