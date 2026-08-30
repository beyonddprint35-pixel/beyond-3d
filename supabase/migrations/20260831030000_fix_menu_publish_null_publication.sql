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
  v_default_language text;
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

  if v_project.owner_user_id <> v_uid and not coalesce(private.is_menu_admin(), false) then
    raise exception 'You cannot publish this menu' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.menu_projects
    where published_slug = v_slug and id <> p_project_id
  ) then
    raise exception 'This menu address is already in use' using errcode = '23505';
  end if;

  v_menu := v_project.studio_state -> 'menu';
  v_design := v_project.studio_state -> 'design';
  v_publication := v_project.studio_state -> 'publication';

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

  if not exists (
    select 1 from jsonb_array_elements(v_menu -> 'groups') as g
    where coalesce((g ->> 'visible')::boolean, true)
  ) or not exists (
    select 1 from jsonb_array_elements(v_menu -> 'items') as i
    where coalesce((i ->> 'visible')::boolean, true)
  ) then
    raise exception 'At least one visible category and item are required' using errcode = '22023';
  end if;

  if jsonb_typeof(v_design) <> 'object' or v_design = '{}'::jsonb then
    raise exception 'Choose a menu design before publishing' using errcode = '22023';
  end if;

  if jsonb_typeof(v_menu -> 'languages') <> 'array'
     or jsonb_array_length(v_menu -> 'languages') = 0 then
    raise exception 'Choose at least one customer language' using errcode = '22023';
  end if;

  v_default_language := nullif(trim(v_menu ->> 'default_language'), '');
  if v_default_language is null or not exists (
    select 1 from jsonb_array_elements_text(v_menu -> 'languages') as lang
    where lang = v_default_language
  ) then
    raise exception 'Default language must be one of the enabled customer languages' using errcode = '22023';
  end if;

  if jsonb_typeof(v_publication) <> 'object' then
    v_publication := '{}'::jsonb;
  end if;

  v_menu := jsonb_set(v_menu, '{slug}', to_jsonb(v_slug), true);
  v_publication := jsonb_set(v_publication, '{slug}', to_jsonb(v_slug), true);

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