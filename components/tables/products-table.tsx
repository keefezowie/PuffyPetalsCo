"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { ProductEditForm } from "@/components/forms/master-data-forms";
import { DataTable } from "@/components/tables/data-table";
import { MoneyCell, QuantityCell, StatusBadge } from "@/components/ui/data-display";
import { ProductImage } from "@/components/ui/product-image";
import { formatPercent, formatQuantity, formatRupiah } from "@/lib/formatters";
import type { InventoryState } from "@/lib/types";

export interface ProductRow {
  id: string;
  name: string;
  sku: string;
  photoUrl?: string;
  sellingPrice: number;
  manufacturingCost: number;
  grossMargin: number;
  recommendedPrice: number;
  currentStock: number;
  reservedStock: number;
  targetMargin: number;
}

function centered(value: ReactNode) {
  return <div className="flex justify-center text-center">{value}</div>;
}

function createColumns(state: InventoryState): ColumnDef<ProductRow>[] {
  return [
  {
    accessorKey: "name",
    header: () => <div className="text-center">Product</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-center gap-3 text-left">
        <ProductImage product={row.original} size={44} />
        <div className="flex min-w-0 flex-col">
          <Link href={`/products/${row.original.id}`} className="font-medium hover:underline">
            {row.original.name}
          </Link>
          <span className="text-xs text-muted-foreground">{row.original.sku}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "sellingPrice",
    header: () => <div className="text-center">Selling Price</div>,
    cell: ({ row }) => centered(<MoneyCell value={formatRupiah(row.original.sellingPrice)} />),
  },
  {
    accessorKey: "manufacturingCost",
    header: () => <div className="text-center">Cost</div>,
    cell: ({ row }) => centered(<MoneyCell value={formatRupiah(row.original.manufacturingCost)} muted />),
  },
  {
    accessorKey: "grossMargin",
    header: () => <div className="text-center">Margin</div>,
    cell: ({ row }) => centered(
      <StatusBadge
        tone={
          row.original.grossMargin < row.original.targetMargin
            ? "danger"
            : "success"
        }
      >
        {formatPercent(row.original.grossMargin)}
      </StatusBadge>,
    ),
  },
  {
    accessorKey: "recommendedPrice",
    header: () => <div className="text-center">Recommended</div>,
    cell: ({ row }) => centered(<MoneyCell value={formatRupiah(row.original.recommendedPrice)} />),
  },
  {
    accessorKey: "currentStock",
    header: () => <div className="text-center">Stock</div>,
    cell: ({ row }) => centered(
      <QuantityCell
        value={`${formatQuantity(row.original.currentStock, "pcs")} (${formatQuantity(
          row.original.currentStock - row.original.reservedStock,
          "available",
        )})`}
      />,
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => {
      const product = state.products.find((item) => item.id === row.original.id);
      return product ? centered(<ProductEditForm state={state} product={product} />) : null;
    },
  },
  ];
}

export function ProductsTable({ data, state }: { data: ProductRow[]; state: InventoryState }) {
  const columns = useMemo(() => createColumns(state), [state]);

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
            <div className="flex min-w-0 items-center gap-3">
              <ProductImage product={row} size={44} />
              <div className="min-w-0">
                <Link href={`/products/${row.id}`} className="font-medium hover:underline">
                  {row.name}
                </Link>
                <div className="text-xs text-muted-foreground">{row.sku}</div>
              </div>
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
