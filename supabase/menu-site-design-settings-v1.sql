-- ============================================================
-- BEYOND LIVE MENU DESIGN SETTINGS V1
--
-- Stores the Menu Studio design chosen by an activated customer
-- directly on the live menu site. Existing sites keep their current
-- appearance until the owner saves a live design.
-- ============================================================

alter table public.menu_sites
add column if not exists design_settings jsonb not null default '{}'::jsonb;

alter table public.menu_sites
drop constraint if exists menu_sites_design_settings_is_object;

alter table public.menu_sites
add constraint menu_sites_design_settings_is_object
check (jsonb_typeof(design_settings) = 'object');

comment on column public.menu_sites.design_settings is
'Saved BEYOND Menu Studio branding/layout settings for the live customer menu.';
