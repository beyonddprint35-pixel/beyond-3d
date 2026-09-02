-- One-time data migration into the existing owner's Studio project.
-- Keeps the original PDF import and the live /menu/el-puerto data intact.
-- Re-running does not overwrite a Studio draft or create duplicate projects.
begin;

do $migration$
declare
  v_site public.menu_sites%rowtype;
  v_project public.menu_projects%rowtype;
  v_live jsonb;
  v_items jsonb;
  v_state jsonb;
begin
  select * into strict v_site from public.menu_sites
    where slug = 'el-puerto' for share;
  select * into strict v_project from public.menu_projects
    where id = '88aba38c-3926-4cd5-ad56-16f2d0efd10d' for update;

  if v_project.owner_user_id is distinct from v_site.owner_id
    or v_project.archived_at is not null
    or (v_project.activated_site_id is not null and v_project.activated_site_id <> v_site.id)
    or v_project.published_version_id is not null then
    raise exception 'Legacy menu and Studio project must belong to the same owner and be available for migration';
  end if;
  if coalesce(v_project.studio_state, '{}'::jsonb) <> '{}'::jsonb then
    raise notice 'Studio draft already exists; leaving it unchanged';
    return;
  end if;

  v_live := public.get_legacy_published_menu_v3_by_slug(v_site.slug);
  if v_live is null or v_live ->> 'siteId' <> v_site.id::text then
    raise exception 'The current published legacy menu is unavailable';
  end if;

  -- Preserve raw image/price metadata as well as the normalized live content.
  -- Legacy wine columns were sometimes imported in reverse. Match the legacy
  -- renderer: the lower of two numeric prices is glass; a lone price is bottle.
  select jsonb_agg(
    to_jsonb(i) || live_item || jsonb_build_object(
      'description', jsonb_build_object(
        'en', coalesce(nullif(i.description_en, ''), i.description, ''),
        'he', coalesce(nullif(i.description_he, ''), i.description, ''),
        'ar', coalesce(live_item -> 'description' ->> 'ar', '')
      ),
      'price_options', case
        when jsonb_array_length(coalesce(i.price_options, '[]'::jsonb)) > 0 then i.price_options
        when prices.first_price <> '' and prices.second_price <> '' then
          jsonb_build_array(
            jsonb_build_object('label_key','glass','label_en','Glass','label_he','כוס','label_ar','كأس',
              'price', case when amounts.first_amount > amounts.second_amount then prices.second_price else prices.first_price end),
            jsonb_build_object('label_key','bottle','label_en','Bottle','label_he','בקבוק','label_ar','زجاجة',
              'price', case when amounts.first_amount > amounts.second_amount then prices.first_price else prices.second_price end)
          )
        when prices.first_price <> '' or prices.second_price <> '' then
          jsonb_build_array(jsonb_build_object('label_key','bottle','label_en','Bottle','label_he','בקבוק','label_ar','زجاجة',
            'price', coalesce(nullif(prices.first_price, ''), prices.second_price)))
        else coalesce(i.price_options, '[]'::jsonb)
      end
    ) order by ordinal
  ) into v_items
  from jsonb_array_elements(v_live -> 'menu' -> 'items') with ordinality as entries(live_item, ordinal)
  join public.menu_items i on i.id::text = live_item ->> 'id' and i.site_id = v_site.id
  cross join lateral (select trim(coalesce(i.wine_bottle,'')) as first_price, trim(coalesce(i.wine_glass,'')) as second_price) prices
  cross join lateral (select
    substring(replace(prices.first_price, ',', '') from '[0-9]+(?:\.[0-9]+)?')::numeric as first_amount,
    substring(replace(prices.second_price, ',', '') from '[0-9]+(?:\.[0-9]+)?')::numeric as second_amount
  ) amounts;

  if jsonb_array_length(coalesce(v_items, '[]'::jsonb)) <> (select count(*) from public.menu_items where site_id = v_site.id)
    or exists (select 1 from public.menu_items i where i.site_id = v_site.id
      and not exists (select 1 from public.menu_groups g where g.id = i.group_id and g.site_id = v_site.id)) then
    raise exception 'Migration must preserve every item and its category';
  end if;

  v_state := jsonb_build_object(
    'schemaVersion', 2,
    'menu', (v_live -> 'menu') || jsonb_build_object(
      'site_id', v_site.id, 'source_project_id', v_project.id,
      'slug', v_site.slug, 'items', v_items
    ),
    'design', v_live -> 'design',
    'designId', 'heritage-original',
    'contentLanguage', v_site.default_language,
    'profile', jsonb_build_object('mode','legacy','importedProjectId',v_project.id,'legacySiteId',v_site.id),
    'publication', v_live -> 'publication',
    'savedAt', now()
  );

  update public.menu_projects set
    name = v_site.name,
    restaurant_id = v_site.restaurant_id,
    -- Link via studio_state.menu.site_id. Setting activated_site_id invokes
    -- the old import activation trigger, which writes to the live site's design.
    studio_state = v_state,
    studio_schema_version = 2,
    source_metadata = coalesce(source_metadata, '{}'::jsonb) || jsonb_build_object(
      'studio_migration', jsonb_build_object('source','menu_sites','site_id',v_site.id,'migrated_at',now())
    )
  where id = v_project.id;
end;
$migration$;

commit;
