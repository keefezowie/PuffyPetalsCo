"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useState } from "react";

import { TableRow } from "@/components/ui/table";
import { useRouteProgress } from "@/components/ui/route-progress";
import { cn } from "@/lib/utils";

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(
    target.closest("a,button,input,select,textarea,[role='button'],[data-no-row-click]"),
  );
}

export function ClickableTableRow({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const { startNavigation } = useRouteProgress();
  const [isNavigating, setIsNavigating] = useState(false);

  function openRow(event: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>) {
    if (!isNavigating && !isInteractiveTarget(event.target)) {
      setIsNavigating(true);
      startNavigation(href);
      router.push(href);
    }
  }

  return (
    <TableRow
      aria-busy={isNavigating}
      data-navigating={isNavigating ? "true" : undefined}
      className={cn(
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "data-[navigating=true]:bg-primary/10 data-[navigating=true]:shadow-[inset_3px_0_0_var(--primary)] data-[navigating=true]:animate-pulse",
        isNavigating && "pointer-events-none",
        className,
      )}
      role="link"
      tabIndex={0}
      onClick={openRow}
      onMouseEnter={() => router.prefetch(href)}
      onFocus={() => router.prefetch(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openRow(event);
        }
      }}
    >
      {children}
    </TableRow>
  );
}
