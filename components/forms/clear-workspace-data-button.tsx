"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearWorkspaceDataAction } from "@/lib/services/supabase-inventory";

export function ClearWorkspaceDataButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const pending = isWorking || isRefreshing;
  const canClear = confirmation === "CLEAR";

  async function clearData() {
    if (!canClear || pending) {
      return;
    }

    setIsWorking(true);
    try {
      const result = await clearWorkspaceDataAction();
      if (!result.ok) {
        toast.error("Clear data failed", {
          description: result.error,
        });
        return;
      }

      toast.success("Workspace data cleared", {
        description: "Orders, materials, products, suppliers, purchases, production, and movements were removed.",
      });
      setOpen(false);
      setConfirmation("");
      startRefresh(() => router.refresh());
    } catch (error) {
      toast.error("Clear data failed", {
        description: error instanceof Error ? error.message : "Unknown clear data error.",
      });
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        <Trash2 data-icon="inline-start" aria-hidden />
        Clear workspace data
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <AlertTriangle aria-hidden />
          </AlertDialogMedia>
          <AlertDialogTitle>Clear workspace data?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes operational records, including orders, materials, products, suppliers,
            purchases, production batches, purchase plans, inventory movements, and trace links. Settings and
            platform fee rules are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor="clear-workspace-confirmation" className="text-sm font-medium">
            Type CLEAR to confirm
          </label>
          <Input
            id="clear-workspace-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={!canClear || pending}
            aria-busy={pending}
            onClick={clearData}
          >
            {pending ? (
              <>
                <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />
                Clearing...
              </>
            ) : (
              "Clear data"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
