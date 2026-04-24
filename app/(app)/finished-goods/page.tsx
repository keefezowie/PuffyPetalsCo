import { PageHeader } from "@/components/layout/page-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyCell, QuantityCell, StatusBadge } from "@/components/ui/data-display";
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
import { formatQuantity, formatRupiah, formatRupiahDecimal } from "@/lib/formatters";

export default async function FinishedGoodsPage() {
  const state = await getInventoryState();

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
                <TableHead>Product</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Avg Cost</TableHead>
                <TableHead>Last Cost</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.products.length ? state.products.map((product) => {
                const available = product.currentStock - product.reservedStock;
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell><QuantityCell value={formatQuantity(product.currentStock, "pcs")} /></TableCell>
                    <TableCell><QuantityCell value={formatQuantity(product.reservedStock, "pcs")} muted /></TableCell>
                    <TableCell>
                      <StatusBadge tone={available <= 0 ? "danger" : "success"}>
                        {formatQuantity(available, "pcs")}
                      </StatusBadge>
                    </TableCell>
                    <TableCell><MoneyCell value={formatRupiahDecimal(product.averageUnitManufacturingCost)} muted /></TableCell>
                    <TableCell><MoneyCell value={formatRupiahDecimal(product.lastProductionCost)} muted /></TableCell>
                    <TableCell><MoneyCell value={formatRupiah(product.currentStock * product.averageUnitManufacturingCost)} /></TableCell>
                  </TableRow>
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
