"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatQuantity, formatRupiahDecimal } from "@/lib/formatters";

export interface MaterialRow {
  id: string;
  materialId: string;
  materialName: string;
  variantName: string;
  category: string;
  stockQuantity: number;
  minStock: number;
  targetStock: number;
  usageUnit: string;
  costPerUsageUnit: number;
  estimationStatus: string;
}

const columns: ColumnDef<MaterialRow>[] = [
  {
    accessorKey: "variantName",
    header: "Variant",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Link href={`/materials/${row.original.materialId}`} className="font-medium hover:underline">
          {row.original.variantName}
        </Link>
        <span className="text-xs text-muted-foreground">{row.original.materialName}</span>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <Badge variant="secondary">{row.original.category}</Badge>,
  },
  {
    accessorKey: "stockQuantity",
    header: "Stock",
    cell: ({ row }) => formatQuantity(row.original.stockQuantity, row.original.usageUnit),
  },
  {
    accessorKey: "minStock",
    header: "Minimum",
    cell: ({ row }) => formatQuantity(row.original.minStock, row.original.usageUnit),
  },
  {
    accessorKey: "costPerUsageUnit",
    header: "Unit Cost",
    cell: ({ row }) => formatRupiahDecimal(row.original.costPerUsageUnit),
  },
  {
    accessorKey: "estimationStatus",
    header: "Cost Status",
    cell: ({ row }) => (
      <Badge variant={row.original.estimationStatus === "manually_verified" ? "default" : "outline"}>
        {row.original.estimationStatus.replaceAll("_", " ")}
      </Badge>
    ),
  },
  {
    id: "status",
    header: "Alert",
    cell: ({ row }) =>
      row.original.stockQuantity <= row.original.minStock ? (
        <Badge variant="destructive">Low stock</Badge>
      ) : (
        <Badge variant="secondary">OK</Badge>
      ),
  },
  {
    id: "actions",
    cell: () => (
      <Button variant="outline" size="sm">
        Adjust
      </Button>
    ),
  },
];

export function MaterialsTable({ data }: { data: MaterialRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search material, variant, size, or category"
    />
  );
}
