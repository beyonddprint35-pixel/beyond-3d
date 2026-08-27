-- ============================================================
-- BEYOND MENU ENGINE V3
-- Draft + published version foundation
--
-- IMPORTANT:
-- This migration is intentionally committed for review first.
-- Do NOT run it against production until V3 persistence is approved.
-- ============================================================

create table if not exists public.menu_v3_drafts (
  site_id uuid primary key
    references public.menu_sites(id)
    on delete cascade,

  schema_version integer not null default 1,
  menu_document jsonb not null,
  design_document jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint menu_v3_drafts_menu_object
    check (jsonb_typeof(menu_document) = 'object'),
  constraint menu_v3_drafts_design_object
    check (jsonb_typeof(design_document) = 'object')
);

create table if not exists public.menu_v3_versions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null
    references public.menu_sites(id)
    on delete cascade,

  version_number bigint not null,
  schema_version integer not null default 1,
  menu_document jsonb not null,
  design_document jsonb not null,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),

  constraint menu_v3_versions_site_version_unique
    unique (site_id, version_number),
  constraint menu_v3_versions_menu_object
    check (jsonb_typeof(menu_document) = 'object'),
  constraint menu_v3_versions_design_object
    check (jsonb_typeof(design_document) = 'object')
);

alter table public.menu_v3_drafts enable row level security;
alter table public.menu_v3_versions enable row level security;

-- Owner/admin draft access. Uses the same menu_sites.owner_id model
-- already used by the current Menu Studio security policies.
create policy "owners and admins read v3 drafts"
on public.menu_v3_drafts
for select
to authenticated
using (
  exists (
    select 1
    from public.menu_sites s
    where s.id = menu_v3_drafts.site_id
      and (
        s.owner_id = (select auth.uid())
        or (select private.is_menu_admin())
      )
  )
);

create policy "owners and admins insert v3 drafts"
on public.menu_v3_drafts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.menu_sites s
    where s.id = menu_v3_drafts.site_id
      and (
        s.owner_id = (select auth.uid())
        or (select private.is_menu_admin())
      )
  )
);

create policy "owners and admins update v3 drafts"
on public.menu_v3_drafts
for update
to authenticated
using (
  exists (
    select 1
    from public.menu_sites s
    where s.id = menu_v3_drafts.site_id
      and (
        s.owner_id = (select auth.uid())
        or (select private.is_menu_admin())
      )
  )
)
with check (
  exists (
    select 1
    from public.menu_sites s
    where s.id = menu_v3_drafts.site_id
      and (
        s.owner_id = (select auth.uid())
        or (select private.is_menu_admin())
      )
  )
);

create policy "owners and admins delete v3 drafts"
on public.menu_v3_drafts
for delete
to authenticated
using (
  exists (
    select 1
    from public.menu_sites s
    where s.id = menu_v3_drafts.site_id
      and (
        s.owner_id = (select auth.uid())
        or (select private.is_menu_admin())
      )
  )
);

-- Published version history is readable by the owner/admin.
-- Version rows are append-only from the client perspective.
create policy "owners and admins read v3 versions"
on public.menu_v3_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.menu_sites s
    where s.id = menu_v3_versions.site_id
      and (
        s.owner_id = (select auth.uid())
        or (select private.is_menu_admin())
      )
  )
);

create policy "owners and admins create v3 versions"
on public.menu_v3_versions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.menu_sites s
    where s.id = menu_v3_versions.site_id
      and (
        s.owner_id = (select auth.uid())
        or (select private.is_menu_admin())
      )
  )
);

revoke all on public.menu_v3_drafts from anon;
revoke all on public.menu_v3_versions from anon;

grant select, insert, update, delete on public.menu_v3_drafts to authenticated;
grant select, insert on public.menu_v3_versions to authenticated;

create index if not exists menu_v3_versions_site_published_idx
  on public.menu_v3_versions(site_id, published_at desc);

-- No current menu_sites/menu_groups/menu_items rows are changed by this file.
-- Publishing into the existing live tables will be implemented separately
-- behind an explicit transaction/RPC after migration review.
