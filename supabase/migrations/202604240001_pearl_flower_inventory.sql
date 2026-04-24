create extension if not exists pgcrypto;

create type public.unit_type as enum ('pcs', 'pack', 'gram', 'meter', 'cm', 'roll', 'set');
create type public.material_category as enum ('pearl', 'wire', 'string', 'packaging', 'adhesive', 'label', 'accessory');
create type public.estimation_status as enum ('formula_estimated', 'manually_verified', 'sample_data');
create type public.inventory_item_type as enum ('raw_material', 'finished_good');
create type public.inventory_movement_type as enum (
  'purchase',
  'production_consumption',
  'production_output',
  'sale',
  'return',
  'damage',
  'waste',
  'manual_adjustment',
  'stock_correction'
);
create type public.sales_platform as enum ('Shopee', 'Instagram', 'WhatsApp', 'Offline', 'Other');
create type public.order_status as enum (
  'draft',
  'confirmed',
  'in_production',
  'ready_to_pack',
  'packed',
  'shipped',
  'completed',
  'cancelled',
  'returned'
);
create type public.payment_status as enum ('unpaid', 'partial', 'paid', 'refunded');
create type public.fulfillment_status as enum ('unfulfilled', 'reserved', 'fulfilled', 'returned');
create type public.costing_method as enum ('latest_purchase', 'weighted_average', 'fifo');

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  allow_negative_stock boolean not null default false,
  target_margin numeric(5,4) not null default 0.45 check (target_margin >= 0 and target_margin <= 1),
  labor_rate_per_hour integer not null default 20000 check (labor_rate_per_hour >= 0),
  default_platform_fee_rate numeric(5,4) not null default 0.08 check (default_platform_fee_rate >= 0 and default_platform_fee_rate <= 1),
  costing_method public.costing_method not null default 'latest_purchase',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  channel text not null default 'Shopee',
  contact text,
  marketplace_url text,
  notes text,
  is_preferred boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category public.material_category not null,
  purchase_unit public.unit_type not null,
  usage_unit public.unit_type not null,
  conversion_factor numeric(14,4) not null default 1 check (conversion_factor > 0),
  conversion_is_estimated boolean not null default true,
  min_stock numeric(14,4) not null default 0 check (min_stock >= 0),
  target_stock numeric(14,4) not null default 0 check (target_stock >= 0),
  preferred_supplier_id uuid references public.suppliers(id) on delete set null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.material_variants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  name text not null,
  sku text,
  color text,
  size_mm numeric(8,3) check (size_mm is null or size_mm > 0),
  pack_weight_gram numeric(10,3) check (pack_weight_gram is null or pack_weight_gram > 0),
  pack_price integer not null default 0 check (pack_price >= 0),
  estimated_pcs_per_pack numeric(14,4) check (estimated_pcs_per_pack is null or estimated_pcs_per_pack > 0),
  estimated_pcs_per_pack_rounded integer check (estimated_pcs_per_pack_rounded is null or estimated_pcs_per_pack_rounded > 0),
  actual_counted_pcs_per_pack numeric(14,4) check (actual_counted_pcs_per_pack is null or actual_counted_pcs_per_pack > 0),
  estimation_status public.estimation_status not null default 'formula_estimated',
  cost_per_usage_unit numeric(14,4) not null default 0 check (cost_per_usage_unit >= 0),
  stock_quantity numeric(14,4) not null default 0,
  usage_unit public.unit_type not null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, material_id, name),
  unique (owner_id, sku)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sku text not null,
  category text not null default 'Flower',
  selling_price integer not null default 0 check (selling_price >= 0),
  labor_minutes numeric(10,2) not null default 0 check (labor_minutes >= 0),
  labor_rate_per_hour integer not null default 0 check (labor_rate_per_hour >= 0),
  packaging_cost integer not null default 0 check (packaging_cost >= 0),
  overhead_cost integer not null default 0 check (overhead_cost >= 0),
  target_margin numeric(5,4) not null default 0.45 check (target_margin >= 0 and target_margin <= 1),
  current_stock numeric(14,4) not null default 0,
  reserved_stock numeric(14,4) not null default 0 check (reserved_stock >= 0),
  average_unit_manufacturing_cost numeric(14,4) not null default 0 check (average_unit_manufacturing_cost >= 0),
  last_production_cost numeric(14,4) not null default 0 check (last_production_cost >= 0),
  active boolean not null default true,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, sku)
);

