import { PurchaseEntryForm } from "@/components/forms/purchase-entry-form";
import { PageHeader } from "@/components/layout/page-helpers";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyCell } from "@/components/ui/data-display";
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
import { formatDate, formatRupiah } from "@/lib/formatters";

export default async function PurchasesPage() {
  const state = await getInventoryState();

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Record material purchases, update stock, and write immutable purchase movements."
        eyebrow="Stock intake"
        action={<PurchaseEntryForm state={state} />}
      />

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
                  <TableHead>Repurchase</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.purchases.length ? state.purchases.map((purchase) => {
                  const supplier = state.suppliers.find((item) => item.id === purchase.supplierId);
                  const repurchaseUrl = purchase.receiptUrl ?? supplier?.marketplaceUrl;
                  return (
                    <TableRow key={purchase.id}>
                      <TableCell>{formatDate(purchase.date)}</TableCell>
                      <TableCell>{supplier?.name}</TableCell>
                      <TableCell><MoneyCell value={formatRupiah(purchase.effectiveTotal)} /></TableCell>
                      <TableCell>
                        {repurchaseUrl ? (
                          <a
                            href={repurchaseUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            Repurchase
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">No link</span>
                        )}
                      </TableCell>
                      <TableCell>{purchase.notes}</TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40">
                      <EmptyState
                        title="No purchases recorded"
                        description="Saved purchases will appear here with supplier and cost details."
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
