import { PurchaseEntryForm } from "@/components/forms/purchase-entry-form";
import { PageHeader } from "@/components/layout/page-helpers";
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
import { formatDate, formatRupiah } from "@/lib/formatters";

export default async function PurchasesPage() {
  const state = await getInventoryState();

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Record material purchases, update stock, and write immutable purchase movements."
      />

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <PurchaseEntryForm state={state} />

        <Card>
          <CardHeader>
            <CardTitle>Recent Purchases</CardTitle>
            <CardDescription>Purchases are separate from material master data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.purchases.map((purchase) => {
                  const supplier = state.suppliers.find((item) => item.id === purchase.supplierId);
                  return (
                    <TableRow key={purchase.id}>
                      <TableCell>{formatDate(purchase.date)}</TableCell>
                      <TableCell>{supplier?.name}</TableCell>
                      <TableCell>{formatRupiah(purchase.effectiveTotal)}</TableCell>
                      <TableCell>{purchase.notes}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
