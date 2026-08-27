-- ============================================================
-- BEYOND MENU ENGINE V3
-- Atomic publish + rollback foundation
--
-- REVIEW-ONLY MIGRATION.
-- Do not apply to production until explicitly approved.
--
-- Design principle:
--   * legacy menu rows are never rewritten by V3 publish
--   * each publish creates an immutable version snapshot
--   * menu_sites points to exactly one active V3 version
--   * pointer switch + version creation happen in one transaction
-- ============================================================

alter table public.menu_sites
  add column if not exists active_v3_version_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_sites_active_v3_version_fk'
  ) then
    alter table public.menu_sites
      add constraint menu_sites_active_v3_version_fk
      foreign key (active_v3_version_id)
      references public.menu_v3_versions(id)
      on delete set null;
  end if;
end
$$;

create index if not exists menu_sites_active_v3_version_idx
  on public.menu_sites(active_v3_version_id)
  where active_v3_version_id is not null;

-- ------------------------------------------------------------
-- ATOMIC PUBLISH
-- ------------------------------------------------------------

create or replace function public.publish_menu_v3(
  p_site_id uuid,
  p_schema_version integer,
  p_menu_document jsonb,
  p_design_document jsonb
)
returns table (
  version_id uuid,
  version_number bigint,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_site public.menu_sites%rowtype;
  v_next_version bigint;
  v_version public.menu_v3_versions%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required';
  end if;

  if p_menu_document is null or jsonb_typeof(p_menu_document) <> 'object' then
    raise exception 'invalid_menu_document';
  end if;

  if p_design_document is null or jsonb_typeof(p_design_document) <> 'object' then
    raise exception 'invalid_design_document';
  end if;

  if coalesce(p_schema_version, 0) < 1 then
    raise exception 'invalid_schema_version';
  end if;

  -- Lock the restaurant row so concurrent publishes serialize.
  select *
  into v_site
  from public.menu_sites
  where id = p_site_id
  for update;

  if not found then
    raise exception 'menu_not_found';
  end if;

  if not (
    v_site.owner_id = (select auth.uid())
    or (select private.is_menu_admin())
  ) then
    raise exception 'not_authorized';
  end if;

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
  )
  values (
    p_site_id,
    v_next_version,
    p_schema_version,
    p_menu_document,
    p_design_document,
    (select auth.uid())
  )
  returning * into v_version;

  update public.menu_sites
  set active_v3_version_id = v_version.id
  where id = p_site_id;

  -- A successful publish makes the server-side draft obsolete.
  delete from public.menu_v3_drafts
  where site_id = p_site_id;

  return query
  select
    v_version.id,
    v_version.version_number,
    v_version.published_at;
end;
$$;

revoke all on function public.publish_menu_v3(uuid, integer, jsonb, jsonb) from public;
grant execute on function public.publish_menu_v3(uuid, integer, jsonb, jsonb) to authenticated;

-- ------------------------------------------------------------
-- ATOMIC ROLLBACK / VERSION SWITCH
-- ------------------------------------------------------------

create or replace function public.activate_menu_v3_version(
  p_site_id uuid,
  p_version_id uuid
)
returns table (
  version_id uuid,
  version_number bigint,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_site public.menu_sites%rowtype;
  v_version public.menu_v3_versions%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required';
  end if;

  select *
  into v_site
  from public.menu_sites
  where id = p_site_id
  for update;

  if not found then
    raise exception 'menu_not_found';
  end if;

  if not (
    v_site.owner_id = (select auth.uid())
    or (select private.is_menu_admin())
  ) then
    raise exception 'not_authorized';
  end if;

  select *
  into v_version
  from public.menu_v3_versions
  where id = p_version_id
    and site_id = p_site_id;

  if not found then
    raise exception 'version_not_found';
  end if;

  update public.menu_sites
  set active_v3_version_id = v_version.id
  where id = p_site_id;

  return query
  select
    v_version.id,
    v_version.version_number,
    v_version.published_at;
end;
$$;

revoke all on function public.activate_menu_v3_version(uuid, uuid) from public;
grant execute on function public.activate_menu_v3_version(uuid, uuid) to authenticated;

-- Existing public menus remain on their current renderer because
-- active_v3_version_id defaults to NULL. No legacy content is changed.
