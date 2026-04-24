"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
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
    cell: ({ row }) => formatRupiah(row.original.sellingPrice),
  },
  {
    accessorKey: "manufacturingCost",
    header: "Cost",
    cell: ({ row }) => formatRupiah(row.original.manufacturingCost),
  },
  {
    accessorKey: "grossMargin",
    header: "Margin",
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.grossMargin < row.original.targetMargin
            ? "destructive"
            : "secondary"
        }
      >
        {formatPercent(row.original.grossMargin)}
      </Badge>
    ),
  },
  {
    accessorKey: "recommendedPrice",
    header: "Recommended",
    cell: ({ row }) => formatRupiah(row.original.recommendedPrice),
  },
  {
    accessorKey: "currentStock",
    header: "Stock",
    cell: ({ row }) =>
      `${formatQuantity(row.original.currentStock, "pcs")} (${formatQuantity(
        row.original.currentStock - row.original.reservedStock,
        "available",
      )})`,
  },
];

export function ProductsTable({ data }: { data: ProductRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search products, SKU, or margin"
    />
  );
}
