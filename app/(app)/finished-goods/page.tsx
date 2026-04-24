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
import { formatQuantity, formatRupiah, formatRupiahDecimal } from "@/lib/formatters";

export default async function FinishedGoodsPage() {
  const state = await getInventoryState();

  return (
    <>
      <PageHeader
        title="Finished Goods"
        description="Product stock, reservations, available stock, and inventory value."
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
              {state.products.map((product) => {
                const available = product.currentStock - product.reservedStock;
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{formatQuantity(product.currentStock, "pcs")}</TableCell>
                    <TableCell>{formatQuantity(product.reservedStock, "pcs")}</TableCell>
                    <TableCell>
                      <Badge variant={available <= 0 ? "destructive" : "secondary"}>
                        {formatQuantity(available, "pcs")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatRupiahDecimal(product.averageUnitManufacturingCost)}</TableCell>
                    <TableCell>{formatRupiahDecimal(product.lastProductionCost)}</TableCell>
                    <TableCell>{formatRupiah(product.currentStock * product.averageUnitManufacturingCost)}</TableCell>
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
