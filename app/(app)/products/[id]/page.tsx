import { notFound } from "next/navigation";

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
  getRecommendedPrice,
} from "@/lib/services/inventory";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const state = await getInventoryState();
  const product = state.products.find((item) => item.id === id);

  if (!product) {
    notFound();
  }

  const cost = calculateProductManufacturingCost(state, product.id);
  const margin =
    product.sellingPrice > 0
      ? (product.sellingPrice - cost.totalCost) / product.sellingPrice
      : 0;
  const recommendedPrice = getRecommendedPrice(
    cost.totalCost,
    product.targetMargin,
    state.settings.defaultPlatformFeeRate,
  );

  return (
    <>
      <PageHeader
        title={product.name}
        description={`${product.sku} · Product detail and BOM editor preview.`}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="Selling price" value={formatRupiah(product.sellingPrice)} />
        <Metric title="Manufacturing cost" value={formatRupiah(cost.totalCost)} />
        <Metric title="Gross margin" value={formatPercent(margin)} />
        <Metric title="Recommended price" value={formatRupiah(recommendedPrice)} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>BOM Editor</CardTitle>
          <CardDescription>
            Live line costs include waste percentage and latest material cost.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Waste</TableHead>
                <TableHead>Effective Qty</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Line Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cost.bomLines.map((line) => (
                <TableRow key={line.bomLineId}>
                  <TableCell className="font-medium">{line.materialName}</TableCell>
                  <TableCell>{formatQuantity(line.quantityRequired)}</TableCell>
                  <TableCell>{formatPercent(line.wastePercentage)}</TableCell>
                  <TableCell>{formatQuantity(line.effectiveQuantity)}</TableCell>
                  <TableCell>{formatRupiahDecimal(line.unitCost)}</TableCell>
                  <TableCell>{formatRupiah(line.lineCost)}</TableCell>
                  <TableCell>
                    <Badge variant={line.missingCost ? "destructive" : "secondary"}>
                      {line.missingCost ? "Missing cost" : "Costed"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          <CardDescription>Manufacturing cost formula used for price decisions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Metric title="Materials" value={formatRupiah(cost.materialCost)} />
          <Metric title="Labor" value={formatRupiah(cost.laborCost)} />
          <Metric title="Packaging" value={formatRupiah(cost.packagingCost)} />
          <Metric title="Overhead" value={formatRupiah(cost.overheadCost)} />
        </CardContent>
      </Card>
    </>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
