import { ProductCreateForm } from "@/components/forms/master-data-forms";
import { PageHeader } from "@/components/layout/page-helpers";
import { ProductsTable, type ProductRow } from "@/components/tables/products-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInventoryState } from "@/lib/data/inventory-loader";
import {
  calculateProductManufacturingCost,
  getRecommendedPrice,
} from "@/lib/services/inventory";

export default async function ProductsPage() {
  const state = await getInventoryState();
  const rows: ProductRow[] = state.products.map((product) => {
    const cost = calculateProductManufacturingCost(state, product.id).totalCost;
    const fee = state.settings.defaultPlatformFeeRate;
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      sellingPrice: product.sellingPrice,
      manufacturingCost: cost,
      grossMargin:
        product.sellingPrice > 0 ? (product.sellingPrice - cost) / product.sellingPrice : 0,
      recommendedPrice: getRecommendedPrice(cost, product.targetMargin, fee),
      currentStock: product.currentStock,
      reservedStock: product.reservedStock,
      targetMargin: product.targetMargin,
    };
  });

  return (
    <>
      <PageHeader
        title="Products"
        description="Finished goods, live manufacturing cost, margin, and recommended price."
        eyebrow="Catalog costing"
        action={<ProductCreateForm state={state} />}
      />
      <Card>
        <CardHeader>
          <CardTitle>Flower Products</CardTitle>
          <CardDescription>
            Product rows are created in Supabase and costed from their live BOM lines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductsTable data={rows} state={state} />
        </CardContent>
      </Card>
    </>
  );
}
