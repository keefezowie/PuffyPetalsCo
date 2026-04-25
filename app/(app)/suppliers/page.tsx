import { SupplierCreateForm } from "@/components/forms/master-data-forms";
import { PageHeader } from "@/components/layout/page-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyCell, StatusBadge } from "@/components/ui/data-display";
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
import { formatRupiahDecimal } from "@/lib/formatters";

export default async function SuppliersPage() {
  const stateResult = await getInventoryStateResult();
  if (!stateResult.ok) {
    return <WorkspaceDataError message={stateResult.error} />;
  }

  const state = stateResult.state;

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Supplier records and price history for purchase decisions."
        eyebrow="Sourcing"
        action={<SupplierCreateForm />}
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
              {state.suppliers.length ? state.suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.channel}</TableCell>
                  <TableCell>
                    <StatusBadge tone={supplier.isPreferred ? "success" : "info"}>
                      {supplier.isPreferred ? "Preferred" : "Backup"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>{supplier.notes}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-40">
                    <EmptyState title="No suppliers" description="Supplier records will support purchase planning and price history." />
                  </TableCell>
                </TableRow>
              )}
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
              {state.materialPriceHistory.length ? state.materialPriceHistory.map((price) => {
                const supplier = state.suppliers.find((item) => item.id === price.supplierId);
                const variant = state.materialVariants.find((item) => item.id === price.materialVariantId);
                return (
                  <TableRow key={price.id}>
                    <TableCell>{price.observedAt}</TableCell>
                    <TableCell>{supplier?.name}</TableCell>
                    <TableCell>{variant?.name}</TableCell>
                    <TableCell><MoneyCell value={formatRupiahDecimal(price.packPrice)} /></TableCell>
                    <TableCell><MoneyCell value={formatRupiahDecimal(price.costPerUsageUnit)} /></TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-40">
                    <EmptyState title="No price history" description="Purchase entries will build supplier cost history over time." />
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
