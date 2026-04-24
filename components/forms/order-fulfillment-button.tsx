"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fulfillOrderAction } from "@/lib/services/supabase-inventory";

export function OrderFulfillmentButton({
  orderId,
  disabled,
}: {
  orderId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const pending = isWorking || isRefreshing;

  return (
    <Button
      variant="outline"
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={async () => {
        setIsWorking(true);
        try {
          await fulfillOrderAction(orderId);
          toast.success("Order fulfilled", {
            description: "Finished goods stock, COGS, and profit were updated.",
          });
          startRefresh(() => {
            router.refresh();
          });
        } catch (error) {
          toast.error("Fulfillment failed", {
            description: error instanceof Error ? error.message : "Unknown fulfillment error.",
          });
        } finally {
          setIsWorking(false);
        }
      }}
    >
      {pending ? (
        <>
          <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />
          {isRefreshing ? "Refreshing..." : "Fulfilling..."}
        </>
      ) : (
        "Fulfill order"
      )}
    </Button>
  );
}
