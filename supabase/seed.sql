-- Local Supabase seed data for the Pearl Flower Inventory MVP.
-- Run after creating at least one Supabase Auth user. The first auth user
-- becomes the seed owner so all owner-scoped RLS records remain valid.

do $$
declare
  v_owner uuid;
  v_supplier uuid := '00000000-0000-0000-0000-000000000101';
  v_pearl uuid := '00000000-0000-0000-0000-000000000201';
  v_wire uuid := '00000000-0000-0000-0000-000000000202';
  v_elastic uuid := '00000000-0000-0000-0000-000000000203';
  v_packaging uuid := '00000000-0000-0000-0000-000000000204';
  v_ribbon uuid := '00000000-0000-0000-0000-000000000205';
  v_glue uuid := '00000000-0000-0000-0000-000000000206';
begin
  select id into v_owner from auth.users order by created_at limit 1;

  if v_owner is null then
    raise notice 'Skipping seed data because auth.users is empty. Create a user, then rerun supabase db seed.';
    return;
  end if;

  insert into public.settings (
    owner_id, allow_negative_stock, target_margin, labor_rate_per_hour,
    default_platform_fee_rate, costing_method
  )
  values (v_owner, false, 0.45, 20000, 0.08, 'latest_purchase')
  on conflict (owner_id) do nothing;

  insert into public.suppliers (id, owner_id, name, channel, marketplace_url, is_preferred, notes)
  values (v_supplier, v_owner, 'Shopee bObO Acc', 'Shopee', 'https://shopee.co.id', true, 'Seed supplier from current costing workflow.')
  on conflict (owner_id, name) do nothing;

  insert into public.materials (
    id, owner_id, name, category, purchase_unit, usage_unit, conversion_factor,
    conversion_is_estimated, min_stock, target_stock, preferred_supplier_id, notes
  )
  values
    (v_pearl, v_owner, 'Pearl beads / manik-manik mutiara', 'pearl', 'pack', 'pcs', 19, true, 30, 150, v_supplier, 'Pearl variants share the 15g pack purchase pattern.'),
    (v_wire, v_owner, 'Copper wire', 'wire', 'roll', 'meter', 50, true, 5, 50, v_supplier, 'Sample conversion. Replace with measured meters per roll.'),
    (v_elastic, v_owner, 'Elastic string', 'string', 'roll', 'meter', 20, true, 3, 30, v_supplier, 'Sample data.'),
    (v_packaging, v_owner, 'Packaging set', 'packaging', 'set', 'set', 1, false, 10, 80, v_supplier, 'Box, label, and protective wrap grouped for MVP costing.'),
    (v_ribbon, v_owner, 'Ribbon', 'accessory', 'roll', 'meter', 20, true, 4, 25, v_supplier, 'Sample data.'),
    (v_glue, v_owner, 'Glue', 'adhesive', 'pack', 'gram', 100, true, 20, 200, v_supplier, 'Sample data.')
  on conflict (owner_id, name) do nothing;

  insert into public.material_variants (
    id, owner_id, material_id, name, sku, size_mm, pack_weight_gram, pack_price,
    estimated_pcs_per_pack, estimated_pcs_per_pack_rounded, estimation_status,
    cost_per_usage_unit, stock_quantity, usage_unit, notes
  )
  select
    ('00000000-0000-0000-0000-0000000003' || lpad(row_number() over ()::text, 2, '0'))::uuid,
    v_owner,
    v_pearl,
    size_mm::text || 'mm pearl',
    'PEARL-' || size_mm::text || 'MM-15G',
    size_mm,
    15,
    pack_price,
    33 * power(10.0 / size_mm, 3),
    round(33 * power(10.0 / size_mm, 3)),
    'formula_estimated',
    pack_price / (33 * power(10.0 / size_mm, 3)),
    case when size_mm = 12 then 20 else 0 end,
    'pcs',
    case
      when size_mm = 12 then 'Current flowers use this size. Exact estimate is about 19.10 pcs per 15g; rounded planning count is 19 pcs, so rounded planning cost is Rp236.84.'
      else 'Formula-estimated from 10mm = 33 pcs per 15g baseline.'
    end
  from (
    values
      (3::numeric, 4085),
      (4::numeric, 2990),
      (5::numeric, 4500),
      (6::numeric, 4500),
      (8::numeric, 4500),
      (10::numeric, 4500),
      (12::numeric, 4500),
      (14::numeric, 4500)
  ) as pearl(size_mm, pack_price)
  on conflict (owner_id, sku) do nothing;

  insert into public.material_variants (
    id, owner_id, material_id, name, sku, color, pack_price, estimation_status,
    cost_per_usage_unit, stock_quantity, usage_unit, notes
  )
  values
    ('00000000-0000-0000-0000-000000000401', v_owner, v_wire, 'Gold copper wire', 'WIRE-COPPER-GOLD', 'Gold', 15000, 'sample_data', 300, 18, 'meter', 'Sample data.'),
    ('00000000-0000-0000-0000-000000000402', v_owner, v_elastic, 'Clear elastic string', 'ELASTIC-CLEAR', 'Clear', 12000, 'sample_data', 600, 12, 'meter', 'Sample data.'),
    ('00000000-0000-0000-0000-000000000403', v_owner, v_packaging, 'Standard packaging set', 'PACK-STANDARD', null, 10000, 'sample_data', 1000, 25, 'set', 'Sample bundled packaging set.'),
    ('00000000-0000-0000-0000-000000000404', v_owner, v_ribbon, 'Blush ribbon', 'RIBBON-BLUSH', 'Blush', 18000, 'sample_data', 900, 9, 'meter', 'Sample data.'),
    ('00000000-0000-0000-0000-000000000405', v_owner, v_glue, 'Clear glue', 'GLUE-CLEAR', 'Clear', 20000, 'sample_data', 200, 80, 'gram', 'Sample data.')
  on conflict (owner_id, sku) do nothing;

  insert into public.products (
    id, owner_id, name, sku, category, selling_price, labor_minutes,
    labor_rate_per_hour, packaging_cost, overhead_cost, target_margin,
    current_stock, reserved_stock, active, photo_url
  )
  values
    ('00000000-0000-0000-0000-000000000501', v_owner, 'Cherry Blossoms', 'FLOWER-CHERRY-BLOSSOMS', 'Flower', 35000, 18, 20000, 1000, 1500, 0.45, 6, 2, true, '/flowers/cherry-blossoms.svg'),
    ('00000000-0000-0000-0000-000000000502', v_owner, 'Orchid', 'FLOWER-ORCHID', 'Flower', 45000, 24, 20000, 1000, 1800, 0.45, 3, 1, true, '/flowers/orchid.svg'),
    ('00000000-0000-0000-0000-000000000503', v_owner, 'Hydrangea', 'FLOWER-HYDRANGEA', 'Flower', 65000, 42, 20000, 1200, 2500, 0.50, 2, 0, true, '/flowers/hydrangea.svg'),
    ('00000000-0000-0000-0000-000000000504', v_owner, 'Puffy Blush Bloom', 'FLOWER-PUFFY-BLUSH', 'Flower', 52000, 30, 20000, 1200, 2200, 0.48, 4, 1, true, '/flowers/puffy-blush.svg')
  on conflict (owner_id, sku) do nothing;

  insert into public.product_bom_lines (
    owner_id, product_id, material_variant_id, quantity_required, usage_unit,
    waste_percentage, optional, active, notes
  )
  values
    (v_owner, '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000307', 5, 'pcs', 0.05, false, true, 'Sample BOM quantity. Replace with measured recipe data.'),
    (v_owner, '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000401', 0.6, 'meter', 0.10, false, true, 'Sample BOM quantity.'),
    (v_owner, '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000403', 1, 'set', 0, false, true, 'Sample BOM quantity.'),
    (v_owner, '00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000307', 7, 'pcs', 0.05, false, true, 'Sample BOM quantity.'),
    (v_owner, '00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000401', 0.8, 'meter', 0.10, false, true, 'Sample BOM quantity.'),
    (v_owner, '00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000402', 0.4, 'meter', 0.05, false, true, 'Sample BOM quantity.'),
    (v_owner, '00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000307', 12, 'pcs', 0.08, false, true, 'Sample BOM quantity.'),
    (v_owner, '00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000404', 0.6, 'meter', 0.05, false, true, 'Sample BOM quantity.'),
    (v_owner, '00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000307', 9, 'pcs', 0.07, false, true, 'Sample BOM quantity.'),
    (v_owner, '00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000405', 1.5, 'gram', 0.10, false, true, 'Sample BOM quantity.')
  on conflict do nothing;

  insert into public.platform_fee_rules (owner_id, platform, fee_rate, fixed_fee, active, notes)
  values
    (v_owner, 'Shopee', 0.08, 0, true, 'Sample Shopee fee rate.'),
    (v_owner, 'Instagram', 0, 0, true, null),
    (v_owner, 'WhatsApp', 0, 0, true, null),
    (v_owner, 'Offline', 0, 0, true, null),
    (v_owner, 'Other', 0.03, 0, true, null)
  on conflict (owner_id, platform) do nothing;

  insert into public.material_price_history (
    owner_id, supplier_id, material_variant_id, observed_at, pack_price,
    cost_per_usage_unit, notes
  )
  values (
    v_owner, v_supplier, '00000000-0000-0000-0000-000000000307', current_date,
    4500, 4500 / (33 * power(10.0 / 12, 3)),
    'Formula-based estimate. Rounded planning cost using 19 pcs is Rp236.84.'
  )
  on conflict do nothing;
end;
$$;
