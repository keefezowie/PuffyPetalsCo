import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  meta,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow ? (
          <Badge variant="outline" className="w-fit">
            {eyebrow}
          </Badge>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-normal text-balance md:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {meta ? <div className="flex flex-wrap gap-2">{meta}</div> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-medium">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function KpiCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
  trend,
  loading = false,
}: {
  title: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  trend?: string;
  loading?: boolean;
}) {
  const toneClass = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-accent text-accent-foreground",
    warning: "bg-[#a58b71]/15 text-[#5d4b3a] dark:text-[#e5dfd6]",
    danger: "bg-destructive/10 text-destructive",
    info: "bg-primary/10 text-primary",
  }[tone];

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm shadow-foreground/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="text-sm font-medium text-muted-foreground">{title}</div>
          {loading ? (
            <Skeleton className="mt-1 h-8 w-32" />
          ) : (
            <div className="numeric text-2xl font-semibold leading-tight">{value}</div>
          )}
        </div>
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", toneClass)}>
          <Icon className="size-4" aria-hidden />
        </div>
      </div>
      {detail || trend ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {trend ? <span className="font-medium text-foreground">{trend}</span> : null}
          {detail ? <span>{detail}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