create table public.product_bom_lines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  material_variant_id uuid not null references public.material_variants(id) on delete restrict,
  quantity_required numeric(14,4) not null check (quantity_required > 0),
  usage_unit public.unit_type not null,
  waste_percentage numeric(7,4) not null default 0 check (waste_percentage >= 0),
  unit_cost_snapshot numeric(14,4) check (unit_cost_snapshot is null or unit_cost_snapshot >= 0),
  optional boolean not null default false,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  subtotal integer not null default 0 check (subtotal >= 0),
  shipping_cost integer not null default 0 check (shipping_cost >= 0),
  discount integer not null default 0 check (discount >= 0),
  effective_total integer not null default 0 check (effective_total >= 0),
  receipt_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_lines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  material_variant_id uuid not null references public.material_variants(id) on delete restrict,
  quantity_purchased numeric(14,4) not null check (quantity_purchased > 0),
  purchase_unit public.unit_type not null,
  pack_size numeric(14,4) check (pack_size is null or pack_size > 0),
  total_price integer not null check (total_price >= 0),
  shipping_allocation integer not null default 0 check (shipping_allocation >= 0),
  discount_allocation integer not null default 0 check (discount_allocation >= 0),
  effective_cost integer not null check (effective_cost >= 0),
  quantity_added_usage_unit numeric(14,4) not null check (quantity_added_usage_unit > 0),
  cost_per_usage_unit numeric(14,4) not null check (cost_per_usage_unit >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table public.production_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_made numeric(14,4) not null check (quantity_made > 0),
  date date not null default current_date,
  unit_manufacturing_cost numeric(14,4) not null check (unit_manufacturing_cost >= 0),
  total_manufacturing_cost numeric(14,4) not null check (total_manufacturing_cost >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.production_batch_lines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  production_batch_id uuid not null references public.production_batches(id) on delete cascade,
  material_variant_id uuid not null references public.material_variants(id) on delete restrict,
  quantity_consumed numeric(14,4) not null check (quantity_consumed >= 0),
  unit_cost numeric(14,4) not null check (unit_cost >= 0),
  total_cost numeric(14,4) not null check (total_cost >= 0),
  usage_unit public.unit_type not null,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  order_number text not null,
  order_date date not null default current_date,
  customer_name text not null,
  platform public.sales_platform not null default 'Other',
  status public.order_status not null default 'draft',
  payment_status public.payment_status not null default 'unpaid',
  fulfillment_status public.fulfillment_status not null default 'unfulfilled',
  subtotal integer not null default 0 check (subtotal >= 0),
  discount integer not null default 0 check (discount >= 0),
  shipping_fee_charged integer not null default 0 check (shipping_fee_charged >= 0),
  shipping_cost_paid integer not null default 0 check (shipping_cost_paid >= 0),
  platform_fee integer not null default 0 check (platform_fee >= 0),
  packaging_cost integer not null default 0 check (packaging_cost >= 0),
  net_revenue integer not null default 0,
  cogs numeric(14,4) not null default 0 check (cogs >= 0),
  gross_profit numeric(14,4) not null default 0,
  net_profit numeric(14,4) not null default 0,
  stock_deducted boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, order_number)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  unit_selling_price integer not null check (unit_selling_price >= 0),
  discount_allocated integer not null default 0 check (discount_allocated >= 0),
  unit_cost numeric(14,4) not null default 0 check (unit_cost >= 0),
  line_revenue integer not null default 0,
  line_cogs numeric(14,4) not null default 0 check (line_cogs >= 0),
  line_gross_profit numeric(14,4) not null default 0,
  line_margin numeric(8,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_fee_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  platform public.sales_platform not null,
  fee_rate numeric(5,4) not null default 0 check (fee_rate >= 0 and fee_rate <= 1),
  fixed_fee integer not null default 0 check (fixed_fee >= 0),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, platform)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.material_price_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  material_variant_id uuid not null references public.material_variants(id) on delete cascade,
  purchase_line_id uuid references public.purchase_lines(id) on delete set null,
  observed_at date not null default current_date,
  pack_price integer not null check (pack_price >= 0),
  cost_per_usage_unit numeric(14,4) not null check (cost_per_usage_unit >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_type public.inventory_item_type not null,
  item_id uuid not null,
  adjustment_quantity numeric(14,4) not null,
  unit public.unit_type not null,
  reason text not null,
  movement_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  item_type public.inventory_item_type not null,
  item_id uuid not null,
  movement_type public.inventory_movement_type not null,
  quantity_in numeric(14,4) not null default 0 check (quantity_in >= 0),
  quantity_out numeric(14,4) not null default 0 check (quantity_out >= 0),
  unit public.unit_type not null,
  unit_cost numeric(14,4) not null default 0 check (unit_cost >= 0),
  total_value numeric(14,4) not null default 0 check (total_value >= 0),
  reference_type text not null,
  reference_id uuid not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((quantity_in > 0 and quantity_out = 0) or (quantity_out > 0 and quantity_in = 0))
);

alter table public.stock_adjustments
  add constraint stock_adjustments_movement_id_fkey
  foreign key (movement_id) references public.inventory_movements(id) on delete set null;

create trigger settings_touch_updated_at before update on public.settings for each row execute function public.touch_updated_at();
create trigger suppliers_touch_updated_at before update on public.suppliers for each row execute function public.touch_updated_at();
create trigger materials_touch_updated_at before update on public.materials for each row execute function public.touch_updated_at();
create trigger material_variants_touch_updated_at before update on public.material_variants for each row execute function public.touch_updated_at();
create trigger products_touch_updated_at before update on public.products for each row execute function public.touch_updated_at();
create trigger product_bom_lines_touch_updated_at before update on public.product_bom_lines for each row execute function public.touch_updated_at();
create trigger purchases_touch_updated_at before update on public.purchases for each row execute function public.touch_updated_at();
create trigger production_batches_touch_updated_at before update on public.production_batches for each row execute function public.touch_updated_at();
create trigger orders_touch_updated_at before update on public.orders for each row execute function public.touch_updated_at();
create trigger order_items_touch_updated_at before update on public.order_items for each row execute function public.touch_updated_at();
create trigger platform_fee_rules_touch_updated_at before update on public.platform_fee_rules for each row execute function public.touch_updated_at();

create or replace function public.prevent_inventory_movement_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Inventory movements are immutable. Create a reversing movement instead.';
end;
$$;

create trigger inventory_movements_prevent_update before update on public.inventory_movements for each row execute function public.prevent_inventory_movement_changes();
create trigger inventory_movements_prevent_delete before delete on public.inventory_movements for each row execute function public.prevent_inventory_movement_changes();

create index settings_owner_idx on public.settings(owner_id);
create index suppliers_owner_idx on public.suppliers(owner_id);
create index materials_owner_category_idx on public.materials(owner_id, category);
create index materials_low_stock_idx on public.materials(owner_id, min_stock, target_stock);
create index material_variants_owner_material_idx on public.material_variants(owner_id, material_id);
create index material_variants_stock_idx on public.material_variants(owner_id, stock_quantity);
create index products_owner_active_idx on public.products(owner_id, active);
create index products_stock_idx on public.products(owner_id, current_stock, reserved_stock);
create index product_bom_lines_product_idx on public.product_bom_lines(owner_id, product_id);
create index product_bom_lines_variant_idx on public.product_bom_lines(owner_id, material_variant_id);
create index purchases_owner_date_idx on public.purchases(owner_id, date desc);
create index purchase_lines_variant_idx on public.purchase_lines(owner_id, material_variant_id);
create index production_batches_owner_date_idx on public.production_batches(owner_id, date desc);
create index production_batch_lines_batch_idx on public.production_batch_lines(owner_id, production_batch_id);
create index inventory_movements_owner_time_idx on public.inventory_movements(owner_id, occurred_at desc);
create index inventory_movements_reference_idx on public.inventory_movements(owner_id, reference_type, reference_id);
create index inventory_movements_item_idx on public.inventory_movements(owner_id, item_type, item_id);
create index orders_owner_date_idx on public.orders(owner_id, order_date desc);
create index orders_owner_status_idx on public.orders(owner_id, status, fulfillment_status);
create index order_items_order_idx on public.order_items(owner_id, order_id);
create index order_items_product_idx on public.order_items(owner_id, product_id);
create index material_price_history_variant_idx on public.material_price_history(owner_id, material_variant_id, observed_at desc);

create or replace function public.recommended_price(
  p_total_cost numeric,
  p_target_margin numeric,
  p_platform_fee_rate numeric
)
returns numeric
language plpgsql
immutable
as $$
declare
  denominator numeric;
begin
  if p_target_margin < 0 or p_target_margin >= 1 then
    raise exception 'Target margin must be between 0 and 1';
  end if;

  if p_platform_fee_rate < 0 or p_platform_fee_rate >= 1 then
    raise exception 'Platform fee rate must be between 0 and 1';
  end if;

  denominator := 1 - p_target_margin - p_platform_fee_rate;
  if denominator <= 0 then
    raise exception 'Recommended price denominator must be greater than 0';
  end if;

  return p_total_cost / denominator;
end;
$$;

create or replace function public.create_stock_adjustment(
  p_item_type public.inventory_item_type,
  p_item_id uuid,
  p_delta_quantity numeric,
  p_unit public.unit_type,
  p_unit_cost numeric,
  p_reason text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_allow_negative boolean;
  v_new_stock numeric;
  v_adjustment_id uuid;
  v_movement_id uuid;
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;

  select allow_negative_stock into v_allow_negative from public.settings where owner_id = v_owner;
  v_allow_negative := coalesce(v_allow_negative, false);

  if p_delta_quantity = 0 then
    raise exception 'Adjustment quantity cannot be zero';
  end if;

  if p_item_type = 'raw_material' then
    update public.material_variants
    set stock_quantity = stock_quantity + p_delta_quantity
    where id = p_item_id and owner_id = v_owner
    returning stock_quantity into v_new_stock;
  else
    update public.products
    set current_stock = current_stock + p_delta_quantity
    where id = p_item_id and owner_id = v_owner
    returning current_stock into v_new_stock;
  end if;

  if v_new_stock is null then
    raise exception 'Item not found';
  end if;

  if v_new_stock < 0 and not v_allow_negative then
    raise exception 'Negative stock is disabled';
  end if;

  insert into public.inventory_movements (
    owner_id, item_type, item_id, movement_type, quantity_in, quantity_out, unit,
    unit_cost, total_value, reference_type, reference_id, notes, created_by
  )
  values (
    v_owner,
    p_item_type,
    p_item_id,
    'manual_adjustment',
    greatest(p_delta_quantity, 0),
    greatest(-p_delta_quantity, 0),
    p_unit,
    p_unit_cost,
    abs(p_delta_quantity * p_unit_cost),
    'stock_adjustment',
    gen_random_uuid(),
    p_notes,
    v_owner
  )
  returning id, reference_id into v_movement_id, v_adjustment_id;

  insert into public.stock_adjustments (
    id, owner_id, item_type, item_id, adjustment_quantity, unit, reason, movement_id, notes
  )
  values (
    v_adjustment_id, v_owner, p_item_type, p_item_id, p_delta_quantity, p_unit, p_reason, v_movement_id, p_notes
  );

  return v_adjustment_id;
end;
$$;

create or replace function public.create_production_batch(
  p_product_id uuid,
  p_quantity_made numeric,
  p_date date default current_date,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_allow_negative boolean;
  v_product public.products%rowtype;
  v_line record;
  v_batch_id uuid;
  v_unit_cost numeric := 0;
  v_required numeric;
  v_available numeric;
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;

  if p_quantity_made <= 0 then
    raise exception 'Production quantity must be greater than 0';
  end if;

  select * into v_product from public.products where id = p_product_id and owner_id = v_owner;
  if v_product.id is null then
    raise exception 'Product not found';
  end if;

  if not exists (select 1 from public.product_bom_lines where product_id = p_product_id and owner_id = v_owner and active) then
    raise exception 'Product cannot be produced because BOM is empty';
  end if;

  select coalesce(allow_negative_stock, false) into v_allow_negative from public.settings where owner_id = v_owner;

  for v_line in
    select bl.*, mv.stock_quantity, mv.cost_per_usage_unit, mv.usage_unit as variant_unit
    from public.product_bom_lines bl
    join public.material_variants mv on mv.id = bl.material_variant_id and mv.owner_id = bl.owner_id
    where bl.product_id = p_product_id and bl.owner_id = v_owner and bl.active
  loop
    v_required := v_line.quantity_required * (1 + v_line.waste_percentage) * p_quantity_made;
    v_available := v_line.stock_quantity;

    if v_available < v_required and not v_allow_negative then
      raise exception 'Insufficient stock for material variant %', v_line.material_variant_id;
    end if;

    v_unit_cost := v_unit_cost + (v_line.quantity_required * (1 + v_line.waste_percentage) * coalesce(v_line.unit_cost_snapshot, v_line.cost_per_usage_unit));
  end loop;

  v_unit_cost := v_unit_cost
    + ((v_product.labor_minutes / 60) * v_product.labor_rate_per_hour)
    + v_product.packaging_cost
    + v_product.overhead_cost;

  insert into public.production_batches (
    owner_id, product_id, quantity_made, date, unit_manufacturing_cost, total_manufacturing_cost, notes
  )
  values (
    v_owner, p_product_id, p_quantity_made, p_date, v_unit_cost, v_unit_cost * p_quantity_made, p_notes
  )
  returning id into v_batch_id;

  for v_line in
    select bl.*, mv.cost_per_usage_unit, mv.usage_unit as variant_unit
    from public.product_bom_lines bl
    join public.material_variants mv on mv.id = bl.material_variant_id and mv.owner_id = bl.owner_id
    where bl.product_id = p_product_id and bl.owner_id = v_owner and bl.active
  loop
    v_required := v_line.quantity_required * (1 + v_line.waste_percentage) * p_quantity_made;

    update public.material_variants
    set stock_quantity = stock_quantity - v_required
    where id = v_line.material_variant_id and owner_id = v_owner;

    insert into public.production_batch_lines (
      owner_id, production_batch_id, material_variant_id, quantity_consumed, unit_cost, total_cost, usage_unit
    )
    values (
      v_owner, v_batch_id, v_line.material_variant_id, v_required, v_line.cost_per_usage_unit,
      v_required * v_line.cost_per_usage_unit, v_line.variant_unit
    );

    insert into public.inventory_movements (
      owner_id, item_type, item_id, movement_type, quantity_out, unit, unit_cost,
      total_value, reference_type, reference_id, notes, created_by
    )
    values (
      v_owner, 'raw_material', v_line.material_variant_id, 'production_consumption',
      v_required, v_line.variant_unit, v_line.cost_per_usage_unit,
      v_required * v_line.cost_per_usage_unit, 'production_batch', v_batch_id, p_notes, v_owner
    );
  end loop;

  update public.products
  set current_stock = current_stock + p_quantity_made,
      last_production_cost = v_unit_cost,
      average_unit_manufacturing_cost = v_unit_cost
  where id = p_product_id and owner_id = v_owner;

  insert into public.inventory_movements (
    owner_id, item_type, item_id, movement_type, quantity_in, unit, unit_cost,
    total_value, reference_type, reference_id, notes, created_by
  )
  values (
    v_owner, 'finished_good', p_product_id, 'production_output', p_quantity_made,
    'pcs', v_unit_cost, v_unit_cost * p_quantity_made, 'production_batch', v_batch_id, p_notes, v_owner
  );

  return v_batch_id;
end;
$$;

create or replace function public.record_purchase(
  p_supplier_id uuid,
  p_date date,
  p_shipping_cost integer,
  p_discount integer,
  p_lines jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_purchase_id uuid;
  v_line jsonb;
  v_subtotal integer := 0;
  v_effective_total integer;
  v_line_id uuid;
  v_variant_id uuid;
  v_total_price integer;
  v_quantity_purchased numeric;
  v_quantity_added numeric;
  v_shipping_allocation integer;
  v_discount_allocation integer;
  v_effective_cost integer;
  v_cost_per_usage_unit numeric;
  v_purchase_unit public.unit_type;
  v_usage_unit public.unit_type;
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_array_length(p_lines) = 0 then
    raise exception 'Purchase must include at least one line';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_subtotal := v_subtotal + (v_line->>'total_price')::integer;
  end loop;

  v_effective_total := v_subtotal + p_shipping_cost - p_discount;

  insert into public.purchases (
    owner_id, date, supplier_id, subtotal, shipping_cost, discount, effective_total, notes
  )
  values (
    v_owner, coalesce(p_date, current_date), p_supplier_id, v_subtotal,
    p_shipping_cost, p_discount, v_effective_total, p_notes
  )
  returning id into v_purchase_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_variant_id := (v_line->>'material_variant_id')::uuid;
    v_quantity_purchased := (v_line->>'quantity_purchased')::numeric;
    v_quantity_added := (v_line->>'quantity_added_usage_unit')::numeric;
    v_total_price := (v_line->>'total_price')::integer;
    v_shipping_allocation := coalesce((v_line->>'shipping_allocation')::integer, 0);
    v_discount_allocation := coalesce((v_line->>'discount_allocation')::integer, 0);
    v_purchase_unit := (v_line->>'purchase_unit')::public.unit_type;
    v_effective_cost := v_total_price + v_shipping_allocation - v_discount_allocation;
    v_cost_per_usage_unit := v_effective_cost / v_quantity_added;

    select usage_unit into v_usage_unit from public.material_variants where id = v_variant_id and owner_id = v_owner;
    if v_usage_unit is null then
      raise exception 'Material variant not found';
    end if;

    insert into public.purchase_lines (
      owner_id, purchase_id, material_variant_id, quantity_purchased, purchase_unit,
      pack_size, total_price, shipping_allocation, discount_allocation,
      effective_cost, quantity_added_usage_unit, cost_per_usage_unit, notes
    )
    values (
      v_owner, v_purchase_id, v_variant_id, v_quantity_purchased, v_purchase_unit,
      nullif(v_line->>'pack_size', '')::numeric, v_total_price, v_shipping_allocation,
      v_discount_allocation, v_effective_cost, v_quantity_added, v_cost_per_usage_unit,
      v_line->>'notes'
    )
    returning id into v_line_id;

    update public.material_variants
    set stock_quantity = stock_quantity + v_quantity_added,
        pack_price = round(v_total_price / v_quantity_purchased),
        cost_per_usage_unit = v_cost_per_usage_unit
    where id = v_variant_id and owner_id = v_owner;

    insert into public.inventory_movements (
      owner_id, item_type, item_id, movement_type, quantity_in, unit, unit_cost,
      total_value, reference_type, reference_id, notes, created_by
    )
    values (
      v_owner, 'raw_material', v_variant_id, 'purchase', v_quantity_added, v_usage_unit,
      v_cost_per_usage_unit, v_effective_cost, 'purchase', v_purchase_id, p_notes, v_owner
    );

    insert into public.material_price_history (
      owner_id, supplier_id, material_variant_id, purchase_line_id, observed_at,
      pack_price, cost_per_usage_unit, notes
    )
    values (
      v_owner, p_supplier_id, v_variant_id, v_line_id, coalesce(p_date, current_date),
      round(v_total_price / v_quantity_purchased), v_cost_per_usage_unit, v_line->>'notes'
    );
  end loop;

  return v_purchase_id;
end;
$$;

create or replace function public.fulfill_order(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_order public.orders%rowtype;
  v_line record;
  v_allow_negative boolean;
  v_unit_cost numeric;
  v_subtotal integer := 0;
  v_cogs numeric := 0;
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;

  select * into v_order from public.orders where id = p_order_id and owner_id = v_owner for update;
  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if v_order.stock_deducted then
    raise exception 'Order stock has already been deducted';
  end if;

  select coalesce(allow_negative_stock, false) into v_allow_negative from public.settings where owner_id = v_owner;

  for v_line in
    select oi.*, p.current_stock, p.average_unit_manufacturing_cost, p.last_production_cost
    from public.order_items oi
    join public.products p on p.id = oi.product_id and p.owner_id = oi.owner_id
    where oi.order_id = p_order_id and oi.owner_id = v_owner
  loop
    if v_line.current_stock < v_line.quantity and not v_allow_negative then
      raise exception 'Insufficient finished goods stock for product %', v_line.product_id;
    end if;

    v_unit_cost := coalesce(nullif(v_line.average_unit_manufacturing_cost, 0), v_line.last_production_cost, 0);
    v_subtotal := v_subtotal + ((v_line.quantity * v_line.unit_selling_price)::integer - v_line.discount_allocated);
    v_cogs := v_cogs + (v_line.quantity * v_unit_cost);

    update public.products
    set current_stock = current_stock - v_line.quantity,
        reserved_stock = greatest(0, reserved_stock - v_line.quantity)
    where id = v_line.product_id and owner_id = v_owner;

    update public.order_items
    set unit_cost = v_unit_cost,
        line_revenue = (v_line.quantity * v_line.unit_selling_price)::integer - v_line.discount_allocated,
        line_cogs = v_line.quantity * v_unit_cost,
        line_gross_profit = ((v_line.quantity * v_line.unit_selling_price)::integer - v_line.discount_allocated) - (v_line.quantity * v_unit_cost),
        line_margin = case
          when ((v_line.quantity * v_line.unit_selling_price)::integer - v_line.discount_allocated) > 0
          then (((v_line.quantity * v_line.unit_selling_price)::integer - v_line.discount_allocated) - (v_line.quantity * v_unit_cost))
            / ((v_line.quantity * v_line.unit_selling_price)::integer - v_line.discount_allocated)
          else 0
        end
    where id = v_line.id and owner_id = v_owner;

    insert into public.inventory_movements (
      owner_id, item_type, item_id, movement_type, quantity_out, unit, unit_cost,
      total_value, reference_type, reference_id, notes, created_by
    )
    values (
      v_owner, 'finished_good', v_line.product_id, 'sale', v_line.quantity, 'pcs',
      v_unit_cost, v_line.quantity * v_unit_cost, 'order', p_order_id, v_order.order_number, v_owner
    );
  end loop;

  update public.orders
  set status = case when status = 'confirmed' then 'packed' else status end,
      fulfillment_status = 'fulfilled',
      subtotal = v_subtotal,
      cogs = v_cogs,
      gross_profit = v_subtotal - v_cogs,
      net_revenue = v_subtotal - discount - platform_fee + shipping_fee_charged,
      net_profit = (v_subtotal - discount - platform_fee + shipping_fee_charged) - v_cogs - shipping_cost_paid - packaging_cost,
      stock_deducted = true
  where id = p_order_id and owner_id = v_owner;

  return p_order_id;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'settings',
    'suppliers',
    'materials',
    'material_variants',
    'products',
    'product_bom_lines',
    'purchases',
    'purchase_lines',
    'production_batches',
    'production_batch_lines',
    'orders',
    'order_items',
    'platform_fee_rules',
    'product_images',
    'material_price_history',
    'stock_adjustments',
    'inventory_movements'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I_select on public.%I for select using (owner_id = auth.uid())', t || '_owner', t);
    execute format('create policy %I_insert on public.%I for insert with check (owner_id = auth.uid())', t || '_owner', t);
    execute format('create policy %I_update on public.%I for update using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t || '_owner', t);
    execute format('create policy %I_delete on public.%I for delete using (owner_id = auth.uid())', t || '_owner', t);
  end loop;
end;
$$;

revoke all on function public.create_stock_adjustment(public.inventory_item_type, uuid, numeric, public.unit_type, numeric, text, text) from public;
revoke all on function public.create_production_batch(uuid, numeric, date, text) from public;
revoke all on function public.record_purchase(uuid, date, integer, integer, jsonb, text) from public;
revoke all on function public.fulfill_order(uuid) from public;

grant execute on function public.create_stock_adjustment(public.inventory_item_type, uuid, numeric, public.unit_type, numeric, text, text) to authenticated;
grant execute on function public.create_production_batch(uuid, numeric, date, text) to authenticated;
grant execute on function public.record_purchase(uuid, date, integer, integer, jsonb, text) to authenticated;
grant execute on function public.fulfill_order(uuid) to authenticated;
