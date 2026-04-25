create or replace function public.reset_workspace_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;

  delete from public.purchase_list_lines where owner_id = v_owner;
  delete from public.production_batch_order_links where owner_id = v_owner;
  delete from public.purchase_lines where owner_id = v_owner;
  delete from public.production_batch_lines where owner_id = v_owner;
  delete from public.order_items where owner_id = v_owner;
  delete from public.product_bom_lines where owner_id = v_owner;
  delete from public.material_price_history where owner_id = v_owner;
  delete from public.stock_adjustments where owner_id = v_owner;

  alter table public.inventory_movements disable trigger inventory_movements_prevent_delete;
  delete from public.inventory_movements where owner_id = v_owner;
  alter table public.inventory_movements enable trigger inventory_movements_prevent_delete;

  delete from public.purchases where owner_id = v_owner;
  delete from public.purchase_lists where owner_id = v_owner;
  delete from public.production_batches where owner_id = v_owner;
  delete from public.orders where owner_id = v_owner;
  delete from public.product_images where owner_id = v_owner;
  delete from public.products where owner_id = v_owner;
  delete from public.material_variants where owner_id = v_owner;
  delete from public.materials where owner_id = v_owner;
  delete from public.suppliers where owner_id = v_owner;
exception
  when others then
    begin
      alter table public.inventory_movements enable trigger inventory_movements_prevent_delete;
    exception
      when others then
        null;
    end;
    raise;
end;
$$;
