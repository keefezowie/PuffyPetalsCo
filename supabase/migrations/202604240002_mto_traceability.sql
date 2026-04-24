do $$
begin
  if not exists (select 1 from pg_type where typname = 'production_batch_status') then
    create type public.production_batch_status as enum ('planned', 'in_progress', 'completed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'purchase_list_status') then
    create type public.purchase_list_status as enum ('draft', 'ordered', 'received', 'cancelled');
  end if;
end;
$$;

alter table public.production_batches
  add column if not exists status public.production_batch_status not null default 'completed',
  add column if not exists source_order_id uuid references public.orders(id) on delete set null,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references auth.users(id) on delete set null;

update public.production_batches
set status = 'completed',
    completed_at = coalesce(completed_at, created_at)
where status is null or status = 'completed';

create table if not exists public.production_batch_order_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  production_batch_id uuid not null references public.production_batches(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_planned numeric(14,4) not null check (quantity_planned > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  production_batch_id uuid not null references public.production_batches(id) on delete cascade,
  status public.purchase_list_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_list_lines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  purchase_list_id uuid not null references public.purchase_lists(id) on delete cascade,
  material_variant_id uuid not null references public.material_variants(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  required_quantity numeric(14,4) not null check (required_quantity >= 0),
  available_quantity numeric(14,4) not null check (available_quantity >= 0),
  shortage_quantity numeric(14,4) not null check (shortage_quantity >= 0),
  recommended_purchase_quantity numeric(14,4) not null check (recommended_purchase_quantity >= 0),
  purchase_unit public.unit_type not null,
  usage_unit public.unit_type not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.purchases
  add column if not exists purchase_list_id uuid references public.purchase_lists(id) on delete set null;

create trigger purchase_lists_touch_updated_at
  before update on public.purchase_lists
  for each row execute function public.touch_updated_at();

create index if not exists production_batches_source_order_idx on public.production_batches(owner_id, source_order_id);
create index if not exists production_batches_status_idx on public.production_batches(owner_id, status);
create index if not exists production_batch_order_links_order_idx on public.production_batch_order_links(owner_id, order_id);
create index if not exists production_batch_order_links_batch_idx on public.production_batch_order_links(owner_id, production_batch_id);
create index if not exists purchase_lists_batch_idx on public.purchase_lists(owner_id, production_batch_id);
create index if not exists purchase_list_lines_list_idx on public.purchase_list_lines(owner_id, purchase_list_id);
create index if not exists purchases_purchase_list_idx on public.purchases(owner_id, purchase_list_id);

alter table public.production_batch_order_links enable row level security;
alter table public.purchase_lists enable row level security;
alter table public.purchase_list_lines enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['production_batch_order_links', 'purchase_lists', 'purchase_list_lines']
  loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_owner_select') then
      execute format('create policy %I on public.%I for select using (owner_id = auth.uid())', t || '_owner_select', t);
      execute format('create policy %I on public.%I for insert with check (owner_id = auth.uid())', t || '_owner_insert', t);
      execute format('create policy %I on public.%I for update using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t || '_owner_update', t);
      execute format('create policy %I on public.%I for delete using (owner_id = auth.uid())', t || '_owner_delete', t);
    end if;
  end loop;
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
    owner_id, product_id, quantity_made, date, status, unit_manufacturing_cost,
    total_manufacturing_cost, notes, completed_at, completed_by
  )
  values (
    v_owner, p_product_id, p_quantity_made, p_date, 'completed', v_unit_cost,
    v_unit_cost * p_quantity_made, p_notes, now(), v_owner
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

create or replace function public.plan_production_from_order(
  p_order_id uuid,
  p_mode text,
  p_date date default current_date,
  p_notes text default null
)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_row record;
  v_item record;
  v_product public.products%rowtype;
  v_batch_id uuid;
  v_unit_cost numeric;
  v_target numeric;
  v_open numeric;
  v_quantity numeric;
  v_remaining numeric;
  v_link_quantity numeric;
  v_batch_ids uuid[] := array[]::uuid[];
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;

  if p_mode not in ('shortage', 'full') then
    raise exception 'Production planning mode must be shortage or full';
  end if;

  if not exists (select 1 from public.orders where id = p_order_id and owner_id = v_owner) then
    raise exception 'Order not found';
  end if;

  for v_row in
    select oi.product_id, sum(oi.quantity) as ordered_quantity
    from public.order_items oi
    where oi.order_id = p_order_id and oi.owner_id = v_owner
    group by oi.product_id
  loop
    select * into v_product from public.products where id = v_row.product_id and owner_id = v_owner;
    v_target := case
      when p_mode = 'full' then v_row.ordered_quantity
      else greatest(0, v_row.ordered_quantity - v_product.current_stock)
    end;

    select coalesce(sum(link.quantity_planned), 0) into v_open
    from public.production_batch_order_links link
    join public.production_batches batch on batch.id = link.production_batch_id
    where link.owner_id = v_owner
      and link.order_id = p_order_id
      and link.product_id = v_row.product_id
      and batch.status in ('planned', 'in_progress');

    v_quantity := greatest(0, v_target - v_open);

    if v_quantity > 0 then
      select coalesce(sum(bl.quantity_required * (1 + bl.waste_percentage) * coalesce(bl.unit_cost_snapshot, mv.cost_per_usage_unit)), 0)
        + ((v_product.labor_minutes / 60) * v_product.labor_rate_per_hour)
        + v_product.packaging_cost
        + v_product.overhead_cost
      into v_unit_cost
      from public.product_bom_lines bl
      join public.material_variants mv on mv.id = bl.material_variant_id and mv.owner_id = bl.owner_id
      where bl.product_id = v_row.product_id and bl.owner_id = v_owner and bl.active;

      insert into public.production_batches (
        owner_id, product_id, quantity_made, date, status, source_order_id,
        unit_manufacturing_cost, total_manufacturing_cost, notes
      )
      values (
        v_owner, v_row.product_id, v_quantity, coalesce(p_date, current_date), 'planned', p_order_id,
        v_unit_cost, v_unit_cost * v_quantity, p_notes
      )
      returning id into v_batch_id;

      v_batch_ids := array_append(v_batch_ids, v_batch_id);
      v_remaining := v_quantity;

      for v_item in
        select * from public.order_items
        where order_id = p_order_id and owner_id = v_owner and product_id = v_row.product_id
        order by created_at asc
      loop
        exit when v_remaining <= 0;
        v_link_quantity := least(v_item.quantity, v_remaining);
        v_remaining := v_remaining - v_link_quantity;

        insert into public.production_batch_order_links (
          owner_id, production_batch_id, order_id, order_item_id, product_id, quantity_planned
        )
        values (
          v_owner, v_batch_id, p_order_id, v_item.id, v_row.product_id, v_link_quantity
        );
      end loop;
    end if;
  end loop;

  if array_length(v_batch_ids, 1) is null then
    raise exception 'No production is required for this order';
  end if;

  update public.orders
  set status = case when status in ('draft', 'confirmed') then 'in_production' else status end
  where id = p_order_id and owner_id = v_owner;

  return v_batch_ids;
end;
$$;

create or replace function public.complete_production_batch(
  p_production_batch_id uuid,
  p_date date default null,
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
  v_batch public.production_batches%rowtype;
  v_product public.products%rowtype;
  v_line record;
  v_unit_cost numeric := 0;
  v_required numeric;
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;

  select * into v_batch from public.production_batches
  where id = p_production_batch_id and owner_id = v_owner
  for update;

  if v_batch.id is null then
    raise exception 'Production batch not found';
  end if;

  if v_batch.status = 'completed' then
    raise exception 'Production batch is already completed';
  end if;

  if v_batch.status = 'cancelled' then
    raise exception 'Cancelled production batches cannot be completed';
  end if;

  select * into v_product from public.products where id = v_batch.product_id and owner_id = v_owner;
  select coalesce(allow_negative_stock, false) into v_allow_negative from public.settings where owner_id = v_owner;

  for v_line in
    select bl.*, mv.stock_quantity, mv.cost_per_usage_unit, mv.usage_unit as variant_unit
    from public.product_bom_lines bl
    join public.material_variants mv on mv.id = bl.material_variant_id and mv.owner_id = bl.owner_id
    where bl.product_id = v_batch.product_id and bl.owner_id = v_owner and bl.active
  loop
    v_required := v_line.quantity_required * (1 + v_line.waste_percentage) * v_batch.quantity_made;

    if v_line.stock_quantity < v_required and not v_allow_negative then
      raise exception 'Insufficient stock for material variant %', v_line.material_variant_id;
    end if;

    v_unit_cost := v_unit_cost + (v_line.quantity_required * (1 + v_line.waste_percentage) * coalesce(v_line.unit_cost_snapshot, v_line.cost_per_usage_unit));
  end loop;

  v_unit_cost := v_unit_cost
    + ((v_product.labor_minutes / 60) * v_product.labor_rate_per_hour)
    + v_product.packaging_cost
    + v_product.overhead_cost;

  for v_line in
    select bl.*, mv.cost_per_usage_unit, mv.usage_unit as variant_unit
    from public.product_bom_lines bl
    join public.material_variants mv on mv.id = bl.material_variant_id and mv.owner_id = bl.owner_id
    where bl.product_id = v_batch.product_id and bl.owner_id = v_owner and bl.active
  loop
    v_required := v_line.quantity_required * (1 + v_line.waste_percentage) * v_batch.quantity_made;

    update public.material_variants
    set stock_quantity = stock_quantity - v_required
    where id = v_line.material_variant_id and owner_id = v_owner;

    insert into public.production_batch_lines (
      owner_id, production_batch_id, material_variant_id, quantity_consumed, unit_cost, total_cost, usage_unit
    )
    values (
      v_owner, v_batch.id, v_line.material_variant_id, v_required, v_line.cost_per_usage_unit,
      v_required * v_line.cost_per_usage_unit, v_line.variant_unit
    );

    insert into public.inventory_movements (
      owner_id, item_type, item_id, movement_type, quantity_out, unit, unit_cost,
      total_value, reference_type, reference_id, notes, created_by
    )
    values (
      v_owner, 'raw_material', v_line.material_variant_id, 'production_consumption',
      v_required, v_line.variant_unit, v_line.cost_per_usage_unit,
      v_required * v_line.cost_per_usage_unit, 'production_batch', v_batch.id,
      coalesce(p_notes, v_batch.notes), v_owner
    );
  end loop;

  update public.products
  set current_stock = current_stock + v_batch.quantity_made,
      last_production_cost = v_unit_cost,
      average_unit_manufacturing_cost = v_unit_cost
  where id = v_batch.product_id and owner_id = v_owner;

  insert into public.inventory_movements (
    owner_id, item_type, item_id, movement_type, quantity_in, unit, unit_cost,
    total_value, reference_type, reference_id, notes, created_by
  )
  values (
    v_owner, 'finished_good', v_batch.product_id, 'production_output', v_batch.quantity_made,
    'pcs', v_unit_cost, v_unit_cost * v_batch.quantity_made, 'production_batch',
    v_batch.id, coalesce(p_notes, v_batch.notes), v_owner
  );

  update public.production_batches
  set status = 'completed',
      date = coalesce(p_date, date),
      unit_manufacturing_cost = v_unit_cost,
      total_manufacturing_cost = v_unit_cost * quantity_made,
      notes = coalesce(p_notes, notes),
      completed_at = now(),
      completed_by = v_owner
  where id = v_batch.id and owner_id = v_owner;

  return v_batch.id;
end;
$$;

create or replace function public.create_purchase_list_from_batch(
  p_production_batch_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_batch public.production_batches%rowtype;
  v_line record;
  v_list_id uuid;
  v_required numeric;
  v_shortage numeric;
  v_count integer := 0;
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;

  select * into v_batch from public.production_batches
  where id = p_production_batch_id and owner_id = v_owner;

  if v_batch.id is null then
    raise exception 'Production batch not found';
  end if;

  insert into public.purchase_lists (owner_id, production_batch_id, status, notes)
  values (v_owner, v_batch.id, 'draft', p_notes)
  returning id into v_list_id;

  for v_line in
    select bl.material_variant_id, bl.quantity_required, bl.waste_percentage,
           mv.stock_quantity, mv.usage_unit, m.purchase_unit, m.preferred_supplier_id
    from public.product_bom_lines bl
    join public.material_variants mv on mv.id = bl.material_variant_id and mv.owner_id = bl.owner_id
    join public.materials m on m.id = mv.material_id and m.owner_id = mv.owner_id
    where bl.product_id = v_batch.product_id and bl.owner_id = v_owner and bl.active
  loop
    v_required := v_line.quantity_required * (1 + v_line.waste_percentage) * v_batch.quantity_made;
    v_shortage := greatest(0, v_required - v_line.stock_quantity);

    if v_shortage > 0 then
      v_count := v_count + 1;
      insert into public.purchase_list_lines (
        owner_id, purchase_list_id, material_variant_id, supplier_id,
        required_quantity, available_quantity, shortage_quantity, recommended_purchase_quantity,
        purchase_unit, usage_unit, notes
      )
      values (
        v_owner, v_list_id, v_line.material_variant_id, v_line.preferred_supplier_id,
        v_required, v_line.stock_quantity, v_shortage, v_shortage,
        v_line.purchase_unit, v_line.usage_unit,
        case when v_line.preferred_supplier_id is null then 'No preferred supplier assigned.' else null end
      );
    end if;
  end loop;

  if v_count = 0 then
    delete from public.purchase_lists where id = v_list_id and owner_id = v_owner;
    raise exception 'No material shortages were found for this batch';
  end if;

  return v_list_id;
end;
$$;

drop function if exists public.record_purchase(uuid, date, integer, integer, jsonb, text);

create or replace function public.record_purchase(
  p_supplier_id uuid,
  p_date date,
  p_shipping_cost integer,
  p_discount integer,
  p_lines jsonb,
  p_purchase_list_id uuid default null,
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
    owner_id, date, supplier_id, purchase_list_id, subtotal, shipping_cost, discount, effective_total, notes
  )
  values (
    v_owner, coalesce(p_date, current_date), p_supplier_id, p_purchase_list_id, v_subtotal,
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

  if p_purchase_list_id is not null then
    update public.purchase_lists
    set status = 'received'
    where id = p_purchase_list_id and owner_id = v_owner;
  end if;

  return v_purchase_id;
end;
$$;

revoke all on function public.plan_production_from_order(uuid, text, date, text) from public;
revoke all on function public.complete_production_batch(uuid, date, text) from public;
revoke all on function public.create_purchase_list_from_batch(uuid, text) from public;
revoke all on function public.record_purchase(uuid, date, integer, integer, jsonb, uuid, text) from public;

grant execute on function public.plan_production_from_order(uuid, text, date, text) to authenticated;
grant execute on function public.complete_production_batch(uuid, date, text) to authenticated;
grant execute on function public.create_purchase_list_from_batch(uuid, text) to authenticated;
grant execute on function public.record_purchase(uuid, date, integer, integer, jsonb, uuid, text) to authenticated;
