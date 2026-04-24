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
import { formatRupiahDecimal } from "@/lib/formatters";

export default async function SuppliersPage() {
  const state = await getInventoryState();

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Supplier records and price history for purchase decisions."
      />
      <Card>
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
          <CardDescription>Preferred suppliers are used in restock reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.channel}</TableCell>
                  <TableCell>
                    <Badge variant={supplier.isPreferred ? "secondary" : "outline"}>
                      {supplier.isPreferred ? "Preferred" : "Backup"}
                    </Badge>
                  </TableCell>
                  <TableCell>{supplier.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
          <CardDescription>Latest purchase cost is the MVP costing method.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Pack price</TableHead>
                <TableHead>Unit cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.materialPriceHistory.map((price) => {
                const supplier = state.suppliers.find((item) => item.id === price.supplierId);
                const variant = state.materialVariants.find((item) => item.id === price.materialVariantId);
                return (
                  <TableRow key={price.id}>
                    <TableCell>{price.observedAt}</TableCell>
                    <TableCell>{supplier?.name}</TableCell>
                    <TableCell>{variant?.name}</TableCell>
                    <TableCell>{formatRupiahDecimal(price.packPrice)}</TableCell>
                    <TableCell>{formatRupiahDecimal(price.costPerUsageUnit)}</TableCell>
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
