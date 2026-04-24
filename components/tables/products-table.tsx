"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { DataTable } from "@/components/tables/data-table";
import { MoneyCell, QuantityCell, StatusBadge } from "@/components/ui/data-display";
import { formatPercent, formatQuantity, formatRupiah } from "@/lib/formatters";

export interface ProductRow {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  manufacturingCost: number;
  grossMargin: number;
  recommendedPrice: number;
  currentStock: number;
  reservedStock: number;
  targetMargin: number;
}

const columns: ColumnDef<ProductRow>[] = [
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Link href={`/products/${row.original.id}`} className="font-medium hover:underline">
          {row.original.name}
        </Link>
        <span className="text-xs text-muted-foreground">{row.original.sku}</span>
      </div>
    ),
  },
  {
    accessorKey: "sellingPrice",
    header: "Selling Price",
    cell: ({ row }) => <MoneyCell value={formatRupiah(row.original.sellingPrice)} />,
  },
  {
    accessorKey: "manufacturingCost",
    header: "Cost",
    cell: ({ row }) => <MoneyCell value={formatRupiah(row.original.manufacturingCost)} muted />,
  },
  {
    accessorKey: "grossMargin",
    header: "Margin",
    cell: ({ row }) => (
      <StatusBadge
        tone={
          row.original.grossMargin < row.original.targetMargin
            ? "danger"
            : "success"
        }
      >
        {formatPercent(row.original.grossMargin)}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "recommendedPrice",
    header: "Recommended",
    cell: ({ row }) => <MoneyCell value={formatRupiah(row.original.recommendedPrice)} />,
  },
  {
    accessorKey: "currentStock",
    header: "Stock",
    cell: ({ row }) => (
      <QuantityCell
        value={`${formatQuantity(row.original.currentStock, "pcs")} (${formatQuantity(
          row.original.currentStock - row.original.reservedStock,
          "available",
        )})`}
      />
    ),
  },
];

export function ProductsTable({ data }: { data: ProductRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search products, SKU, or margin"
      emptyTitle="No products found"
      emptyDescription="Try another product name, SKU, or margin search."
      mobileCard={(row) => (
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link href={`/products/${row.id}`} className="font-medium hover:underline">
                {row.name}
              </Link>
              <div className="text-xs text-muted-foreground">{row.sku}</div>
            </div>
            <StatusBadge tone={row.grossMargin < row.targetMargin ? "danger" : "success"}>
              {formatPercent(row.grossMargin)}
            </StatusBadge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Price</div>
              <div className="numeric font-medium">{formatRupiah(row.sellingPrice)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Available</div>
              <div className="numeric font-medium">
                {formatQuantity(row.currentStock - row.reservedStock, "pcs")}
              </div>
            </div>
          </div>
        </div>
      )}
    />
  );
}
