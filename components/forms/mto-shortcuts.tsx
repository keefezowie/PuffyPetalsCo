"use client";

import { Factory, Loader2, PackageCheck, PackageSearch, PlayCircle } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EntitySelect } from "@/components/forms/entity-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshingIndicator } from "@/components/ui/state-views";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatQuantity } from "@/lib/formatters";
import {
  planProductionFromOrder,
  planPurchaseListFromBatch,
} from "@/lib/services/inventory";
import {
  completeProductionBatchAction,
  createPurchaseListFromBatchAction,
  planProductionFromOrderAction,
  recordPurchaseAction,
} from "@/lib/services/supabase-inventory";
import type { InventoryState, ProductionPlanMode } from "@/lib/types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function OrderProductionPlanButton({
  state,
  orderId,
  disabled,
}: {
  state: InventoryState;
  orderId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ProductionPlanMode>("shortage");
  const [date, setDate] = useState(today());
  const [isWorking, setIsWorking] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const pending = isWorking || isRefreshing;
  const plan = useMemo(
    () => planProductionFromOrder(state, orderId, mode),
    [state, orderId, mode],
  );

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" disabled={disabled} />}>
        <Factory data-icon="inline-start" aria-hidden />
        Plan production
      </DialogTrigger>
      <DialogContent className="max-h-[min(90svh,760px)] overflow-y-auto sm:max-w-3xl">
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-semibold">Plan Production From Order</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review quantities before creating planned batches. No stock moves until a batch is completed.
            </p>
          </div>
          <FieldGroup>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>Quantity basis</FieldLabel>
                <Select
                  value={mode}
                  onValueChange={(value) => setMode(value as ProductionPlanMode)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="shortage">Shortage only</SelectItem>
                      <SelectItem value="full">Full order quantity</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="production-plan-date">Planned date</FieldLabel>
                <Input
                  id="production-plan-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Open planned</TableHead>
                <TableHead>To produce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.lines.map((line) => (
                <TableRow key={line.productId}>
                  <TableCell className="font-medium">{line.productName}</TableCell>
                  <TableCell>{formatQuantity(line.orderedQuantity, "pcs")}</TableCell>
                  <TableCell>{formatQuantity(line.currentStock, "pcs")}</TableCell>
                  <TableCell>{formatQuantity(line.alreadyOpenQuantity, "pcs")}</TableCell>
                  <TableCell>
                    <Badge variant={line.quantityToProduce > 0 ? "secondary" : "outline"}>
                      {formatQuantity(line.quantityToProduce, "pcs")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {plan.hasProduction
                ? "Creates one planned batch per product."
                : "No additional production is required with this basis."}
            </div>
            <Button
              disabled={!plan.hasProduction || pending}
              aria-busy={pending}
              onClick={async () => {
                setIsWorking(true);
                try {
                  await planProductionFromOrderAction({
                    orderId,
                    mode,
                    date,
                    notes: `Planned from order (${mode}).`,
                  });
                  toast.success("Production planned", {
                    description: "Planned batches were linked to this order.",
                  });
                  startRefresh(() => router.refresh());
                } catch (error) {
                  toast.error("Planning failed", {
                    description: error instanceof Error ? error.message : "Unknown planning error.",
                  });
                } finally {
                  setIsWorking(false);
                }
              }}
            >
              {pending ? (
                <>
                  <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Create planned batches"
              )}
            </Button>
          </div>
          <RefreshingIndicator show={isRefreshing} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CompleteProductionBatchButton({
  batchId,
  disabled,
}: {
  batchId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const pending = isWorking || isRefreshing;

  return (
    <Button
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={async () => {
        setIsWorking(true);
        try {
          await completeProductionBatchAction({ productionBatchId: batchId });
          toast.success("Batch completed", {
            description: "Materials, finished goods, and movements were posted.",
          });
          startRefresh(() => router.refresh());
        } catch (error) {
          toast.error("Completion failed", {
            description: error instanceof Error ? error.message : "Unknown completion error.",
          });
        } finally {
          setIsWorking(false);
        }
      }}
    >
      {pending ? (
        <>
          <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />
          Completing...
        </>
      ) : (
        <>
          <PlayCircle data-icon="inline-start" aria-hidden />
          Complete batch
        </>
      )}
    </Button>
  );
}

export function PurchaseListFromBatchButton({
  state,
  batchId,
  disabled,
}: {
  state: InventoryState;
  batchId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const pending = isWorking || isRefreshing;
  const plan = useMemo(
    () => planPurchaseListFromBatch(state, batchId),
    [state, batchId],
  );

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" disabled={disabled} />}>
        <PackageSearch data-icon="inline-start" aria-hidden />
        Plan purchases
      </DialogTrigger>
      <DialogContent className="max-h-[min(90svh,760px)] overflow-y-auto sm:max-w-3xl">
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-semibold">Create Purchase List</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review material shortages before creating a non-stock-changing purchase plan.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Shortage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.lines.length ? plan.lines.map((line) => (
                <TableRow key={line.materialVariantId}>
                  <TableCell className="font-medium">{line.materialName}</TableCell>
                  <TableCell>{line.supplierName ?? "Unassigned"}</TableCell>
                  <TableCell>{formatQuantity(line.requiredQuantity, line.usageUnit)}</TableCell>
                  <TableCell>{formatQuantity(line.availableQuantity, line.usageUnit)}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">
                      {formatQuantity(line.shortageQuantity, line.usageUnit)}
                    </Badge>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5}>No material shortages were found for this batch.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex justify-end">
            <Button
              disabled={!plan.hasShortages || pending}
              aria-busy={pending}
              onClick={async () => {
                setIsWorking(true);
                try {
                  await createPurchaseListFromBatchAction({
                    productionBatchId: batchId,
                    notes: "Planned from production batch.",
                  });
                  toast.success("Purchase list created", {
                    description: "Shortage lines are ready in Purchases.",
                  });
                  startRefresh(() => router.refresh());
                } catch (error) {
                  toast.error("Purchase planning failed", {
                    description: error instanceof Error ? error.message : "Unknown purchase planning error.",
                  });
                } finally {
                  setIsWorking(false);
                }
              }}
            >
              {pending ? (
                <>
                  <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Create purchase list"
              )}
            </Button>
          </div>
          <RefreshingIndicator show={isRefreshing} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function asNumber(formData: FormData, name: string, fallback = 0) {
  const value = Number(formData.get(name) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function asString(formData: FormData, name: string, fallback = "") {
  return String(formData.get(name) ?? fallback);
}

export function ReceivePurchaseListButton({
  state,
  purchaseListId,
  disabled,
}: {
  state: InventoryState;
  purchaseListId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const purchaseList = state.purchaseLists.find((list) => list.id === purchaseListId);
  const lines = state.purchaseListLines.filter((line) => line.purchaseListId === purchaseListId);
  const defaultSupplierId =
    lines.find((line) => line.supplierId)?.supplierId ?? state.suppliers[0]?.id ?? "";
  const lineKeys = lines.map((line) => line.id);
  const disabledReason =
    !purchaseList || !lines.length || !state.suppliers.length || purchaseList.status === "received";

  async function action(formData: FormData) {
    const date = asString(formData, "date", today());
    const purchaseUrl = asString(formData, "purchaseUrl");
    const notes = asString(formData, "notes");
    const groupedLines = new Map<string, Array<Record<string, string | number>>>();

    for (const key of lineKeys) {
      const supplierId = asString(formData, `supplierId-${key}`, defaultSupplierId);
      if (!supplierId) {
        throw new Error("Supplier is required for every received purchase-list line.");
      }

      const group = groupedLines.get(supplierId) ?? [];
      group.push({
        material_variant_id: asString(formData, `materialVariantId-${key}`),
        quantity_purchased: asNumber(formData, `quantityPurchased-${key}`, 1),
        purchase_unit: asString(formData, `purchaseUnit-${key}`, "pack"),
        total_price: asNumber(formData, `totalPrice-${key}`, 0),
        quantity_added_usage_unit: asNumber(formData, `quantityAddedUsageUnit-${key}`, 0),
        notes: asString(formData, `lineNotes-${key}`),
      });
      groupedLines.set(supplierId, group);
    }

    try {
      for (const [supplierId, groupLines] of groupedLines) {
        await recordPurchaseAction({
          supplierId,
          date,
          shippingCost: 0,
          discount: 0,
          purchaseListId,
          purchaseUrl,
          notes,
          lines: groupLines,
        });
      }

      toast.success("Purchase list received", {
        description: "Purchase receipt records were created and raw material stock was updated.",
      });
      startRefresh(() => router.refresh());
    } catch (error) {
      toast.error("Receiving failed", {
        description: error instanceof Error ? error.message : "Unknown receiving error.",
      });
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" disabled={disabled || disabledReason} />}>
        <PackageCheck data-icon="inline-start" aria-hidden />
        Receive
      </DialogTrigger>
      <DialogContent className="max-h-[min(90svh,920px)] overflow-y-auto sm:max-w-4xl">
        <form action={action} className="flex flex-col gap-5" aria-busy={isRefreshing}>
          <div>
            <h2 className="text-lg font-semibold">Receive Purchase List</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review actual suppliers, quantities, and prices. Saving creates purchase receipts and increases raw material stock.
            </p>
          </div>

          <FieldGroup>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`purchase-list-date-${purchaseListId}`}>Receipt date</FieldLabel>
                <Input
                  id={`purchase-list-date-${purchaseListId}`}
                  name="date"
                  type="date"
                  defaultValue={today()}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`purchase-list-url-${purchaseListId}`}>Purchase link</FieldLabel>
                <Input
                  id={`purchase-list-url-${purchaseListId}`}
                  name="purchaseUrl"
                  type="url"
                  placeholder="https://shopee.co.id/..."
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`purchase-list-notes-${purchaseListId}`}>Notes</FieldLabel>
              <Input
                id={`purchase-list-notes-${purchaseListId}`}
                name="notes"
                defaultValue={`Received from purchase list ${purchaseListId.slice(0, 8)}`}
              />
            </Field>
          </FieldGroup>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Purchase Qty</TableHead>
                  <TableHead>Added Stock</TableHead>
                  <TableHead>Total Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const variant = state.materialVariants.find((item) => item.id === line.materialVariantId);
                  const material = state.materials.find((item) => item.id === variant?.materialId);
                  const estimatedPrice = Math.round(line.recommendedPurchaseQuantity * (variant?.costPerUsageUnit ?? 0));

                  return (
                    <TableRow key={line.id}>
                      <TableCell className="min-w-44">
                        <input type="hidden" name={`materialVariantId-${line.id}`} value={line.materialVariantId} />
                        <input type="hidden" name={`purchaseUnit-${line.id}`} value={line.purchaseUnit} />
                        <div className="font-medium">{variant?.name ?? "Unknown material"}</div>
                        <div className="text-xs text-muted-foreground">
                          Need {formatQuantity(line.recommendedPurchaseQuantity, line.usageUnit)}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-48">
                        <EntitySelect
                          name={`supplierId-${line.id}`}
                          defaultValue={line.supplierId ?? material?.preferredSupplierId ?? defaultSupplierId}
                          placeholder="Select supplier"
                          items={state.suppliers.map((supplier) => ({
                            value: supplier.id,
                            label: supplier.name,
                            description: supplier.channel,
                          }))}
                        />
                      </TableCell>
                      <TableCell className="min-w-32">
                        <Input
                          name={`quantityPurchased-${line.id}`}
                          type="number"
                          step="0.0001"
                          defaultValue="1"
                          required
                        />
                      </TableCell>
                      <TableCell className="min-w-36">
                        <Input
                          name={`quantityAddedUsageUnit-${line.id}`}
                          type="number"
                          step="0.0001"
                          defaultValue={line.recommendedPurchaseQuantity}
                          required
                        />
                      </TableCell>
                      <TableCell className="min-w-36">
                        <Input
                          name={`totalPrice-${line.id}`}
                          type="number"
                          defaultValue={estimatedPrice}
                          required
                        />
                        <input
                          type="hidden"
                          name={`lineNotes-${line.id}`}
                          value={`Received for ${formatQuantity(line.recommendedPurchaseQuantity, line.usageUnit)} purchase-list shortage.`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Lines with different suppliers will create separate purchase receipts.
            </div>
            <Button type="submit" disabled={isRefreshing} aria-busy={isRefreshing}>
              {isRefreshing ? (
                <>
                  <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />
                  Receiving...
                </>
              ) : (
                "Receive purchase list"
              )}
            </Button>
          </div>
          <RefreshingIndicator show={isRefreshing} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
