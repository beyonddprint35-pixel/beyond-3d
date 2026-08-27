-- ============================================================
-- BEYOND MENU ENGINE V3
-- Atomic publish pointer + rollback foundation
--
-- REVIEW FIRST. Do not run against production until approved.
-- Requires menu-v3-drafts-and-versions-v1.sql.
-- ============================================================

alter table public.menu_sites
  add column if not exists active_v3_version_id uuid null;

alter table public.menu_sites
  drop constraint if exists menu_sites_active_v3_version_id_fkey;

alter table public.menu_sites
  add constraint menu_sites_active_v3_version_id_fkey
  foreign key (active_v3_version_id)
  references public.menu_v3_versions(id)
  on delete set null;

create index if not exists menu_sites_active_v3_version_idx
  on public.menu_sites(active_v3_version_id)
  where active_v3_version_id is not null;

create or replace function public.publish_menu_v3(
  p_site_id uuid,
  p_menu_document jsonb,
  p_design_document jsonb,
  p_schema_version integer default 1
)
returns public.menu_v3_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_next_version bigint;
  v_version public.menu_v3_versions;
begin
  if p_menu_document is null or jsonb_typeof(p_menu_document) <> 'object' then
    raise exception 'Invalid menu document';
  end if;
  if p_design_document is null or jsonb_typeof(p_design_document) <> 'object' then
    raise exception 'Invalid design document';
  end if;

  select s.owner_id
    into v_owner
  from public.menu_sites s
  where s.id = p_site_id
  for update;

  if v_owner is null then
    raise exception 'Menu not found';
  end if;

  if v_owner <> auth.uid() and not private.is_menu_admin() then
    raise exception 'Not authorized';
  end if;

  -- The locked menu_sites row serializes publishes for this restaurant.
  select coalesce(max(v.version_number), 0) + 1
    into v_next_version
  from public.menu_v3_versions v
  where v.site_id = p_site_id;

  insert into public.menu_v3_versions (
    site_id,
    version_number,
    schema_version,
    menu_document,
    design_document,
    published_by
  ) values (
    p_site_id,
    v_next_version,
    greatest(coalesce(p_schema_version, 1), 1),
    p_menu_document,
    p_design_document,
    auth.uid()
  )
  returning * into v_version;

  -- One pointer switch makes the complete version live atomically.
  update public.menu_sites
  set active_v3_version_id = v_version.id
  where id = p_site_id;

  -- A successful publish clears the persisted server draft only.
  delete from public.menu_v3_drafts where site_id = p_site_id;

  return v_version;
end;
$$;

revoke all on function public.publish_menu_v3(uuid,jsonb,jsonb,integer) from public;
grant execute on function public.publish_menu_v3(uuid,jsonb,jsonb,integer) to authenticated;

create or replace function public.activate_menu_v3_version(
  p_site_id uuid,
  p_version_id uuid
)
returns public.menu_v3_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_version public.menu_v3_versions;
begin
  select s.owner_id into v_owner
  from public.menu_sites s
  where s.id = p_site_id
  for update;

  if v_owner is null then raise exception 'Menu not found'; end if;
  if v_owner <> auth.uid() and not private.is_menu_admin() then raise exception 'Not authorized'; end if;

  select * into v_version
  from public.menu_v3_versions v
  where v.id = p_version_id and v.site_id = p_site_id;

  if v_version.id is null then raise exception 'Version not found'; end if;

  update public.menu_sites
  set active_v3_version_id = p_version_id
  where id = p_site_id;

  return v_version;
end;
$$;

revoke all on function public.activate_menu_v3_version(uuid,uuid) from public;
grant execute on function public.activate_menu_v3_version(uuid,uuid) to authenticated;

-- Public reader returns only the explicitly active V3 snapshot for a published site.
create or replace function public.get_published_menu_v3_by_slug(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'versionId', v.id,
    'versionNumber', v.version_number,
    'publishedAt', v.published_at,
    'siteId', s.id,
    'slug', s.slug,
    'menu', v.menu_document,
    'design', v.design_document
  )
  from public.menu_sites s
  join public.menu_v3_versions v
    on v.id = s.active_v3_version_id
   and v.site_id = s.id
  where s.slug = p_slug
    and s.published = true
  limit 1;
$$;

revoke all on function public.get_published_menu_v3_by_slug(text) from public;
grant execute on function public.get_published_menu_v3_by_slug(text) to anon, authenticated;

-- Existing sites with active_v3_version_id = null continue using the legacy public renderer.
