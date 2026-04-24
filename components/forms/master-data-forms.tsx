"use client";

import {
  Boxes,
  Flower2,
  Settings2,
  ShoppingBag,
  Store,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  updateSettingsAction,
} from "@/lib/services/supabase-inventory";
import type {
  InventoryState,
  MaterialCategory,
  OrderStatus,
  PaymentStatus,
  SalesPlatform,
  Unit,
} from "@/lib/types";

const materialCategories: MaterialCategory[] = [
  "pearl",
  "wire",
  "string",
  "packaging",
  "adhesive",
  "label",
  "accessory",
];

const units: Unit[] = ["pcs", "pack", "gram", "meter", "cm", "roll", "set"];
const platforms: SalesPlatform[] = ["Shopee", "Instagram", "WhatsApp", "Offline", "Other"];
const orderStatuses: OrderStatus[] = ["draft", "confirmed", "in_production", "ready_to_pack", "packed", "shipped", "completed", "cancelled", "returned"];
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

export function SupplierCreateForm() {
  const { isRefreshing, refresh } = useRefreshToast();

  async function action(formData: FormData) {
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
      refresh();
    } catch (error) {
      toast.error("Supplier failed", {
        description: error instanceof Error ? error.message : "Unknown supplier error.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store aria-hidden />
          Add Supplier
        </CardTitle>
        <CardDescription>Create supplier records used by purchases and restock planning.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-5" aria-busy={isRefreshing}>
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
  );
}

export function MaterialCreateForm({ state }: { state: InventoryState }) {
  const { isRefreshing, refresh } = useRefreshToast();

  async function action(formData: FormData) {
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
        initialStock: asNumber(formData, "initialStock", 0),
        variantNotes: asString(formData, "variantNotes"),
      });
      toast.success("Material saved", {
        description: "Material family and first variant were added to Supabase.",
      });
      refresh();
    } catch (error) {
      toast.error("Material failed", {
        description: error instanceof Error ? error.message : "Unknown material error.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Boxes aria-hidden />
          Add Material Variant
        </CardTitle>
        <CardDescription>Create a material family with its first stock-tracked variant.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-5" aria-busy={isRefreshing}>
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
                        {category.replaceAll("_", " ")}
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
              <Select name="preferredSupplierId" defaultValue={state.suppliers[0]?.id ?? "none"}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">No supplier</SelectItem>
                    {state.suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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
  );
}

export function ProductCreateForm({ state }: { state: InventoryState }) {
  const { isRefreshing, refresh } = useRefreshToast();
  const defaultVariant = state.materialVariants[0]?.id ?? "";

  async function action(formData: FormData) {
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
        materialVariantId: asString(formData, "materialVariantId"),
        quantityRequired: asNumber(formData, "quantityRequired", 1),
        wastePercentage: asNumber(formData, "wastePercentage", 0),
        bomNotes: asString(formData, "bomNotes"),
      });
      toast.success("Product saved", {
        description: "Product and first BOM line were added to the database.",
      });
      refresh();
    } catch (error) {
      toast.error("Product failed", {
        description: error instanceof Error ? error.message : "Unknown product error.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flower2 aria-hidden />
          Add Product
        </CardTitle>
        <CardDescription>Create a finished good with its first bill-of-materials line.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-5" aria-busy={isRefreshing}>
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
            <Field>
              <FieldLabel>BOM material</FieldLabel>
              <Select name="materialVariantId" defaultValue={defaultVariant}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {state.materialVariants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="bom-quantity">Quantity required</FieldLabel>
                <Input id="bom-quantity" name="quantityRequired" type="number" step="0.0001" defaultValue="1" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="bom-waste">Waste percentage</FieldLabel>
                <Input id="bom-waste" name="wastePercentage" type="number" step="0.0001" defaultValue="0" required />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="bom-notes">BOM notes</FieldLabel>
              <Input id="bom-notes" name="bomNotes" />
            </Field>
          </FieldGroup>
          <PendingButton type="submit" disabled={!defaultVariant} pendingText="Saving product...">
            Save product
          </PendingButton>
          <RefreshingIndicator show={isRefreshing} />
        </form>
      </CardContent>
    </Card>
  );
}

export function OrderCreateForm({ state }: { state: InventoryState }) {
  const { isRefreshing, refresh } = useRefreshToast();
  const defaultProduct = state.products[0];
  const defaultRule = state.platformFeeRules[0];

  async function action(formData: FormData) {
    try {
      await createOrderAction({
        orderNumber: asString(formData, "orderNumber"),
        orderDate: asString(formData, "orderDate", today()),
        customerName: asString(formData, "customerName"),
        platform: asString(formData, "platform", "Other") as SalesPlatform,
        status: asString(formData, "status", "confirmed") as OrderStatus,
        paymentStatus: asString(formData, "paymentStatus", "paid") as PaymentStatus,
        productId: asString(formData, "productId"),
        quantity: asNumber(formData, "quantity", 1),
        unitSellingPrice: asNumber(formData, "unitSellingPrice", defaultProduct?.sellingPrice ?? 0),
        discount: asNumber(formData, "discount", 0),
        shippingFeeCharged: asNumber(formData, "shippingFeeCharged", 0),
        shippingCostPaid: asNumber(formData, "shippingCostPaid", 0),
        platformFee: asNumber(formData, "platformFee", defaultRule?.fixedFee ?? 0),
        packagingCost: asNumber(formData, "packagingCost", defaultProduct?.packagingCost ?? 0),
        notes: asString(formData, "notes"),
      });
      toast.success("Order saved", {
        description: "Order header, item, revenue, and reservation state were saved.",
      });
      refresh();
    } catch (error) {
      toast.error("Order failed", {
        description: error instanceof Error ? error.message : "Unknown order error.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag aria-hidden />
          Add Order
        </CardTitle>
        <CardDescription>Record a customer order with one product line and calculated totals.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-5" aria-busy={isRefreshing}>
          <FieldGroup>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="order-number">Order number</FieldLabel>
                <Input id="order-number" name="orderNumber" placeholder="ORD-001" required />
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
            <Field>
              <FieldLabel>Product</FieldLabel>
              <Select name="productId" defaultValue={defaultProduct?.id ?? ""}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {state.products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="order-quantity">Quantity</FieldLabel>
                <Input id="order-quantity" name="quantity" type="number" step="0.0001" defaultValue="1" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="unit-selling-price">Unit selling price</FieldLabel>
                <Input id="unit-selling-price" name="unitSellingPrice" type="number" defaultValue={defaultProduct?.sellingPrice ?? 0} required />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="order-discount">Discount</FieldLabel>
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
                <Input id="order-packaging" name="packagingCost" type="number" defaultValue={defaultProduct?.packagingCost ?? 0} required />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="order-notes">Notes</FieldLabel>
              <Input id="order-notes" name="notes" />
            </Field>
          </FieldGroup>
          <PendingButton type="submit" disabled={!defaultProduct} pendingText="Saving order...">
            Save order
          </PendingButton>
          <RefreshingIndicator show={isRefreshing} />
        </form>
      </CardContent>
    </Card>
  );
}

export function SettingsUpdateForm({ state }: { state: InventoryState }) {
  const { isRefreshing, refresh } = useRefreshToast();
  const settings = state.settings;

  async function action(formData: FormData) {
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
      });
      toast.success("Settings saved", {
        description: "Costing and stock rules were updated.",
      });
      refresh();
    } catch (error) {
      toast.error("Settings failed", {
        description: error instanceof Error ? error.message : "Unknown settings error.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 aria-hidden />
          Update Settings
        </CardTitle>
        <CardDescription>Persist costing defaults and stock policy to Supabase.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-5" aria-busy={isRefreshing}>
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
          </FieldGroup>
          <PendingButton type="submit" pendingText="Saving settings...">
            Save settings
          </PendingButton>
          <RefreshingIndicator show={isRefreshing} />
        </form>
      </CardContent>
    </Card>
  );
}
