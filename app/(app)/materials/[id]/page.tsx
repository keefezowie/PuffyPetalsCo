import { notFound } from "next/navigation";
import { ArrowRightLeft, Boxes, Ruler } from "lucide-react";

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
import { getInventoryStateResult } from "@/lib/data/inventory-loader";
import { WorkspaceDataError } from "@/components/ui/workspace-data-error";
import { formatQuantity, formatRupiahDecimal } from "@/lib/formatters";

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stateResult = await getInventoryStateResult();
  if (!stateResult.ok) {
    return <WorkspaceDataError message={stateResult.error} />;
  }

  const state = stateResult.state;
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
        eyebrow="Material detail"
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <KpiCard title="Purchase unit" value={material.purchaseUnit} icon={Boxes} tone="info" />
        <KpiCard title="Usage unit" value={material.usageUnit} icon={Ruler} tone="success" />
        <KpiCard
          title="Conversion"
          value={`${material.conversionFactor} ${material.usageUnit} / ${material.purchaseUnit}`}
          icon={ArrowRightLeft}
          tone="warning"
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
