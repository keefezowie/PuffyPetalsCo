alter type public.material_category add value if not exists 'fuzzy_pipes';
alter type public.material_category add value if not exists 'stemen';
alter type public.material_category add value if not exists 'stem';
alter type public.material_category add value if not exists 'wrapping';

alter table public.material_variants
  add column if not exists min_purchase_quantity numeric(14,4) not null default 0 check (min_purchase_quantity >= 0),
  add column if not exists purchase_increment_quantity numeric(14,4) not null default 0 check (purchase_increment_quantity >= 0);

update public.materials set category = 'stem' where category::text = 'wire';
update public.materials set category = 'accessory' where category::text = 'string';

update public.orders
set status = 'packed',
    fulfillment_status = 'fulfilled'
where stock_deducted = true
  and status not in ('packed', 'shipped', 'completed', 'cancelled', 'returned');

drop index if exists public.purchase_lists_one_open_per_batch_idx;

create unique index if not exists purchase_lists_one_per_batch_idx
  on public.purchase_lists(owner_id, production_batch_id)
  where production_batch_id is not null;

create or replace function public.round_purchase_quantity(
  p_shortage numeric,
  p_minimum numeric,
  p_increment numeric
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_quantity numeric;
begin
  if p_shortage <= 0 then
    return 0;
  end if;

  v_quantity := greatest(p_shortage, coalesce(p_minimum, 0));

  if coalesce(p_increment, 0) <= 0 then
    return v_quantity;
  end if;

  return ceil(v_quantity / p_increment) * p_increment;
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
  v_purchase_quantity numeric;
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

  perform pg_advisory_xact_lock(hashtextextended(v_owner::text || ':' || v_batch.id::text, 0));

  select id into v_list_id
  from public.purchase_lists
  where owner_id = v_owner
    and production_batch_id = v_batch.id
  order by created_at asc
  limit 1;

  if v_list_id is not null then
    return v_list_id;
  end if;

  insert into public.purchase_lists (owner_id, production_batch_id, status, notes)
  values (v_owner, v_batch.id, 'draft', p_notes)
  returning id into v_list_id;

  for v_line in
    select bl.material_variant_id, bl.quantity_required, bl.waste_percentage,
           mv.stock_quantity, mv.usage_unit, mv.min_purchase_quantity,
           mv.purchase_increment_quantity, m.purchase_unit, m.preferred_supplier_id
    from public.product_bom_lines bl
    join public.material_variants mv on mv.id = bl.material_variant_id and mv.owner_id = bl.owner_id
    join public.materials m on m.id = mv.material_id and m.owner_id = mv.owner_id
    where bl.product_id = v_batch.product_id and bl.owner_id = v_owner and bl.active
  loop
    v_required := v_line.quantity_required * (1 + v_line.waste_percentage) * v_batch.quantity_made;
    v_shortage := greatest(0, v_required - v_line.stock_quantity);
    v_purchase_quantity := public.round_purchase_quantity(
      v_shortage,
      v_line.min_purchase_quantity,
      v_line.purchase_increment_quantity
    );

    if v_shortage > 0 then
      v_count := v_count + 1;
      insert into public.purchase_list_lines (
        owner_id, purchase_list_id, material_variant_id, supplier_id,
        required_quantity, available_quantity, shortage_quantity, recommended_purchase_quantity,
        purchase_unit, usage_unit, notes
      )
      values (
        v_owner, v_list_id, v_line.material_variant_id, v_line.preferred_supplier_id,
        v_required, v_line.stock_quantity, v_shortage, v_purchase_quantity,
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
exception
  when unique_violation then
    select id into v_list_id
    from public.purchase_lists
    where owner_id = v_owner
      and production_batch_id = p_production_batch_id
    order by created_at asc
    limit 1;

    if v_list_id is null then
      raise;
    end if;

    return v_list_id;
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
  set status = 'packed',
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
