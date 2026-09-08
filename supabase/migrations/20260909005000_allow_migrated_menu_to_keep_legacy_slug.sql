-- A migrated Studio menu must be allowed to publish versioned snapshots at the
-- same public slug that belonged to its own legacy menu_sites row. The previous
-- collision guard treated that migration as a different menu and blocked the
-- first V3 publication (for example El Puerto -> /menu/el-puerto).

create or replace function private.reject_legacy_menu_slug_collision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_legacy_site_id text := nullif(new.studio_state -> 'profile' ->> 'legacySiteId', '');
begin
  if new.published_slug is not null and exists (
    select 1
    from public.menu_sites legacy
    where lower(legacy.slug) = lower(new.published_slug)
      and legacy.published is true
      -- Reusing the URL of the legacy site this Studio project was migrated
      -- from is an update path, not a slug collision.
      and (v_legacy_site_id is null or legacy.id::text <> v_legacy_site_id)
  ) then
    raise exception 'This menu address is already used by an existing live menu' using errcode = '23505';
  end if;
  return new;
end;
$$;

-- Keep the inverse guard symmetric: once the migrated project owns a versioned
-- publication at the same URL, updates to its matching legacy row remain valid.
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
      and coalesce(project.studio_state -> 'profile' ->> 'legacySiteId', '') <> new.id::text
  ) then
    raise exception 'This menu address is already used by a versioned live menu' using errcode = '23505';
  end if;
  return new;
end;
$$;
