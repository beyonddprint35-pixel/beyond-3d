create table if not exists public.menu_publication_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.menu_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  menu_snapshot jsonb not null,
  design_snapshot jsonb not null,
  publication_snapshot jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now(),
  unique (project_id, version_number)
);

create index if not exists menu_publication_versions_project_idx
  on public.menu_publication_versions(project_id, version_number desc);
create index if not exists menu_publication_versions_owner_idx
  on public.menu_publication_versions(owner_user_id, published_at desc);

alter table public.menu_publication_versions enable row level security;

drop policy if exists "owners and admins read menu publication versions" on public.menu_publication_versions;
create policy "owners and admins read menu publication versions"
  on public.menu_publication_versions
  for select
  to authenticated
  using (owner_user_id = (select auth.uid()) or private.is_menu_admin());

revoke insert, update, delete, truncate on public.menu_publication_versions from anon, authenticated;
grant select on public.menu_publication_versions to authenticated;

alter table public.menu_projects
  add column if not exists published_slug text,
  add column if not exists published_version_id uuid,
  add column if not exists published_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'menu_projects_published_version_id_fkey'
      and conrelid = 'public.menu_projects'::regclass
  ) then
    alter table public.menu_projects
      add constraint menu_projects_published_version_id_fkey
      foreign key (published_version_id)
      references public.menu_publication_versions(id)
      on delete set null;
  end if;
end $$;

create unique index if not exists menu_projects_published_slug_uidx
  on public.menu_projects(published_slug)
  where published_slug is not null;

revoke update on public.menu_projects from anon;
revoke update on public.menu_projects from authenticated;
grant update (
  restaurant_id,
  name,
  source_type,
  status,
  structured_menu,
  source_metadata,
  last_error,
  activated_site_id,
  studio_state,
  studio_schema_version,
  last_opened_at,
  archived_at
) on public.menu_projects to authenticated;

create or replace function public.publish_menu_studio_v2(p_project_id uuid, p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_project public.menu_projects%rowtype;
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_menu jsonb;
  v_design jsonb;
  v_publication jsonb;
  v_version_number integer;
  v_version_id uuid;
  v_published_at timestamptz;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_slug = '' or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Choose a valid menu address' using errcode = '22023';
  end if;

  select * into v_project
  from public.menu_projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'Menu project not found' using errcode = 'P0002';
  end if;

  if v_project.owner_user_id <> v_uid and not private.is_menu_admin() then
    raise exception 'You cannot publish this menu' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.menu_projects
    where published_slug = v_slug and id <> p_project_id
  ) then
    raise exception 'This menu address is already in use' using errcode = '23505';
  end if;

  v_menu := v_project.studio_state -> 'menu';
  v_design := coalesce(v_project.studio_state -> 'design', '{}'::jsonb);
  v_publication := coalesce(v_project.studio_state -> 'publication', '{}'::jsonb);

  if jsonb_typeof(v_menu) <> 'object'
     or jsonb_typeof(v_menu -> 'groups') <> 'array'
     or jsonb_array_length(v_menu -> 'groups') = 0
     or jsonb_typeof(v_menu -> 'items') <> 'array'
     or jsonb_array_length(v_menu -> 'items') = 0 then
    raise exception 'Menu content is not ready to publish' using errcode = '22023';
  end if;

  if nullif(trim(v_menu ->> 'restaurant_name'), '') is null then
    raise exception 'Restaurant name is required' using errcode = '22023';
  end if;

  if jsonb_typeof(v_design) <> 'object' or v_design = '{}'::jsonb then
    raise exception 'Choose a menu design before publishing' using errcode = '22023';
  end if;

  if jsonb_typeof(v_menu -> 'languages') <> 'array'
     or jsonb_array_length(v_menu -> 'languages') = 0 then
    raise exception 'Choose at least one customer language' using errcode = '22023';
  end if;

  select coalesce(max(version_number), 0) + 1
    into v_version_number
  from public.menu_publication_versions
  where project_id = p_project_id;

  insert into public.menu_publication_versions (
    project_id,
    owner_user_id,
    created_by,
    version_number,
    slug,
    menu_snapshot,
    design_snapshot,
    publication_snapshot
  ) values (
    p_project_id,
    v_project.owner_user_id,
    v_uid,
    v_version_number,
    v_slug,
    v_menu,
    v_design,
    v_publication
  )
  returning id, published_at into v_version_id, v_published_at;

  update public.menu_projects
  set published_slug = v_slug,
      published_version_id = v_version_id,
      published_at = v_published_at,
      status = 'activated'
  where id = p_project_id;

  return jsonb_build_object(
    'ok', true,
    'projectId', p_project_id,
    'slug', v_slug,
    'versionId', v_version_id,
    'versionNumber', v_version_number,
    'publishedAt', v_published_at,
    'publicPath', '/menu/' || v_slug
  );
end;
$$;

revoke all on function public.publish_menu_studio_v2(uuid, text) from public;
grant execute on function public.publish_menu_studio_v2(uuid, text) to authenticated;

create or replace function public.get_published_menu_v3_by_slug(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_version public.menu_publication_versions%rowtype;
begin
  if v_slug = '' then
    return null;
  end if;

  select v.* into v_version
  from public.menu_projects p
  join public.menu_publication_versions v on v.id = p.published_version_id
  where p.published_slug = v_slug
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'versionId', v_version.id,
    'versionNumber', v_version.version_number,
    'publishedAt', v_version.published_at,
    'slug', v_version.slug,
    'menu', v_version.menu_snapshot,
    'design', v_version.design_snapshot,
    'publication', v_version.publication_snapshot
  );
end;
$$;

revoke all on function public.get_published_menu_v3_by_slug(text) from public;
grant execute on function public.get_published_menu_v3_by_slug(text) to anon, authenticated;