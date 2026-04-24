# Pearl Flower Inventory MVP

## Product Requirements

This MVP manages handmade pearl flower costing and stock for a small business. It tracks raw material variants, purchases, BOM recipes, production batches, finished goods, orders, profit, margin, reports, and stock alerts without turning the product into a heavy ERP.

Primary success criteria:

- Pearl sizes are material variants under one pearl material family.
- Purchases increase raw material stock and update latest cost.
- Production consumes BOM materials, increases finished goods, and creates movement records.
- Sales fulfillment deducts finished goods once and calculates COGS/profit.
- Low-stock materials and low-margin products are visible from the dashboard.
- Negative stock is blocked by default.

## Database Schema

The Supabase migration is in `supabase/migrations/202604240001_pearl_flower_inventory.sql`.

Tables:

- `settings`: owner-level costing, margin, fee, and stock behavior.
- `suppliers`: supplier directory and preferred supplier status.
- `materials`: normalized material families with units, conversions, thresholds, and supplier preference.
- `material_variants`: variant-level stock, cost, pearl size, pack details, estimation/verification status.
- `products`: finished goods with selling price, labor, packaging, overhead, stock, and cost snapshots.
- `product_bom_lines`: recipe lines with variant, quantity, waste, optional flag, and cost snapshot.
- `purchases`, `purchase_lines`: purchase header and line-level material stock/cost inputs.
- `production_batches`, `production_batch_lines`: production outputs and consumed material snapshots.
- `inventory_movements`: immutable audit log for every stock change.
- `orders`, `order_items`: order lifecycle, revenue, fees, COGS, and profit.
- `platform_fee_rules`: channel fee rates used by recommended pricing.
- `product_images`: Supabase Storage metadata.
- `material_price_history`: supplier cost history.
- `stock_adjustments`: adjustment reason records linked to movements.

RLS is enabled on every business table with `owner_id = auth.uid()` policies.

## Calculation Formulas

- Pearl estimate: `estimated pcs = 33 * (10 / size_mm)^3`
- Pearl unit cost: `pack price / estimated pcs`, or manual counted pcs when verified.
- Labor cost: `labor minutes / 60 * labor rate per hour`
- BOM effective quantity: `quantity required * (1 + waste percentage)`
- BOM line cost: `effective quantity * unit cost`
- Manufacturing cost: `BOM material cost + labor + packaging + overhead`
- Gross profit: `selling price - manufacturing cost`
- Gross margin: `gross profit / selling price`
- Markup: `selling price / manufacturing cost`
- Recommended price: `total cost / (1 - target margin - platform fee rate)`

The recommended price denominator must be greater than zero.

## Service Layer

Core service functions live in `lib/services/inventory.ts`.

- `calculatePearlEstimate`
- `calculateMaterialUnitCost`
- `calculateBomLineCost`
- `calculateProductManufacturingCost`
- `getRecommendedPrice`
- `canProduce`
- `createProductionBatch`
- `recordPurchase`
- `fulfillOrder`
- `calculateOrderProfit`
- `getLowStockMaterials`
- `getDashboardMetrics`

Supabase RPC wrappers live in `lib/services/supabase-inventory.ts`.

## UI Page Plan

Implemented routes:

- `/dashboard`
- `/materials`
- `/materials/[id]`
- `/pearl-calculator`
- `/suppliers`
- `/purchases`
- `/products`
- `/products/[id]`
- `/production`
- `/production/[id]`
- `/finished-goods`
- `/orders`
- `/orders/[id]`
- `/reports`
- `/settings`

The app uses a left navigation layout, shadcn/ui primitives, TanStack Table for searchable/sortable core tables, React Hook Form + Zod for calculator/production forms, and Recharts for dashboard charts.

## Seed Data

Seed files:

- `lib/demo-data.ts`: deterministic app demo data.
- `supabase/seed.sql`: Supabase seed for the first Auth user.

Pearl baseline:

- `10mm, 15g = 33 pcs`
- `12mm` exact estimate is about `19.10 pcs`; rounded planning count is `19 pcs`; rounded planning cost is `Rp236.84` for a `Rp4.500` pack.

Seed products:

- Cherry Blossoms
- Orchid
- Hydrangea
- Puffy Blush Bloom

All sample BOMs use 12mm pearls and clearly mark non-pearl quantities as sample data.

## Validation And Edge Cases

Validation rules are implemented through SQL constraints, Zod schemas, and service checks:

- No negative selling price, pack price, platform fee, labor rate, or normal quantity.
- Pearl size must be greater than zero.
- Waste percentage cannot be less than zero.
- Target margin and platform fee must be between zero and one.
- BOM lines require a material variant.
- Empty BOM production is blocked.
- Invalid recommended price denominator throws an error.
- Negative stock is blocked unless settings explicitly allow it.
- Order fulfillment is idempotent through `stockDeducted` / `stock_deducted`.
- Inventory movement records are immutable.

## Testing Checklist

Automated tests cover:

- Pearl formula and 12mm estimate.
- Estimated and manually verified unit cost.
- BOM waste and line cost.
- Product manufacturing cost.
- Recommended price denominator validation.
- Production feasibility and limiting material.
- Production batch stock/movement updates.
- Purchase stock/cost/history updates.
- Fulfillment idempotency.
- Low-stock detection.
- Dashboard metrics.
- Zod validation.

Run:

```bash
npm test
npm run lint
npm run build
```

## Supabase API Keys

Use the current Supabase key naming:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Use `SUPABASE_SECRET_KEY=sb_secret_...` only for backend/admin jobs that intentionally bypass RLS. Do not put secret keys in `NEXT_PUBLIC_` variables.

## Future Roadmap

- Weighted average and FIFO costing.
- CSV/Excel import.
- CSV/Excel export.
- Multi-user roles.
- Purchase planning.
- Barcode or QR labels.
- Supabase Storage photo upload flows.
- Shopee fee/import automation.
- Batch-level finished goods traceability.
- Inventory value trend snapshots.
- Production calendar and made-to-order planning.
