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

create or replace function public.unpublish_menu_studio_v2(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_project public.menu_projects%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_project
  from public.menu_projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'Menu project not found' using errcode = 'P0002';
  end if;

  if v_project.owner_user_id <> v_uid and not private.is_menu_admin() then
    raise exception 'You cannot unpublish this menu' using errcode = '42501';
  end if;

  update public.menu_projects
  set published_slug = null,
      published_version_id = null,
      published_at = null,
      status = case when archived_at is null then 'ready' else 'archived' end
  where id = p_project_id;

  return jsonb_build_object('ok', true, 'projectId', p_project_id);
end;
$$;

revoke all on function public.unpublish_menu_studio_v2(uuid) from public;
grant execute on function public.unpublish_menu_studio_v2(uuid) to authenticated;