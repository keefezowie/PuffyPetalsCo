"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Columns3,
  Search,
  X,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/state-views";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  loading?: boolean;
  loadingRows?: number;
  mobileCard?: (row: TData) => ReactNode;
  getRowHref?: (row: TData) => string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search table",
  emptyTitle = "No results",
  emptyDescription = "Try adjusting the search or filters.",
  loading = false,
  loadingRows = 6,
  mobileCard,
  getRowHref,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const skeletonColumnCount = Math.max(columns.length, 4);
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });
  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const hasFilters = Boolean(globalFilter || columnFilters.length);
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const mobileRows = useMemo(
    () => (mobileCard ? rows.map((row) => ({
      id: row.id,
      content: mobileCard(row.original),
      href: getRowHref?.(row.original),
    })) : []),
    [getRowHref, mobileCard, rows],
  );

  function isInteractiveTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && Boolean(
      target.closest("a,button,input,select,textarea,[role='button'],[data-no-row-click]"),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search aria-hidden className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
            aria-label={searchPlaceholder}
          />
        </div>
        <div className="flex items-center gap-2">
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setGlobalFilter("");
                setColumnFilters([]);
              }}
            >
              <X data-icon="inline-start" aria-hidden />
              Reset
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
              <Columns3 data-icon="inline-start" aria-hidden />
              Columns
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    className="capitalize"
                  >
                    {column.id.replaceAll("_", " ")}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {mobileCard ? (
        <div className="grid gap-3 md:hidden">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-lg border bg-card p-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </div>
            ))
          ) : mobileRows.length ? (
            mobileRows.map((row) => (
              <div
                key={row.id}
                className={row.href ? "cursor-pointer" : undefined}
                onClick={(event) => {
                  if (row.href && !isInteractiveTarget(event.target)) {
                    router.push(row.href);
                  }
                }}
              >
                {row.content}
              </div>
            ))
          ) : (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          )}
        </div>
      ) : null}

      <div className={cn("overflow-hidden rounded-lg border bg-card", mobileCard && "hidden md:block")}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : header.column.getCanSort()
                        ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="-ml-2 h-7 px-2"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              <SortIcon direction={header.column.getIsSorted()} />
                            </Button>
                          )
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: loadingRows }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {Array.from({ length: skeletonColumnCount }).map((__, columnIndex) => (
                    <TableCell key={columnIndex}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length ? (
              rows.map((row) => {
                const href = getRowHref?.(row.original);
                return (
                <TableRow
                  key={row.id}
                  className={href ? "cursor-pointer" : undefined}
                  tabIndex={href ? 0 : undefined}
                  onClick={(event) => {
                    if (href && !isInteractiveTarget(event.target)) {
                      router.push(href);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (href && (event.key === "Enter" || event.key === " ") && !isInteractiveTarget(event.target)) {
                      event.preventDefault();
                      router.push(href);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="h-40">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          {loading
            ? "Loading rows..."
            : `${table.getFilteredRowModel().rows.length} of ${data.length} rows`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage() || loading}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft data-icon="inline-start" aria-hidden />
            Previous
          </Button>
          <span className="numeric min-w-20 text-center">
            {pageCount ? `${pageIndex + 1} / ${pageCount}` : "0 / 0"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage() || loading}
            onClick={() => table.nextPage()}
          >
            Next
            <ChevronRight data-icon="inline-end" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SortIcon({
  direction,
}: {
  direction: false | "asc" | "desc";
}) {
  if (direction === "asc") {
    return <ChevronDown aria-hidden className="size-3 rotate-180" />;
  }

  if (direction === "desc") {
    return <ChevronDown aria-hidden className="size-3" />;
  }

  return <ChevronsUpDown aria-hidden className="size-3 text-muted-foreground" />;
}
