"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";

import { StockAdjustmentForm } from "@/components/forms/stock-adjustment-form";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { QuantityCell, MoneyCell, StatusBadge } from "@/components/ui/data-display";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatQuantity, formatRupiahDecimal } from "@/lib/formatters";
import type { InventoryState } from "@/lib/types";

const materialCategoryOptions = [
  { value: "fuzzy_pipes", label: "Fuzzy Pipes" },
  { value: "pearl", label: "Pearl" },
  { value: "stemen", label: "Stemen" },
  { value: "stem", label: "Stem" },
  { value: "wrapping", label: "Wrapping" },
  { value: "accessory", label: "Accessory" },
  { value: "adhesive", label: "Adhesive" },
  { value: "label", label: "Label" },
  { value: "packaging", label: "Packaging" },
];

function formatCategory(value: string) {
  return materialCategoryOptions.find((option) => option.value === value)?.label ?? value.replaceAll("_", " ");
}

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

function createColumns(state: InventoryState): ColumnDef<MaterialRow>[] {
  return [
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
    cell: ({ row }) => <Badge variant="secondary">{formatCategory(row.original.category)}</Badge>,
  },
  {
    accessorKey: "stockQuantity",
    header: "Stock",
    cell: ({ row }) => (
      <QuantityCell value={formatQuantity(row.original.stockQuantity, row.original.usageUnit)} />
    ),
  },
  {
    accessorKey: "minStock",
    header: "Minimum",
    cell: ({ row }) => (
      <QuantityCell value={formatQuantity(row.original.minStock, row.original.usageUnit)} muted />
    ),
  },
  {
    accessorKey: "costPerUsageUnit",
    header: "Unit Cost",
    cell: ({ row }) => <MoneyCell value={formatRupiahDecimal(row.original.costPerUsageUnit)} />,
  },
  {
    accessorKey: "estimationStatus",
    header: "Cost Status",
    cell: ({ row }) => (
      <Badge variant={row.original.estimationStatus === "manually_verified" ? "success" : "outline"}>
        {row.original.estimationStatus.replaceAll("_", " ")}
      </Badge>
    ),
  },
  {
    id: "status",
    header: "Alert",
    cell: ({ row }) =>
      row.original.stockQuantity <= row.original.minStock ? (
        <StatusBadge tone="danger">Low stock</StatusBadge>
      ) : (
        <StatusBadge tone="success">OK</StatusBadge>
      ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <StockAdjustmentForm
        state={state}
        defaultVariantId={row.original.id}
        triggerLabel="Adjust"
        triggerSize="sm"
      />
    ),
  },
  ];
}

export function MaterialsTable({ data, state }: { data: MaterialRow[]; state: InventoryState }) {
  const columns = useMemo(() => createColumns(state), [state]);
  const [category, setCategory] = useState("all");
  const filteredData = useMemo(
    () => (category === "all" ? data : data.filter((row) => row.category === category)),
    [category, data],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Select value={category} onValueChange={(value) => setCategory(value ?? "all")}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All categories</SelectItem>
              {materialCategoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    <DataTable
      columns={columns}
      data={filteredData}
      searchPlaceholder="Search material, variant, size, or category"
      emptyTitle="No materials found"
      emptyDescription="Try a different material name, variant, size, or category."
      getRowHref={(row) => `/materials/${row.materialId}`}
      mobileCard={(row) => (
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link href={`/materials/${row.materialId}`} className="font-medium hover:underline">
                {row.variantName}
              </Link>
              <div className="text-xs text-muted-foreground">{row.materialName}</div>
            </div>
            {row.stockQuantity <= row.minStock ? (
              <StatusBadge tone="danger">Low stock</StatusBadge>
            ) : (
              <StatusBadge tone="success">OK</StatusBadge>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Stock</div>
              <div className="numeric font-medium">
                {formatQuantity(row.stockQuantity, row.usageUnit)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Unit cost</div>
              <div className="numeric font-medium">{formatRupiahDecimal(row.costPerUsageUnit)}</div>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <StockAdjustmentForm
              state={state}
              defaultVariantId={row.id}
              triggerLabel="Adjust"
              triggerSize="sm"
            />
          </div>
        </div>
      )}
    />
    </div>
  );
}
