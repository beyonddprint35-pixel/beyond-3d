-- ============================================================
-- BEYOND MENU PROJECT -> LIVE SITE DESIGN SYNC V1
--
-- When a pre-purchase Menu Builder project is activated, keep the
-- exact branding/layout the customer approved and copy it into the
-- activated menu_site. Future edits happen directly on menu_sites.
-- ============================================================

create schema if not exists private;

create or replace function private.sync_menu_project_design_to_live_site()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_design jsonb;
  project_accent text;
begin
  if new.activated_site_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.activated_site_id is not distinct from new.activated_site_id
     and old.structured_menu is not distinct from new.structured_menu then
    return new;
  end if;

  project_design := coalesce(new.structured_menu -> 'branding', '{}'::jsonb);

  if jsonb_typeof(project_design) <> 'object' then
    project_design := '{}'::jsonb;
  end if;

  project_accent := nullif(project_design ->> 'accent', '');

  update public.menu_sites
  set
    design_settings = case
      when project_design = '{}'::jsonb then design_settings
      else project_design
    end,
    primary_color = coalesce(project_accent, primary_color),
    updated_at = now()
  where id = new.activated_site_id;

  return new;
end;
$$;

drop trigger if exists sync_menu_project_design_to_live_site on public.menu_projects;

create trigger sync_menu_project_design_to_live_site
after insert or update of activated_site_id, structured_menu
on public.menu_projects
for each row
execute function private.sync_menu_project_design_to_live_site();

-- Backfill activated projects if any already exist.
update public.menu_sites as ms
set
  design_settings = mp.structured_menu -> 'branding',
  primary_color = coalesce(nullif(mp.structured_menu -> 'branding' ->> 'accent', ''), ms.primary_color),
  updated_at = now()
from public.menu_projects as mp
where mp.activated_site_id = ms.id
  and jsonb_typeof(mp.structured_menu -> 'branding') = 'object'
  and mp.structured_menu -> 'branding' <> '{}'::jsonb
  and (ms.design_settings is null or ms.design_settings = '{}'::jsonb);
