import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Empty className={cn("border bg-muted/20", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "The app could not load this view. Try again, or come back after checking the connection.",
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-destructive/20 bg-destructive/5 p-4", className)}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle aria-hidden className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-destructive">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function LoadingState({
  title = "Loading workspace",
  description = "Preparing live inventory data...",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border bg-card p-4", className)}>
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Loader2 aria-hidden className="size-4 animate-spin" />
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

export function RefreshingIndicator({
  show,
  label = "Refreshing data...",
}: {
  show: boolean;
  label?: string;
}) {
  if (!show) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-accent px-3 py-2 text-sm text-accent-foreground shadow-sm">
      <RefreshCw aria-hidden className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border bg-card p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-7 w-36" />
            <Skeleton className="mt-4 h-3 w-44" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
      <PanelSkeleton rows={6} />
    </div>
  );
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-3 w-64" />
      <div className="mt-5 flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" onClick={onClick}>
      <RefreshCw data-icon="inline-start" aria-hidden />
      Try again
    </Button>
  );
}
