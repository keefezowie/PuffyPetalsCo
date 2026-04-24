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
import { formatQuantity, formatRupiahDecimal } from "@/lib/formatters";

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const state = await getInventoryState();
  const material = state.materials.find((item) => item.id === id);

  if (!material) {
    notFound();
  }

  const variants = state.materialVariants.filter((variant) => variant.materialId === material.id);
  const history = state.materialPriceHistory.filter((item) =>
    variants.some((variant) => variant.id === item.materialVariantId),
  );

  return (
    <>
      <PageHeader
        title={material.name}
        description={material.notes ?? "Material detail, variant cost, stock, and supplier price history."}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <Metric title="Purchase unit" value={material.purchaseUnit} />
        <Metric title="Usage unit" value={material.usageUnit} />
        <Metric
          title="Conversion"
          value={`${material.conversionFactor} ${material.usageUnit} / ${material.purchaseUnit}`}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Variants</CardTitle>
          <CardDescription>Stock and cost per usage unit.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Estimate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-medium">{variant.name}</TableCell>
                  <TableCell>{formatQuantity(variant.stockQuantity, variant.usageUnit)}</TableCell>
                  <TableCell>{formatRupiahDecimal(variant.costPerUsageUnit)}</TableCell>
                  <TableCell>
                    {variant.estimatedPcsPerPack
                      ? `${variant.estimatedPcsPerPack.toFixed(2)} pcs (${variant.estimatedPcsPerPackRounded} rounded)`
                      : "Not applicable"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={variant.estimationStatus === "manually_verified" ? "default" : "outline"}>
                      {variant.estimationStatus.replaceAll("_", " ")}
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
          <CardTitle>Supplier Price History</CardTitle>
          <CardDescription>Latest purchase cost is used for MVP costing.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Pack price</TableHead>
                <TableHead>Cost per unit</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => {
                const variant = variants.find((entry) => entry.id === item.materialVariantId);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.observedAt}</TableCell>
                    <TableCell>{variant?.name}</TableCell>
                    <TableCell>{formatRupiahDecimal(item.packPrice)}</TableCell>
                    <TableCell>{formatRupiahDecimal(item.costPerUsageUnit)}</TableCell>
                    <TableCell>{item.notes}</TableCell>
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

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
