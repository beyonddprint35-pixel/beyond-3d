alter table public.menu_projects
  add column if not exists studio_state jsonb not null default '{}'::jsonb,
  add column if not exists studio_schema_version integer not null default 2,
  add column if not exists last_opened_at timestamptz,
  add column if not exists archived_at timestamptz;

create index if not exists menu_projects_owner_active_idx
  on public.menu_projects (owner_user_id, updated_at desc)
  where archived_at is null;

comment on column public.menu_projects.studio_state is
  'Editable Beyond Menu Studio draft state. Kept separate from structured_menu import source and published artifacts.';
comment on column public.menu_projects.studio_schema_version is
  'Schema version for studio_state migrations.';
comment on column public.menu_projects.last_opened_at is
  'Last time the owner resumed this draft in Menu Studio.';
comment on column public.menu_projects.archived_at is
  'Soft archive timestamp for My Menus.';
