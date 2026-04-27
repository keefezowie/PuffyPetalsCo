"use client";

import {
  Boxes,
  Flower2,
  Pencil,
  Plus,
  Settings2,
  ShoppingBag,
  Store,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { EntitySelect } from "@/components/forms/entity-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PendingButton } from "@/components/ui/pending-button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshingIndicator } from "@/components/ui/state-views";
import {
  createMaterialWithVariantAction,
  createOrderAction,
  createProductWithBomAction,
  createSupplierAction,
  updateOrderStatusAction,
  updateProductAction,
  updateSettingsAction,
} from "@/lib/services/supabase-inventory";
import type {
  InventoryState,
  MaterialCategory,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductBomLine,
  SalesPlatform,
  Unit,
} from "@/lib/types";

const materialCategories: MaterialCategory[] = [
  "fuzzy_pipes",
  "pearl",
  "stemen",
  "stem",
  "wrapping",
  "accessory",
  "adhesive",
  "label",
  "packaging",
];

const units: Unit[] = ["pcs", "pack", "gram", "meter", "cm", "roll", "set"];
const platforms: SalesPlatform[] = ["Shopee", "Instagram", "WhatsApp", "Offline", "Other"];
const orderStatuses: OrderStatus[] = ["draft", "confirmed", "in_production", "ready_to_pack", "packed", "shipped", "completed", "cancelled", "returned"];
const postFulfillmentOrderStatuses: OrderStatus[] = ["packed", "shipped", "completed", "cancelled", "returned"];
const paymentStatuses: PaymentStatus[] = ["unpaid", "partial", "paid", "refunded"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function asNumber(formData: FormData, name: string, fallback = 0) {
  const value = Number(formData.get(name) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function asString(formData: FormData, name: string, fallback = "") {
  return String(formData.get(name) ?? fallback);
}

function parseLineKeys(formData: FormData, name: string) {
  return asString(formData, name)
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

function parseBomLines(formData: FormData) {
  return parseLineKeys(formData, "bomLineKeys").map((key) => ({
    materialVariantId: asString(formData, `bomMaterialVariantId-${key}`),
    quantityRequired: asNumber(formData, `bomQuantityRequired-${key}`, 1),
    wastePercentage: asNumber(formData, `bomWastePercentage-${key}`, 0),
    notes: asString(formData, `bomNotes-${key}`),
  }));
}

function parseOrderItems(formData: FormData) {
  return parseLineKeys(formData, "orderLineKeys").map((key) => ({
    productId: asString(formData, `orderProductId-${key}`),
    quantity: asNumber(formData, `orderQuantity-${key}`, 1),
    unitSellingPrice: asNumber(formData, `orderUnitSellingPrice-${key}`, 0),
    discountAllocated: asNumber(formData, `orderDiscountAllocated-${key}`, 0),
  }));
}

function formatCategoryLabel(category: string) {
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function useRefreshToast() {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  return {
    isRefreshing,
    refresh() {
      startRefresh(() => {
        router.refresh();
      });
    },
  };
}

function FormDialog({
  buttonLabel,
  children,
}: {
  buttonLabel: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" aria-hidden />
        {buttonLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[min(90svh,920px)] overflow-y-auto sm:max-w-2xl">
        {typeof children === "function" ? children(close) : children}
      </DialogContent>
    </Dialog>
  );
}

function materialVariantItems(state: InventoryState) {
  return state.materialVariants.map((variant) => {
    const material = state.materials.find((entry) => entry.id === variant.materialId);
    return {
      value: variant.id,
      label: variant.name,
      description: material?.name,
    };
  });
}

function BomLinesEditor({
  state,
  initialLines,
}: {
  state: InventoryState;
  initialLines?: Array<{
    key?: string;
    materialVariantId?: string;
    quantityRequired?: number;
    wastePercentage?: number;
    notes?: string;
  }>;
}) {
  const defaultVariant = state.materialVariants[0]?.id ?? "";
  const [rows, setRows] = useState(() =>
    initialLines?.length
      ? initialLines.map((line, index) => ({
          key: line.key ?? String(index + 1),
          materialVariantId: line.materialVariantId ?? defaultVariant,
          quantityRequired: line.quantityRequired ?? 1,
          wastePercentage: line.wastePercentage ?? 0,
          notes: line.notes ?? "",
        }))
      : [{
          key: "1",
          materialVariantId: defaultVariant,
          quantityRequired: 1,
          wastePercentage: 0,
          notes: "",
        }],
  );
  const items = materialVariantItems(state);

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="bomLineKeys" value={rows.map((row) => row.key).join(",")} />
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>BOM materials</FieldLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setRows((current) => [
              ...current,
              {
                key: crypto.randomUUID(),
                materialVariantId: defaultVariant,
                quantityRequired: 1,
                wastePercentage: 0,
                notes: "",
              },
            ]);
          }}
          disabled={!defaultVariant}
        >
          <Plus data-icon="inline-start" aria-hidden />
          Add material
        </Button>
      </div>
      {rows.map((row, index) => (
        <div key={row.key} className="rounded-lg border bg-muted/20 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-medium">Material {index + 1}</div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove material ${index + 1}`}
              disabled={rows.length === 1}
              onClick={() => setRows((current) => current.filter((entry) => entry.key !== row.key))}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel>Material variant</FieldLabel>
              <EntitySelect
                name={`bomMaterialVariantId-${row.key}`}
                defaultValue={row.materialVariantId}
                placeholder="Select material"
                items={items}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`bom-quantity-${row.key}`}>Quantity required</FieldLabel>
              <Input id={`bom-quantity-${row.key}`} name={`bomQuantityRequired-${row.key}`} type="number" step="0.0001" defaultValue={row.quantityRequired} required />
            </Field>
            <Field>
              <FieldLabel htmlFor={`bom-waste-${row.key}`}>Waste percentage</FieldLabel>
              <Input id={`bom-waste-${row.key}`} name={`bomWastePercentage-${row.key}`} type="number" step="0.0001" defaultValue={row.wastePercentage} required />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={`bom-notes-${row.key}`}>Line notes</FieldLabel>
              <Input id={`bom-notes-${row.key}`} name={`bomNotes-${row.key}`} defaultValue={row.notes} />
            </Field>
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderLinesEditor({ state }: { state: InventoryState }) {
  const defaultProduct = state.products[0];
  const productItems = state.products.map((product) => ({
    value: product.id,
    label: product.name,
    description: product.sku,
  }));
  const [rows, setRows] = useState(() => [{
    key: "1",
    productId: defaultProduct?.id ?? "",
    unitSellingPrice: defaultProduct?.sellingPrice ?? 0,
  }]);

  function updateRowProduct(rowKey: string, productId: string) {
    const product = state.products.find((entry) => entry.id === productId);
    setRows((current) =>
      current.map((row) =>
        row.key === rowKey
          ? {
              ...row,
              productId,
              unitSellingPrice: product?.sellingPrice ?? 0,
            }
          : row,
      ),
    );
  }

  function updateRowPrice(rowKey: string, value: string) {
    const unitSellingPrice = Number(value);
    setRows((current) =>
      current.map((row) =>
        row.key === rowKey
          ? { ...row, unitSellingPrice: Number.isFinite(unitSellingPrice) ? unitSellingPrice : 0 }
          : row,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="orderLineKeys" value={rows.map((row) => row.key).join(",")} />
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>Order products</FieldLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!defaultProduct}
          onClick={() => {
            setRows((current) => [
              ...current,
              {
                key: crypto.randomUUID(),
                productId: defaultProduct?.id ?? "",
                unitSellingPrice: defaultProduct?.sellingPrice ?? 0,
              },
            ]);
          }}
        >
          <Plus data-icon="inline-start" aria-hidden />
          Add product
        </Button>
      </div>
      {rows.map((row, index) => (
        <div key={row.key} className="rounded-lg border bg-muted/20 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-medium">Product {index + 1}</div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove product ${index + 1}`}
              disabled={rows.length === 1}
              onClick={() => setRows((current) => current.filter((entry) => entry.key !== row.key))}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel>Product</FieldLabel>
              <EntitySelect
                name={`orderProductId-${row.key}`}
                value={row.productId}
                onValueChange={(value) => updateRowProduct(row.key, value)}
                placeholder="Select product"
                items={productItems}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`order-quantity-${row.key}`}>Quantity</FieldLabel>
              <Input id={`order-quantity-${row.key}`} name={`orderQuantity-${row.key}`} type="number" step="0.0001" defaultValue="1" required />
            </Field>
            <Field>
              <FieldLabel htmlFor={`unit-selling-price-${row.key}`}>Unit selling price</FieldLabel>
              <Input
                id={`unit-selling-price-${row.key}`}
                name={`orderUnitSellingPrice-${row.key}`}
                type="number"
                value={row.unitSellingPrice}
                onChange={(event) => updateRowPrice(row.key, event.target.value)}
                required
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={`line-discount-${row.key}`}>Line discount</FieldLabel>
              <Input id={`line-discount-${row.key}`} name={`orderDiscountAllocated-${row.key}`} type="number" defaultValue="0" required />
            </Field>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SupplierCreateForm() {
  const { isRefreshing, refresh } = useRefreshToast();

  async function action(formData: FormData, close?: () => void) {
    try {
      await createSupplierAction({
        name: asString(formData, "name"),
        channel: asString(formData, "channel", "Shopee"),
        contact: asString(formData, "contact"),
        marketplaceUrl: asString(formData, "marketplaceUrl"),
        notes: asString(formData, "notes"),
        isPreferred: asString(formData, "isPreferred", "false") === "true",
      });
      toast.success("Supplier saved", {
        description: "Supplier directory and purchase options were refreshed.",
      });
      close?.();
      refresh();
    } catch (error) {
      toast.error("Supplier failed", {
        description: error instanceof Error ? error.message : "Unknown supplier error.",
      });
    }
  }

  return (
    <FormDialog buttonLabel="Add supplier">
    {(close) => (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store aria-hidden />
          Add Supplier
        </CardTitle>
        <CardDescription>Create supplier records used by purchases and restock planning.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={(formData) => action(formData, close)} className="flex flex-col gap-5" aria-busy={isRefreshing}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="supplier-name">Name</FieldLabel>
              <Input id="supplier-name" name="name" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="supplier-channel">Channel</FieldLabel>
              <Input id="supplier-channel" name="channel" defaultValue="Shopee" required />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select name="isPreferred" defaultValue="true">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="true">Preferred</SelectItem>
                    <SelectItem value="false">Backup</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="supplier-contact">Contact</FieldLabel>
              <Input id="supplier-contact" name="contact" />
            </Field>
            <Field>
              <FieldLabel htmlFor="supplier-url">Marketplace URL</FieldLabel>
              <Input id="supplier-url" name="marketplaceUrl" type="url" />
            </Field>
            <Field>
              <FieldLabel htmlFor="supplier-notes">Notes</FieldLabel>
              <Input id="supplier-notes" name="notes" />
            </Field>
          </FieldGroup>
          <PendingButton type="submit" pendingText="Saving supplier...">
            Save supplier
          </PendingButton>
          <RefreshingIndicator show={isRefreshing} />
        </form>
      </CardContent>
    </Card>
    )}
    </FormDialog>
  );
}

export function MaterialCreateForm({ state }: { state: InventoryState }) {
  const { isRefreshing, refresh } = useRefreshToast();

  async function action(formData: FormData, close?: () => void) {
    try {
      await createMaterialWithVariantAction({
        materialName: asString(formData, "materialName"),
        category: asString(formData, "category", "accessory") as MaterialCategory,
        purchaseUnit: asString(formData, "purchaseUnit", "pack") as Unit,
        usageUnit: asString(formData, "usageUnit", "pcs") as Unit,
        conversionFactor: asNumber(formData, "conversionFactor", 1),
        minStock: asNumber(formData, "minStock", 0),
        targetStock: asNumber(formData, "targetStock", 0),
        preferredSupplierId: asString(formData, "preferredSupplierId"),
        materialNotes: asString(formData, "materialNotes"),
        variantName: asString(formData, "variantName"),
        sku: asString(formData, "sku"),
        color: asString(formData, "color"),
        sizeMm: asNumber(formData, "sizeMm", 0),
        packWeightGram: asNumber(formData, "packWeightGram", 0),
        packPrice: asNumber(formData, "packPrice", 0),
        unitsPerPack: asNumber(formData, "unitsPerPack", 0),
        minPurchaseQuantity: asNumber(formData, "minPurchaseQuantity", 0),
        purchaseIncrementQuantity: asNumber(formData, "purchaseIncrementQuantity", 0),
        initialStock: asNumber(formData, "initialStock", 0),
        variantNotes: asString(formData, "variantNotes"),
      });
      toast.success("Material saved", {
        description: "Material family and first variant were added to Supabase.",
      });
      close?.();
      refresh();
    } catch (error) {
      toast.error("Material failed", {
        description: error instanceof Error ? error.message : "Unknown material error.",
      });
    }
  }

  return (
    <FormDialog buttonLabel="Add material">
    {(close) => (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Boxes aria-hidden />
          Add Material Variant
        </CardTitle>
        <CardDescription>Create a material family with its first stock-tracked variant.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={(formData) => action(formData, close)} className="flex flex-col gap-5" aria-busy={isRefreshing}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="material-name">Material family</FieldLabel>
              <Input id="material-name" name="materialName" placeholder="Pearls, floral wire, ribbon" required />
            </Field>
            <Field>
              <FieldLabel>Category</FieldLabel>
              <Select name="category" defaultValue="pearl">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {materialCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {formatCategoryLabel(category)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>Purchase unit</FieldLabel>
                <Select name="purchaseUnit" defaultValue="pack">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {units.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Usage unit</FieldLabel>
                <Select name="usageUnit" defaultValue="pcs">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {units.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="conversion-factor">Units per purchase unit</FieldLabel>
                <Input id="conversion-factor" name="conversionFactor" type="number" step="0.0001" defaultValue="1" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="min-stock">Min stock</FieldLabel>
                <Input id="min-stock" name="minStock" type="number" step="0.0001" defaultValue="0" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="target-stock">Target stock</FieldLabel>
                <Input id="target-stock" name="targetStock" type="number" step="0.0001" defaultValue="0" required />
              </Field>
            </div>
            <Field>
              <FieldLabel>Preferred supplier</FieldLabel>
              <EntitySelect
                name="preferredSupplierId"
                defaultValue={state.suppliers[0]?.id ?? "none"}
                placeholder="No supplier"
                items={[
                  { value: "none", label: "No supplier" },
                  ...state.suppliers.map((supplier) => ({
                    value: supplier.id,
                    label: supplier.name,
                    description: supplier.channel,
                  })),
                ]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="variant-name">Variant name</FieldLabel>
              <Input id="variant-name" name="variantName" placeholder="12mm white pearl" required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="variant-sku">SKU</FieldLabel>
                <Input id="variant-sku" name="sku" />
              </Field>
              <Field>
                <FieldLabel htmlFor="variant-color">Color</FieldLabel>
                <Input id="variant-color" name="color" />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field>
                <FieldLabel htmlFor="size-mm">Size mm</FieldLabel>
                <Input id="size-mm" name="sizeMm" type="number" step="0.001" defaultValue="12" />
              </Field>
              <Field>
                <FieldLabel htmlFor="pack-weight">Pack weight</FieldLabel>
                <Input id="pack-weight" name="packWeightGram" type="number" step="0.001" defaultValue="15" />
              </Field>
              <Field>
                <FieldLabel htmlFor="pack-price">Pack price</FieldLabel>
                <Input id="pack-price" name="packPrice" type="number" defaultValue="0" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="units-per-pack">Counted units</FieldLabel>
                <Input id="units-per-pack" name="unitsPerPack" type="number" step="0.0001" defaultValue="0" />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="initial-stock">Initial stock</FieldLabel>
              <Input id="initial-stock" name="initialStock" type="number" step="0.0001" defaultValue="0" required />
              <FieldDescription>Use purchases after setup for auditable stock intake.</FieldDescription>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="min-purchase-quantity">Minimum purchase quantity</FieldLabel>
                <Input id="min-purchase-quantity" name="minPurchaseQuantity" type="number" step="0.0001" defaultValue="0" />
                <FieldDescription>Purchase plans round shortage lines up to this quantity.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="purchase-increment-quantity">Purchase increment</FieldLabel>
                <Input id="purchase-increment-quantity" name="purchaseIncrementQuantity" type="number" step="0.0001" defaultValue="0" />
                <FieldDescription>Use supplier pack multiples, such as 10 packs or 100 pcs.</FieldDescription>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="material-notes">Notes</FieldLabel>
              <Input id="material-notes" name="materialNotes" />
            </Field>
          </FieldGroup>
          <PendingButton type="submit" pendingText="Saving material...">
            Save material
          </PendingButton>
          <RefreshingIndicator show={isRefreshing} />
        </form>
      </CardContent>
    </Card>
    )}
    </FormDialog>
  );
}

export function ProductCreateForm({ state }: { state: InventoryState }) {
  const { isRefreshing, refresh } = useRefreshToast();

  async function action(formData: FormData, close?: () => void) {
    try {
      await createProductWithBomAction({
        name: asString(formData, "name"),
        sku: asString(formData, "sku"),
        category: asString(formData, "category", "Flower"),
        sellingPrice: asNumber(formData, "sellingPrice", 0),
        laborMinutes: asNumber(formData, "laborMinutes", 0),
        laborRatePerHour: asNumber(formData, "laborRatePerHour", state.settings.laborRatePerHour),
        packagingCost: asNumber(formData, "packagingCost", 0),
        overheadCost: asNumber(formData, "overheadCost", 0),
        targetMargin: asNumber(formData, "targetMargin", state.settings.targetMargin),
        bomLines: parseBomLines(formData),
      });
      toast.success("Product saved", {
        description: "Product and BOM materials were added to the database.",
      });
      close?.();
      refresh();
    } catch (error) {
      toast.error("Product failed", {
        description: error instanceof Error ? error.message : "Unknown product error.",
      });
    }
  }

  return (
    <FormDialog buttonLabel="Add product">
    {(close) => (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flower2 aria-hidden />
          Add Product
        </CardTitle>
        <CardDescription>Create a finished good with one or more bill-of-materials lines.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={(formData) => action(formData, close)} className="flex flex-col gap-5" aria-busy={isRefreshing}>
          <FieldGroup>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="product-name">Name</FieldLabel>
                <Input id="product-name" name="name" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="product-sku">SKU</FieldLabel>
                <Input id="product-sku" name="sku" required />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="product-category">Category</FieldLabel>
              <Input id="product-category" name="category" defaultValue="Flower" required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="selling-price">Selling price</FieldLabel>
                <Input id="selling-price" name="sellingPrice" type="number" defaultValue="0" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="target-margin">Target margin</FieldLabel>
                <Input id="target-margin" name="targetMargin" type="number" step="0.0001" defaultValue={state.settings.targetMargin} required />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="labor-minutes">Labor minutes</FieldLabel>
                <Input id="labor-minutes" name="laborMinutes" type="number" step="0.01" defaultValue="0" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="labor-rate">Labor rate/hour</FieldLabel>
                <Input id="labor-rate" name="laborRatePerHour" type="number" defaultValue={state.settings.laborRatePerHour} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="packaging-cost">Packaging cost</FieldLabel>
                <Input id="packaging-cost" name="packagingCost" type="number" defaultValue="0" required />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="overhead-cost">Overhead cost</FieldLabel>
              <Input id="overhead-cost" name="overheadCost" type="number" defaultValue="0" required />
            </Field>
            <BomLinesEditor state={state} />
          </FieldGroup>
          <PendingButton type="submit" disabled={!state.materialVariants.length} pendingText="Saving product...">
            Save product
          </PendingButton>
          <RefreshingIndicator show={isRefreshing} />
        </form>
      </CardContent>
    </Card>
    )}
    </FormDialog>
  );
}

export function ProductEditForm({
  state,
  product,
}: {
  state: InventoryState;
  product: Product;
}) {
  const { isRefreshing, refresh } = useRefreshToast();
  const [open, setOpen] = useState(false);
  const activeBomLines = state.bomLines.filter((line) => line.productId === product.id && line.active);

  async function action(formData: FormData) {
    try {
      await updateProductAction({
        productId: product.id,
        name: asString(formData, "name"),
        sku: asString(formData, "sku"),
        category: asString(formData, "category", "Flower"),
        sellingPrice: asNumber(formData, "sellingPrice", product.sellingPrice),
        laborMinutes: asNumber(formData, "laborMinutes", product.laborMinutes),
        laborRatePerHour: asNumber(formData, "laborRatePerHour", product.laborRatePerHour),
        packagingCost: asNumber(formData, "packagingCost", product.packagingCost),
        overheadCost: asNumber(formData, "overheadCost", product.overheadCost),
        targetMargin: asNumber(formData, "targetMargin", product.targetMargin),
        bomLines: parseBomLines(formData),
      });
      toast.success("Product updated", {
        description: "Product information and active BOM materials were refreshed.",
      });
      setOpen(false);
      refresh();
    } catch (error) {
      toast.error("Product update failed", {
        description: error instanceof Error ? error.message : "Unknown product update error.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil data-icon="inline-start" aria-hidden />
        Edit
      </DialogTrigger>
      <DialogContent className="max-h-[min(90svh,920px)] overflow-y-auto sm:max-w-2xl">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flower2 aria-hidden />
              Edit Product
            </CardTitle>
            <CardDescription>Update catalog information and replace the active BOM set.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="flex flex-col gap-5" aria-busy={isRefreshing}>
              <FieldGroup>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={`edit-product-name-${product.id}`}>Name</FieldLabel>
                    <Input id={`edit-product-name-${product.id}`} name="name" defaultValue={product.name} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`edit-product-sku-${product.id}`}>SKU</FieldLabel>
                    <Input id={`edit-product-sku-${product.id}`} name="sku" defaultValue={product.sku} required />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor={`edit-product-category-${product.id}`}>Category</FieldLabel>
                  <Input id={`edit-product-category-${product.id}`} name="category" defaultValue={product.category} required />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={`edit-selling-price-${product.id}`}>Selling price</FieldLabel>
                    <Input id={`edit-selling-price-${product.id}`} name="sellingPrice" type="number" defaultValue={product.sellingPrice} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`edit-target-margin-${product.id}`}>Target margin</FieldLabel>
                    <Input id={`edit-target-margin-${product.id}`} name="targetMargin" type="number" step="0.0001" defaultValue={product.targetMargin} required />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor={`edit-labor-minutes-${product.id}`}>Labor minutes</FieldLabel>
                    <Input id={`edit-labor-minutes-${product.id}`} name="laborMinutes" type="number" step="0.01" defaultValue={product.laborMinutes} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`edit-labor-rate-${product.id}`}>Labor rate/hour</FieldLabel>
                    <Input id={`edit-labor-rate-${product.id}`} name="laborRatePerHour" type="number" defaultValue={product.laborRatePerHour} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`edit-packaging-cost-${product.id}`}>Packaging cost</FieldLabel>
                    <Input id={`edit-packaging-cost-${product.id}`} name="packagingCost" type="number" defaultValue={product.packagingCost} required />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor={`edit-overhead-cost-${product.id}`}>Overhead cost</FieldLabel>
                  <Input id={`edit-overhead-cost-${product.id}`} name="overheadCost" type="number" defaultValue={product.overheadCost} required />
                </Field>
                <BomLinesEditor
                  state={state}
                  initialLines={activeBomLines.map((line: ProductBomLine, index) => ({
                    key: line.id || String(index + 1),
                    materialVariantId: line.materialVariantId,
                    quantityRequired: line.quantityRequired,
                    wastePercentage: line.wastePercentage,
                    notes: line.notes,
                  }))}
                />
              </FieldGroup>
              <PendingButton type="submit" disabled={!state.materialVariants.length} pendingText="Saving product...">
                Save product
              </PendingButton>
              <RefreshingIndicator show={isRefreshing} />
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

export function OrderCreateForm({ state }: { state: InventoryState }) {
  const { isRefreshing, refresh } = useRefreshToast();
  const defaultRule = state.platformFeeRules[0];

  async function action(formData: FormData, close?: () => void) {
    const items = parseOrderItems(formData);
    try {
      await createOrderAction({
        orderNumber: asString(formData, "orderNumber"),
        orderDate: asString(formData, "orderDate", today()),
        customerName: asString(formData, "customerName"),
        platform: asString(formData, "platform", "Other") as SalesPlatform,
        status: asString(formData, "status", "confirmed") as OrderStatus,
        paymentStatus: asString(formData, "paymentStatus", "paid") as PaymentStatus,
        items,
        discount: asNumber(formData, "discount", 0),
        shippingFeeCharged: asNumber(formData, "shippingFeeCharged", 0),
        shippingCostPaid: asNumber(formData, "shippingCostPaid", 0),
        platformFee: asNumber(formData, "platformFee", defaultRule?.fixedFee ?? 0),
        packagingCost: asNumber(formData, "packagingCost", 0),
        notes: asString(formData, "notes"),
      });
      toast.success("Order saved", {
        description: "Order header, product lines, revenue, and reservation state were saved.",
      });
      close?.();
      refresh();
    } catch (error) {
      toast.error("Order failed", {
        description: error instanceof Error ? error.message : "Unknown order error.",
      });
    }
  }

  return (
    <FormDialog buttonLabel="Add order">
    {(close) => (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag aria-hidden />
          Add Order
        </CardTitle>
        <CardDescription>Record a customer order with one or more product lines and calculated totals.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={(formData) => action(formData, close)} className="flex flex-col gap-5" aria-busy={isRefreshing}>
          <FieldGroup>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="order-number">Order number</FieldLabel>
                <Input id="order-number" name="orderNumber" placeholder="Auto: SO-YYYY-####" />
                <FieldDescription>Leave blank to generate the next sales order number.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="order-date">Date</FieldLabel>
                <Input id="order-date" name="orderDate" type="date" defaultValue={today()} required />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="customer-name">Customer</FieldLabel>
              <Input id="customer-name" name="customerName" required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel>Platform</FieldLabel>
                <Select name="platform" defaultValue={defaultRule?.platform ?? "Other"}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {platforms.map((platform) => (
                        <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select name="status" defaultValue="confirmed">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {orderStatuses.map((status) => (
                        <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Payment</FieldLabel>
                <Select name="paymentStatus" defaultValue="paid">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {paymentStatuses.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <OrderLinesEditor state={state} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="order-discount">Order-level discount</FieldLabel>
                <Input id="order-discount" name="discount" type="number" defaultValue="0" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="platform-fee">Platform fee</FieldLabel>
                <Input id="platform-fee" name="platformFee" type="number" defaultValue={defaultRule?.fixedFee ?? 0} required />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="shipping-charged">Shipping charged</FieldLabel>
                <Input id="shipping-charged" name="shippingFeeCharged" type="number" defaultValue="0" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="shipping-paid">Shipping paid</FieldLabel>
                <Input id="shipping-paid" name="shippingCostPaid" type="number" defaultValue="0" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="order-packaging">Packaging cost</FieldLabel>
                <Input id="order-packaging" name="packagingCost" type="number" defaultValue="0" required />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="order-notes">Notes</FieldLabel>
              <Input id="order-notes" name="notes" />
            </Field>
          </FieldGroup>
          <PendingButton type="submit" disabled={!state.products.length} pendingText="Saving order...">
            Save order
          </PendingButton>
          <RefreshingIndicator show={isRefreshing} />
        </form>
      </CardContent>
    </Card>
    )}
    </FormDialog>
  );
}

export function OrderStatusUpdateForm({ order }: { order: Order }) {
  const { isRefreshing, refresh } = useRefreshToast();
  const [open, setOpen] = useState(false);
  const editableStatuses = order.stockDeducted ? postFulfillmentOrderStatuses : orderStatuses;
  const defaultStatus = editableStatuses.includes(order.status) ? order.status : "packed";

  async function action(formData: FormData) {
    try {
      await updateOrderStatusAction({
        orderId: order.id,
        status: asString(formData, "status", defaultStatus) as OrderStatus,
        paymentStatus: asString(formData, "paymentStatus", order.paymentStatus) as PaymentStatus,
      });
      toast.success("Order updated", {
        description: "Order and payment status were saved.",
      });
      setOpen(false);
      refresh();
    } catch (error) {
      toast.error("Order update failed", {
        description: error instanceof Error ? error.message : "Unknown order status error.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil data-icon="inline-start" aria-hidden />
        Edit status
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag aria-hidden />
              Order Status
            </CardTitle>
            <CardDescription>Update fulfillment and payment state for {order.orderNumber}.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="flex flex-col gap-5" aria-busy={isRefreshing}>
              <FieldGroup>
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select name="status" defaultValue={defaultStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {editableStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replaceAll("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {order.stockDeducted ? (
                    <FieldDescription>
                      Fulfilled orders can move from packed onward.
                    </FieldDescription>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel>Payment</FieldLabel>
                  <Select name="paymentStatus" defaultValue={order.paymentStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {paymentStatuses.map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
              <PendingButton type="submit" pendingText="Saving status...">
                Save status
              </PendingButton>
              <RefreshingIndicator show={isRefreshing} />
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsUpdateForm({ state }: { state: InventoryState }) {
  const { isRefreshing, refresh } = useRefreshToast();
  const settings = state.settings;

  async function action(formData: FormData, close?: () => void) {
    try {
      await updateSettingsAction({
        allowNegativeStock: asString(formData, "allowNegativeStock", "false") === "true",
        targetMargin: asNumber(formData, "targetMargin", settings.targetMargin),
        laborRatePerHour: asNumber(formData, "laborRatePerHour", settings.laborRatePerHour),
        defaultPlatformFeeRate: asNumber(
          formData,
          "defaultPlatformFeeRate",
          settings.defaultPlatformFeeRate,
        ),
        updateExistingProducts:
          formData.getAll("updateExistingProducts").includes("true"),
      });
      toast.success("Settings saved", {
        description: "Costing and stock rules were updated.",
      });
      close?.();
      refresh();
    } catch (error) {
      toast.error("Settings failed", {
        description: error instanceof Error ? error.message : "Unknown settings error.",
      });
    }
  }

  return (
    <FormDialog buttonLabel="Update settings">
    {(close) => (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 aria-hidden />
          Update Settings
        </CardTitle>
        <CardDescription>Persist costing defaults and stock policy to Supabase.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={(formData) => action(formData, close)} className="flex flex-col gap-5" aria-busy={isRefreshing}>
          <FieldGroup>
            <Field>
              <FieldLabel>Allow negative stock</FieldLabel>
              <Select name="allowNegativeStock" defaultValue={String(settings.allowNegativeStock)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-margin">Default target margin</FieldLabel>
              <Input id="settings-margin" name="targetMargin" type="number" step="0.0001" defaultValue={settings.targetMargin} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-fee">Default platform fee rate</FieldLabel>
              <Input id="settings-fee" name="defaultPlatformFeeRate" type="number" step="0.0001" defaultValue={settings.defaultPlatformFeeRate} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-labor">Labor rate per hour</FieldLabel>
              <Input id="settings-labor" name="laborRatePerHour" type="number" defaultValue={settings.laborRatePerHour} required />
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="settings-update-products"
                name="updateExistingProducts"
                value="true"
                uncheckedValue="false"
                defaultChecked
              />
              <div className="grid gap-1.5 leading-none">
                <FieldLabel htmlFor="settings-update-products">
                  Apply target margin and labor rate to existing products
                </FieldLabel>
                <FieldDescription>
                  Updates product rows that store costing assumptions.
                </FieldDescription>
              </div>
            </Field>
          </FieldGroup>
          <PendingButton type="submit" pendingText="Saving settings...">
            Save settings
          </PendingButton>
          <RefreshingIndicator show={isRefreshing} />
        </form>
      </CardContent>
    </Card>
    )}
    </FormDialog>
  );
}
