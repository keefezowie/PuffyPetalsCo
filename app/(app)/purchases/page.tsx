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

      <Card>
        <CardHeader>
          <CardTitle>Purchase Lists</CardTitle>
          <CardDescription>Material shortage plans generated from production batches before receipts are recorded.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Supplier Groups</TableHead>
                  <TableHead>Materials</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.purchaseLists.length ? state.purchaseLists.map((list) => {
                  const lines = state.purchaseListLines.filter((line) => line.purchaseListId === list.id);
                  const batch = state.productionBatches.find((item) => item.id === list.productionBatchId);
                  const product = state.products.find((item) => item.id === batch?.productId);
                  const suppliers = new Set(lines.map((line) => line.supplierId ?? "unassigned"));
                  const receipt = state.purchases.find((purchase) => purchase.purchaseListId === list.id);
                  return (
                    <TableRow key={list.id}>
                      <TableCell>{formatDate(list.createdAt)}</TableCell>
                      <TableCell>{product?.name ?? "Unknown batch"}</TableCell>
                      <TableCell>{suppliers.size}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {lines.map((line) => {
                            const variant = state.materialVariants.find((item) => item.id === line.materialVariantId);
                            const supplier = state.suppliers.find((item) => item.id === line.supplierId);
                            return (
                              <span key={line.id} className="text-sm">
                                {variant?.name ?? "Unknown material"} - {supplier?.name ?? "Unassigned"}
                              </span>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{list.status}</TableCell>
                      <TableCell>
                        {receipt ? formatDate(receipt.date) : <span className="text-sm text-muted-foreground">Not received</span>}
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40">
                      <EmptyState
                        title="No purchase lists"
                        description="Create one from a production batch when materials are short."
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
