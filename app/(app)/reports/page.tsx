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
  const state = await getInventoryState();
  const lowStock = getLowStockMaterials(state);

  return (
    <>
      <PageHeader
        title="Reports"
        description="MVP report views for costing, stock, production, sales, profitability, and audit trail."
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {reportNames.map((name) => (
          <div key={name} className="rounded-lg border bg-card p-3">
            <div className="font-medium">{name}</div>
            <div className="mt-1 text-xs text-muted-foreground">Export-ready table planned for MVP iteration.</div>
          </div>
        ))}
      </section>

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
              {state.products.map((product) => {
                const cost = calculateProductManufacturingCost(state, product.id);
                const margin =
                  product.sellingPrice > 0
                    ? (product.sellingPrice - cost.totalCost) / product.sellingPrice
                    : 0;
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{formatRupiah(cost.materialCost)}</TableCell>
                    <TableCell>{formatRupiah(cost.laborCost)}</TableCell>
                    <TableCell>{formatRupiah(cost.packagingCost)}</TableCell>
                    <TableCell>{formatRupiah(cost.overheadCost)}</TableCell>
                    <TableCell>{formatRupiah(cost.totalCost)}</TableCell>
                    <TableCell>
                      <Badge variant={margin < product.targetMargin ? "destructive" : "secondary"}>
                        {formatPercent(margin)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
              {lowStock.map(({ material, variant, recommendedPurchaseQuantity }) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-medium">{variant.name}</TableCell>
                  <TableCell>{formatQuantity(variant.stockQuantity, variant.usageUnit)}</TableCell>
                  <TableCell>{formatQuantity(material.targetStock, material.usageUnit)}</TableCell>
                  <TableCell>{formatQuantity(recommendedPurchaseQuantity, material.usageUnit)}</TableCell>
                  <TableCell>{formatRupiahDecimal(variant.costPerUsageUnit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
