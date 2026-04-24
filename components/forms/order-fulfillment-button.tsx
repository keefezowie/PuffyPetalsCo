"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

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
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={disabled || isPending}
      onClick={() => {
        startTransition(() => {
          fulfillOrderAction(orderId)
            .then(() => {
              toast.success("Order fulfilled", {
                description: "Finished goods stock, COGS, and profit were updated.",
              });
              router.refresh();
            })
            .catch((error) => {
              toast.error("Fulfillment failed", {
                description: error instanceof Error ? error.message : "Unknown fulfillment error.",
              });
            });
        });
      }}
    >
      {isPending ? "Fulfilling..." : "Fulfill order"}
    </Button>
  );
}
