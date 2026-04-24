"use client";

import { Factory, Loader2, PackageSearch, PlayCircle } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
