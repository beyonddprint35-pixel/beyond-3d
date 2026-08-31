create or replace function public.get_legacy_published_menu_v3_by_slug(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_site public.menu_sites%rowtype;
  v_groups jsonb;
  v_items jsonb;
  v_languages jsonb;
  v_design jsonb;
  v_content_en jsonb;
  v_content_he jsonb;
  v_content_ar jsonb;
begin
  if v_slug = '' then
    return null;
  end if;

  select * into v_site
  from public.menu_sites
  where lower(slug) = v_slug
    and published is true
  limit 1;

  if not found then
    return null;
  end if;

  v_content_en := coalesce(v_site.content_settings -> 'en', '{}'::jsonb);
  v_content_he := coalesce(v_site.content_settings -> 'he', '{}'::jsonb);
  v_content_ar := coalesce(v_site.content_settings -> 'ar', '{}'::jsonb);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', g.id,
      'parent_id', g.parent_id,
      'name', jsonb_build_object(
        'en', coalesce(g.name_en, ''),
        'he', coalesce(g.name_he, ''),
        'ar', coalesce(g.metadata ->> 'name_ar', '')
      ),
      'group_key', g.group_key,
      'visible', coalesce(g.visible, true),
      'sort_order', coalesce(g.sort_order, 0),
      'metadata', coalesce(g.metadata, '{}'::jsonb)
    ) order by coalesce(g.sort_order, 0), g.created_at, g.id
  ), '[]'::jsonb)
  into v_groups
  from public.menu_groups g
  where g.site_id = v_site.id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'group_id', i.group_id,
      'name', jsonb_build_object(
        'en', coalesce(i.name_en, ''),
        'he', coalesce(i.name_he, ''),
        'ar', ''
      ),
      'description', jsonb_build_object(
        'en', coalesce(i.description_en, ''),
        'he', coalesce(i.description_he, ''),
        'ar', ''
      ),
      'origin', jsonb_build_object(
        'en', coalesce(i.origin_en, i.origin, ''),
        'he', coalesce(i.origin_he, ''),
        'ar', ''
      ),
      'price', i.price,
      'price_options', coalesce(i.price_options, '[]'::jsonb),
      'visible', coalesce(i.visible, true),
      'sort_order', coalesce(i.sort_order, 0),
      'image_url', coalesce(i.image_theme_url, i.image_processed_url, i.image_url, ''),
      'image_original_url', coalesce(i.image_original_url, ''),
      'image_processed_url', coalesce(i.image_processed_url, ''),
      'image_theme_url', coalesce(i.image_theme_url, ''),
      'image_focus_x', coalesce(i.image_focus_x, 50),
      'image_focus_y', coalesce(i.image_focus_y, 50)
    ) order by coalesce(i.sort_order, 0), i.created_at, i.id
  ), '[]'::jsonb)
  into v_items
  from public.menu_items i
  where i.site_id = v_site.id;

  select coalesce(jsonb_agg(code order by priority, code), '[]'::jsonb)
  into v_languages
  from (
    select code,
      case when code = coalesce(nullif(v_site.default_language, ''), 'en') then 0 else 1 end as priority
    from (values ('en'), ('he'), ('ar')) as supported(code)
    where coalesce(v_site.content_settings, '{}'::jsonb) ? code
       or code = coalesce(nullif(v_site.default_language, ''), 'en')
  ) languages;

  v_design := jsonb_build_object(
    'schemaVersion', 5,
    'template', 'classic',
    'styleVariant', 'standard',
    'theme', jsonb_build_object(
      'background', coalesce(v_site.design_settings ->> 'background', '#f6f4ef'),
      'surface', coalesce(v_site.design_settings ->> 'paper', '#fffdf8'),
      'card', coalesce(v_site.design_settings ->> 'card', '#ffffff'),
      'text', coalesce(v_site.design_settings ->> 'text', '#121212'),
      'muted', coalesce(v_site.design_settings ->> 'muted', '#7b756e'),
      'accent', coalesce(v_site.design_settings ->> 'accent', v_site.primary_color, '#556b2f'),
      'accentSecondary', coalesce(v_site.design_settings ->> 'accent_secondary', '#d8c79b'),
      'line', coalesce(v_site.design_settings ->> 'line', '#e5ded2'),
      'categoryBackground', coalesce(v_site.design_settings ->> 'category_background', '#111111'),
      'categoryText', coalesce(v_site.design_settings ->> 'category_text', '#ffffff')
    ),
    'typography', jsonb_build_object(
      'headingFont', coalesce(v_site.design_settings ->> 'heading_font', 'Playfair Display'),
      'bodyFont', coalesce(v_site.design_settings ->> 'body_font', 'Inter'),
      'numberFont', coalesce(v_site.design_settings ->> 'number_font', 'Playfair Display'),
      'headingWeight', 800,
      'bodyWeight', 400,
      'itemWeight', 700,
      'brandSize', coalesce((v_site.design_settings ->> 'brand_font_size')::numeric, 19),
      'heroSize', coalesce((v_site.design_settings ->> 'hero_font_size')::numeric, 46),
      'sectionSize', coalesce((v_site.design_settings ->> 'section_font_size')::numeric, 38),
      'categorySize', coalesce((v_site.design_settings ->> 'category_font_size')::numeric, 11),
      'itemNameSize', coalesce((v_site.design_settings ->> 'item_name_font_size')::numeric, 16),
      'descriptionSize', coalesce((v_site.design_settings ->> 'description_font_size')::numeric, 11),
      'priceSize', coalesce((v_site.design_settings ->> 'price_font_size')::numeric, 16)
    ),
    'layout', jsonb_build_object(
      'presentation', 'heritage-classic',
      'density', 'comfortable',
      'navigationStyle', 'pills',
      'itemImagePosition', 'top',
      'itemImageRatio', '4:3',
      'pricePosition', 'inline',
      'cardRadius', 19,
      'sectionGap', 20,
      'itemGap', 9,
      'cardPadding', 15
    ),
    'brand', jsonb_build_object(
      'logoUrl', coalesce(v_site.logo_url, ''),
      'logoSize', 44,
      'logoShape', coalesce(v_site.design_settings ->> 'logo_shape', 'free'),
      'heroMediaMode', case
        when coalesce(v_site.design_settings ->> 'hero_media_mode', '') in ('watermark','image','none')
          then v_site.design_settings ->> 'hero_media_mode'
        else 'watermark'
      end,
      'heroImageUrl', coalesce(v_site.design_settings ->> 'hero_image_url', '')
    ),
    'badges', jsonb_build_object('showSymbols', true, 'iconStyle', 'minimal')
  );

  return jsonb_build_object(
    'legacy', true,
    'source', 'menu_sites',
    'siteId', v_site.id,
    'slug', v_site.slug,
    'publishedAt', v_site.updated_at,
    'menu', jsonb_build_object(
      'restaurant_name', v_site.name,
      'restaurant_subtitle', jsonb_build_object(
        'en', coalesce(v_content_en ->> 'brand_subtitle', ''),
        'he', coalesce(v_content_he ->> 'brand_subtitle', ''),
        'ar', coalesce(v_content_ar ->> 'brand_subtitle', '')
      ),
      'hero_eyebrow', jsonb_build_object(
        'en', coalesce(v_content_en ->> 'hero_kicker', ''),
        'he', coalesce(v_content_he ->> 'hero_kicker', ''),
        'ar', coalesce(v_content_ar ->> 'hero_kicker', '')
      ),
      'hero_title', jsonb_build_object(
        'en', coalesce(v_content_en ->> 'hero_title', ''),
        'he', coalesce(v_content_he ->> 'hero_title', ''),
        'ar', coalesce(v_content_ar ->> 'hero_title', '')
      ),
      'logo_url', coalesce(v_site.logo_url, ''),
      'currency_symbol', '₪',
      'languages', v_languages,
      'default_language', coalesce(nullif(v_site.default_language, ''), 'en'),
      'groups', v_groups,
      'items', v_items
    ),
    'design', v_design,
    'publication', jsonb_build_object(
      'slug', v_site.slug,
      'legacy', true,
      'publicUrl', '/menu/' || v_site.slug
    )
  );
end;
$$;

revoke all on function public.get_legacy_published_menu_v3_by_slug(text) from public;
grant execute on function public.get_legacy_published_menu_v3_by_slug(text) to anon, authenticated;

create or replace function private.reject_legacy_menu_slug_collision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.published_slug is not null and exists (
    select 1
    from public.menu_sites legacy
    where lower(legacy.slug) = lower(new.published_slug)
      and legacy.published is true
  ) then
    raise exception 'This menu address is already used by an existing live menu' using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists menu_projects_reject_legacy_slug_collision on public.menu_projects;
create trigger menu_projects_reject_legacy_slug_collision
before insert or update of published_slug on public.menu_projects
for each row
execute function private.reject_legacy_menu_slug_collision();

create or replace function private.reject_v3_menu_slug_collision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.published is true and new.slug is not null and exists (
    select 1
    from public.menu_projects project
    where lower(project.published_slug) = lower(new.slug)
      and project.published_version_id is not null
  ) then
    raise exception 'This menu address is already used by a versioned live menu' using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists menu_sites_reject_v3_slug_collision on public.menu_sites;
create trigger menu_sites_reject_v3_slug_collision
before insert or update of slug, published on public.menu_sites
for each row
execute function private.reject_v3_menu_slug_collision();
