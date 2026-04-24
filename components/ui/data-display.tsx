import { Badge, type badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

export function MoneyCell({
  value,
  muted,
}: {
  value: string;
  muted?: boolean;
}) {
  return (
    <span className={cn("numeric block text-right font-medium", muted && "text-muted-foreground")}>
      {value}
    </span>
  );
}

export function QuantityCell({
  value,
  muted,
}: {
  value: string;
  muted?: boolean;
}) {
  return (
    <span className={cn("numeric block text-right", muted && "text-muted-foreground")}>
      {value}
    </span>
  );
}

type StatusBadgeVariant = VariantProps<typeof badgeVariants>["variant"];
type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  const variantByTone: Record<StatusTone, StatusBadgeVariant> = {
    neutral: "secondary",
    success: "success",
    warning: "warning",
    danger: "destructive",
    info: "outline",
  };

  return <Badge variant={variantByTone[tone]}>{children}</Badge>;
}
