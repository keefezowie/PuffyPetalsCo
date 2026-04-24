"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type PendingButtonProps = ComponentProps<typeof Button> & {
  pendingText?: string;
};

export function PendingButton({
  children,
  disabled,
  pendingText = "Working...",
  ...props
}: PendingButtonProps) {
  const status = useFormStatus();
  const pending = status.pending;

  return (
    <Button disabled={disabled || pending} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
