create table if not exists public.menu_analytics_events (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.menu_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  publication_version_id uuid references public.menu_publication_versions(id) on delete set null,
  legacy_site_id uuid references public.menu_sites(id) on delete set null,
  event_type text not null check (event_type in ('menu_view','category_view','item_impression','item_open')),
  entity_id text,
  session_id uuid not null,
  language text check (language is null or language in ('en','he','ar')),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint menu_analytics_slug_length check (char_length(slug) between 1 and 120),
  constraint menu_analytics_entity_length check (entity_id is null or char_length(entity_id) <= 160),
  constraint menu_analytics_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists menu_analytics_events_project_time_idx
  on public.menu_analytics_events(project_id, occurred_at desc);
create index if not exists menu_analytics_events_project_type_time_idx
  on public.menu_analytics_events(project_id, event_type, occurred_at desc);
create index if not exists menu_analytics_events_project_entity_time_idx
  on public.menu_analytics_events(project_id, entity_id, occurred_at desc)
  where entity_id is not null;

alter table public.menu_analytics_events enable row level security;

revoke all on table public.menu_analytics_events from anon, authenticated;
grant select on table public.menu_analytics_events to authenticated;
grant all on table public.menu_analytics_events to service_role;

drop policy if exists "Menu owners can read analytics" on public.menu_analytics_events;
create policy "Menu owners can read analytics"
on public.menu_analytics_events
for select
to authenticated
using ((select auth.uid()) = owner_user_id);

create or replace function public.record_menu_analytics_event(
  p_slug text,
  p_event_type text,
  p_entity_id text default null,
  p_session_id uuid default null,
  p_language text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_type text := trim(coalesce(p_event_type, ''));
  v_entity text := nullif(trim(coalesce(p_entity_id, '')), '');
  v_language text := nullif(lower(trim(coalesce(p_language, ''))), '');
  v_project public.menu_projects%rowtype;
  v_version public.menu_publication_versions%rowtype;
  v_site public.menu_sites%rowtype;
  v_interval interval;
  v_entity_valid boolean := true;
begin
  if v_slug = '' or char_length(v_slug) > 120 then return false; end if;
  if v_type not in ('menu_view','category_view','item_impression','item_open') then return false; end if;
  if p_session_id is null then return false; end if;
  if v_entity is not null and char_length(v_entity) > 160 then return false; end if;
  if v_language is not null and v_language not in ('en','he','ar') then v_language := null; end if;
  if p_metadata is not null and jsonb_typeof(p_metadata) <> 'object' then return false; end if;

  select p.* into v_project
  from public.menu_projects p
  where p.archived_at is null
    and p.published_version_id is not null
    and lower(coalesce(p.published_slug, '')) = v_slug
  limit 1;

  if found then
    select v.* into v_version
    from public.menu_publication_versions v
    where v.id = v_project.published_version_id
      and v.project_id = v_project.id
    limit 1;
  else
    select s.* into v_site
    from public.menu_sites s
    where s.published is true
      and lower(s.slug) = v_slug
    limit 1;

    if found then
      select p.* into v_project
      from public.menu_projects p
      where p.archived_at is null
        and (
          p.studio_state #>> '{profile,legacySiteId}' = v_site.id::text
          or p.source_metadata #>> '{studio_migration,site_id}' = v_site.id::text
        )
      order by p.updated_at desc
      limit 1;
    end if;
  end if;

  if v_project.id is null then return false; end if;

  if v_type in ('category_view','item_impression','item_open') and v_entity is null then
    return false;
  end if;

  if v_entity is not null then
    if v_version.id is not null then
      if v_type = 'category_view' then
        select exists (
          select 1 from jsonb_array_elements(coalesce(v_version.menu_snapshot->'groups','[]'::jsonb)) e
          where e->>'id' = v_entity and coalesce((e->>'visible')::boolean, true)
        ) into v_entity_valid;
      else
        select exists (
          select 1 from jsonb_array_elements(coalesce(v_version.menu_snapshot->'items','[]'::jsonb)) e
          where e->>'id' = v_entity and coalesce((e->>'visible')::boolean, true)
        ) into v_entity_valid;
      end if;
    elsif v_site.id is not null then
      if v_type = 'category_view' then
        select exists (
          select 1 from public.menu_groups g
          where g.site_id = v_site.id and g.id::text = v_entity and g.visible is true
        ) into v_entity_valid;
      else
        select exists (
          select 1 from public.menu_items i
          where i.site_id = v_site.id and i.id::text = v_entity and i.visible is true
        ) into v_entity_valid;
      end if;
    end if;
    if not v_entity_valid then return false; end if;
  end if;

  v_interval := case v_type
    when 'menu_view' then interval '5 minutes'
    when 'category_view' then interval '5 seconds'
    when 'item_impression' then interval '30 minutes'
    else interval '2 seconds'
  end;

  if exists (
    select 1
    from public.menu_analytics_events e
    where e.project_id = v_project.id
      and e.session_id = p_session_id
      and e.event_type = v_type
      and coalesce(e.entity_id, '') = coalesce(v_entity, '')
      and e.occurred_at >= now() - v_interval
  ) then
    return true;
  end if;

  insert into public.menu_analytics_events (
    project_id, owner_user_id, slug, publication_version_id, legacy_site_id,
    event_type, entity_id, session_id, language, metadata
  ) values (
    v_project.id, v_project.owner_user_id, v_slug, v_version.id, v_site.id,
    v_type, v_entity, p_session_id, v_language, coalesce(p_metadata, '{}'::jsonb)
  );

  return true;
end;
$$;

revoke all on function public.record_menu_analytics_event(text,text,text,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.record_menu_analytics_event(text,text,text,uuid,text,jsonb) to anon, authenticated;

create or replace function public.get_menu_analytics_summary(
  p_project_id uuid,
  p_days integer default 30
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select greatest(1, least(coalesce(p_days,30),365))::int as days
  ), filtered as (
    select e.*
    from public.menu_analytics_events e, params p
    where e.project_id = p_project_id
      and e.occurred_at >= now() - make_interval(days => p.days)
  )
  select jsonb_build_object(
    'project_id', p_project_id,
    'days', (select days from params),
    'menu_views', count(*) filter (where event_type='menu_view'),
    'category_views', count(*) filter (where event_type='category_view'),
    'item_impressions', count(*) filter (where event_type='item_impression'),
    'item_opens', count(*) filter (where event_type='item_open'),
    'unique_sessions', count(distinct session_id),
    'top_categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', ranked.entity_id, 'views', ranked.views) order by ranked.views desc, ranked.entity_id)
      from (
        select entity_id, count(*)::bigint as views
        from filtered
        where event_type='category_view' and entity_id is not null
        group by entity_id
        order by count(*) desc, entity_id
        limit 8
      ) ranked
    ), '[]'::jsonb),
    'top_items', coalesce((
      select jsonb_agg(jsonb_build_object('id', ranked.entity_id, 'opens', ranked.opens, 'impressions', ranked.impressions) order by ranked.opens desc, ranked.impressions desc, ranked.entity_id)
      from (
        select entity_id,
          count(*) filter (where event_type='item_open')::bigint as opens,
          count(*) filter (where event_type='item_impression')::bigint as impressions
        from filtered
        where event_type in ('item_open','item_impression') and entity_id is not null
        group by entity_id
        order by count(*) filter (where event_type='item_open') desc,
                 count(*) filter (where event_type='item_impression') desc,
                 entity_id
        limit 8
      ) ranked
    ), '[]'::jsonb),
    'generated_at', now()
  )
  from filtered;
$$;

revoke all on function public.get_menu_analytics_summary(uuid,integer) from public, anon, authenticated;
grant execute on function public.get_menu_analytics_summary(uuid,integer) to authenticated;
