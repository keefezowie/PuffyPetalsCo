import { PageHeader } from "@/components/layout/page-helpers";
import { ClickableTableRow } from "@/components/tables/clickable-table-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyCell, QuantityCell, StatusBadge } from "@/components/ui/data-display";
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
import { getInventoryStateResult } from "@/lib/data/inventory-loader";
import { WorkspaceDataError } from "@/components/ui/workspace-data-error";
import { formatQuantity, formatRupiah, formatRupiahDecimal } from "@/lib/formatters";

export default async function FinishedGoodsPage() {
  const stateResult = await getInventoryStateResult();
  if (!stateResult.ok) {
    return <WorkspaceDataError message={stateResult.error} />;
  }

  const state = stateResult.state;

  return (
    <>
      <PageHeader
        title="Finished Goods"
        description="Product stock, reservations, available stock, and inventory value."
        eyebrow="Inventory control"
      />
      <Card>
        <CardHeader>
          <CardTitle>Finished Flower Inventory</CardTitle>
          <CardDescription>Available stock = current stock - reserved stock.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Product</TableHead>
                <TableHead className="text-center">Current</TableHead>
                <TableHead className="text-center">Reserved</TableHead>
                <TableHead className="text-center">Available</TableHead>
                <TableHead className="text-center">Avg Cost</TableHead>
                <TableHead className="text-center">Last Cost</TableHead>
                <TableHead className="text-center">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.products.length ? state.products.map((product) => {
                const available = product.currentStock - product.reservedStock;
                return (
                  <ClickableTableRow key={product.id} href={`/products/${product.id}`}>
                    <TableCell>
                      <div className="flex items-center justify-center gap-3 text-left font-medium">
                        <ProductImage product={product} size={44} />
                        <span>{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><div className="flex justify-center"><QuantityCell value={formatQuantity(product.currentStock, "pcs")} /></div></TableCell>
                    <TableCell className="text-center"><div className="flex justify-center"><QuantityCell value={formatQuantity(product.reservedStock, "pcs")} muted /></div></TableCell>
                    <TableCell className="text-center">
                      <StatusBadge tone={available <= 0 ? "danger" : "success"}>
                        {formatQuantity(available, "pcs")}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-center"><div className="flex justify-center"><MoneyCell value={formatRupiahDecimal(product.averageUnitManufacturingCost)} muted /></div></TableCell>
                    <TableCell className="text-center"><div className="flex justify-center"><MoneyCell value={formatRupiahDecimal(product.lastProductionCost)} muted /></div></TableCell>
                    <TableCell className="text-center"><div className="flex justify-center"><MoneyCell value={formatRupiah(product.currentStock * product.averageUnitManufacturingCost)} /></div></TableCell>
                  </ClickableTableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-40">
                    <EmptyState
                      title="No finished goods"
                      description="Production batches will create finished goods stock."
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
