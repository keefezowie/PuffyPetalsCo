"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

import { TableRow } from "@/components/ui/table";
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

  function openRow(event: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>) {
    if (!isInteractiveTarget(event.target)) {
      router.push(href);
    }
  }

  return (
    <TableRow
      className={cn("cursor-pointer", className)}
      role="link"
      tabIndex={0}
      onClick={openRow}
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
