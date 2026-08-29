-- ============================================================
-- BEYOND MENU ENGINE V3
-- Reusable photo analysis + theme variant cache
-- AI analyzes each unique normalized photo once; theme changes reuse
-- the saved professional recipe and local rendering.
-- ============================================================

create table if not exists public.menu_photo_assets (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.menu_sites(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  image_hash text not null,
  analysis_profile text not null,
  original_url text not null default '',
  original_path text not null default '',
  processed_url text not null default '',
  processed_path text not null default '',
  width integer null,
  height integer null,
  quality_score integer null,
  quality_level text not null default '',
  quality_notes jsonb not null default '[]'::jsonb,
  analysis jsonb not null default '{}'::jsonb,
  focus_x real not null default 50,
  focus_y real not null default 50,
  finish_profile text not null default '',
  finish_source text not null default '',
  finish_safety text not null default '',
  finish_confidence real null,
  finish_model text not null default '',
  finish_recipe jsonb null,
  analyzed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_photo_assets_hash_check check (image_hash ~ '^[0-9a-f]{64}$'),
  constraint menu_photo_assets_focus_x_check check (focus_x >= 0 and focus_x <= 100),
  constraint menu_photo_assets_focus_y_check check (focus_y >= 0 and focus_y <= 100),
  constraint menu_photo_assets_confidence_check check (finish_confidence is null or (finish_confidence >= 0 and finish_confidence <= 1)),
  constraint menu_photo_assets_unique unique (site_id, owner_id, image_hash, analysis_profile)
);

create index if not exists menu_photo_assets_site_idx on public.menu_photo_assets(site_id, updated_at desc);
create index if not exists menu_photo_assets_hash_idx on public.menu_photo_assets(image_hash, analysis_profile);

create table if not exists public.menu_photo_asset_variants (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.menu_photo_assets(id) on delete cascade,
  theme_profile text not null,
  image_url text not null,
  image_path text not null,
  width integer null,
  height integer null,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_photo_asset_variants_unique unique (asset_id, theme_profile)
);

create index if not exists menu_photo_asset_variants_asset_idx on public.menu_photo_asset_variants(asset_id, theme_profile);

alter table public.menu_items add column if not exists photo_asset_id uuid null;
alter table public.menu_items drop constraint if exists menu_items_photo_asset_id_fkey;
alter table public.menu_items add constraint menu_items_photo_asset_id_fkey foreign key (photo_asset_id) references public.menu_photo_assets(id) on delete set null;
alter table public.menu_items add column if not exists image_hash text null;
alter table public.menu_items add column if not exists image_analysis_profile text null;
create index if not exists menu_items_photo_asset_idx on public.menu_items(photo_asset_id) where photo_asset_id is not null;

alter table public.menu_photo_assets enable row level security;
alter table public.menu_photo_asset_variants enable row level security;

drop policy if exists "owners and admins read photo assets" on public.menu_photo_assets;
create policy "owners and admins read photo assets"
on public.menu_photo_assets for select
to authenticated
using (owner_id = (select auth.uid()) or (select private.is_menu_admin()));

drop policy if exists "owners and admins create photo assets" on public.menu_photo_assets;
create policy "owners and admins create photo assets"
on public.menu_photo_assets for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.menu_sites s
    where s.id = site_id
      and (s.owner_id = (select auth.uid()) or (select private.is_menu_admin()))
  )
);

drop policy if exists "owners and admins update photo assets" on public.menu_photo_assets;
create policy "owners and admins update photo assets"
on public.menu_photo_assets for update
to authenticated
using (owner_id = (select auth.uid()) or (select private.is_menu_admin()))
with check (owner_id = (select auth.uid()) or (select private.is_menu_admin()));

drop policy if exists "owners and admins delete photo assets" on public.menu_photo_assets;
create policy "owners and admins delete photo assets"
on public.menu_photo_assets for delete
to authenticated
using (owner_id = (select auth.uid()) or (select private.is_menu_admin()));

drop policy if exists "owners and admins read photo variants" on public.menu_photo_asset_variants;
create policy "owners and admins read photo variants"
on public.menu_photo_asset_variants for select
to authenticated
using (exists (
  select 1 from public.menu_photo_assets a
  where a.id = asset_id
    and (a.owner_id = (select auth.uid()) or (select private.is_menu_admin()))
));

drop policy if exists "owners and admins create photo variants" on public.menu_photo_asset_variants;
create policy "owners and admins create photo variants"
on public.menu_photo_asset_variants for insert
to authenticated
with check (exists (
  select 1 from public.menu_photo_assets a
  where a.id = asset_id
    and (a.owner_id = (select auth.uid()) or (select private.is_menu_admin()))
));

drop policy if exists "owners and admins update photo variants" on public.menu_photo_asset_variants;
create policy "owners and admins update photo variants"
on public.menu_photo_asset_variants for update
to authenticated
using (exists (
  select 1 from public.menu_photo_assets a
  where a.id = asset_id
    and (a.owner_id = (select auth.uid()) or (select private.is_menu_admin()))
))
with check (exists (
  select 1 from public.menu_photo_assets a
  where a.id = asset_id
    and (a.owner_id = (select auth.uid()) or (select private.is_menu_admin()))
));

drop policy if exists "owners and admins delete photo variants" on public.menu_photo_asset_variants;
create policy "owners and admins delete photo variants"
on public.menu_photo_asset_variants for delete
to authenticated
using (exists (
  select 1 from public.menu_photo_assets a
  where a.id = asset_id
    and (a.owner_id = (select auth.uid()) or (select private.is_menu_admin()))
));