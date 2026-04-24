import { notFound } from "next/navigation";
import { BadgePercent, CircleDollarSign, Factory, Sparkles } from "lucide-react";

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
        eyebrow="Product detail"
      />

      <section className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Selling price" value={formatRupiah(product.sellingPrice)} icon={CircleDollarSign} tone="success" />
        <KpiCard title="Manufacturing cost" value={formatRupiah(cost.totalCost)} icon={Factory} tone="info" />
        <KpiCard title="Gross margin" value={formatPercent(margin)} icon={BadgePercent} tone={margin < product.targetMargin ? "danger" : "success"} />
        <KpiCard title="Recommended price" value={formatRupiah(recommendedPrice)} icon={Sparkles} tone="warning" />
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
          <KpiCard title="Materials" value={formatRupiah(cost.materialCost)} icon={Factory} tone="neutral" />
          <KpiCard title="Labor" value={formatRupiah(cost.laborCost)} icon={Factory} tone="neutral" />
          <KpiCard title="Packaging" value={formatRupiah(cost.packagingCost)} icon={Factory} tone="neutral" />
          <KpiCard title="Overhead" value={formatRupiah(cost.overheadCost)} icon={Factory} tone="neutral" />
        </CardContent>
      </Card>
    </>
  );
}
