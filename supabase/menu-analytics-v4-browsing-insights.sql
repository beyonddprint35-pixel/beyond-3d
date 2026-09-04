-- Browsing-focused analytics for read-only digital menus.
-- Keeps the existing 30-day retention window and adds graph-ready attention metrics.
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
    select greatest(1, least(coalesce(p_days, 30), 30))::int as days
  ),
  filtered as (
    select e.*
    from public.menu_analytics_events e, params p
    where e.project_id = p_project_id
      and e.occurred_at >= now() - make_interval(days => p.days)
  ),
  sessions as (
    select distinct session_id from filtered
  ),
  category_session_counts as (
    select session_id, count(distinct entity_id)::numeric as category_count
    from filtered
    where event_type = 'category_view' and entity_id is not null
    group by session_id
  ),
  item_session_counts as (
    select session_id, count(distinct entity_id)::numeric as item_count
    from filtered
    where event_type = 'item_impression' and entity_id is not null
    group by session_id
  ),
  session_languages as (
    select distinct on (session_id) session_id, language
    from filtered
    where language is not null
    order by session_id, occurred_at desc
  ),
  daily as (
    select (e.occurred_at at time zone 'UTC')::date as day,
      count(*)::bigint as views,
      count(distinct e.session_id)::bigint as sessions
    from filtered e
    where e.event_type = 'menu_view'
    group by 1
  ),
  category_rows as (
    select e.entity_id,
      count(*)::bigint as views,
      count(distinct e.session_id)::bigint as unique_sessions,
      round(100 * count(distinct e.session_id)::numeric / nullif((select count(*) from sessions), 0), 1) as reach_percent
    from filtered e
    where e.event_type = 'category_view' and e.entity_id is not null
    group by e.entity_id
  ),
  item_rows as (
    select e.entity_id,
      count(*)::bigint as impressions,
      count(distinct e.session_id)::bigint as unique_sessions,
      round(100 * count(distinct e.session_id)::numeric / nullif((select count(*) from sessions), 0), 1) as exposure_percent
    from filtered e
    where e.event_type = 'item_impression' and e.entity_id is not null
    group by e.entity_id
  ),
  item_open_rows as (
    select entity_id, count(*)::bigint as opens
    from filtered
    where event_type = 'item_open' and entity_id is not null
    group by entity_id
  ),
  weekday_rows as (
    select extract(isodow from (e.occurred_at at time zone 'UTC'))::int as weekday,
      count(*)::bigint as views,
      count(distinct e.session_id)::bigint as unique_sessions
    from filtered e
    where e.event_type = 'menu_view'
    group by 1
  ),
  hour_rows as (
    select extract(hour from (e.occurred_at at time zone 'UTC'))::int as hour,
      count(*)::bigint as views,
      count(distinct e.session_id)::bigint as unique_sessions
    from filtered e
    where e.event_type = 'menu_view'
    group by 1
  ),
  language_rows as (
    select coalesce(sl.language, 'unknown') as language,
      count(*)::bigint as sessions,
      round(100 * count(*)::numeric / nullif((select count(*) from sessions), 0), 1) as share_percent
    from sessions s
    left join session_languages sl using (session_id)
    group by coalesce(sl.language, 'unknown')
  )
  select jsonb_build_object(
    'project_id', p_project_id,
    'days', (select days from params),
    'menu_views', count(*) filter (where event_type = 'menu_view'),
    'category_views', count(*) filter (where event_type = 'category_view'),
    'item_impressions', count(*) filter (where event_type = 'item_impression'),
    'item_opens', count(*) filter (where event_type = 'item_open'),
    'unique_sessions', (select count(*) from sessions),
    'avg_categories_per_session', coalesce((select round(avg(coalesce(c.category_count, 0)), 1) from sessions s left join category_session_counts c using (session_id)), 0),
    'avg_items_seen_per_session', coalesce((select round(avg(coalesce(i.item_count, 0)), 1) from sessions s left join item_session_counts i using (session_id)), 0),
    'multi_category_sessions_percent', coalesce((select round(100 * count(*) filter (where coalesce(c.category_count, 0) > 1)::numeric / nullif(count(*), 0), 1) from sessions s left join category_session_counts c using (session_id)), 0),
    'daily_views', coalesce((
      select jsonb_agg(jsonb_build_object('date', d.day::date, 'views', coalesce(v.views, 0), 'sessions', coalesce(v.sessions, 0)) order by d.day)
      from generate_series(current_date - ((select days from params) - 1), current_date, interval '1 day') as d(day)
      left join daily v on v.day = d.day::date
    ), '[]'::jsonb),
    'category_performance', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.entity_id, 'views', r.views, 'unique_sessions', r.unique_sessions, 'reach_percent', coalesce(r.reach_percent, 0)) order by r.unique_sessions desc, r.views desc, r.entity_id)
      from (select * from category_rows order by unique_sessions desc, views desc, entity_id limit 12) r
    ), '[]'::jsonb),
    'item_visibility', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.entity_id, 'impressions', r.impressions, 'unique_sessions', r.unique_sessions, 'exposure_percent', coalesce(r.exposure_percent, 0)) order by r.unique_sessions desc, r.impressions desc, r.entity_id)
      from (select * from item_rows order by unique_sessions desc, impressions desc, entity_id limit 12) r
    ), '[]'::jsonb),
    'language_mix', coalesce((
      select jsonb_agg(jsonb_build_object('language', language, 'sessions', sessions, 'share_percent', coalesce(share_percent, 0)) order by sessions desc, language)
      from language_rows
    ), '[]'::jsonb),
    'traffic_by_weekday', coalesce((
      select jsonb_agg(jsonb_build_object('weekday', weekday, 'views', views, 'unique_sessions', unique_sessions) order by weekday)
      from weekday_rows
    ), '[]'::jsonb),
    'traffic_by_hour_utc', coalesce((
      select jsonb_agg(jsonb_build_object('hour', g.hour, 'views', coalesce(h.views, 0), 'unique_sessions', coalesce(h.unique_sessions, 0)) order by g.hour)
      from generate_series(0, 23) g(hour)
      left join hour_rows h using (hour)
    ), '[]'::jsonb),
    -- Compatibility fields retained for older analytics clients.
    'top_categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.entity_id, 'views', r.views) order by r.views desc, r.entity_id)
      from (select entity_id, views from category_rows order by views desc, entity_id limit 8) r
    ), '[]'::jsonb),
    'top_items', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.entity_id, 'opens', coalesce(o.opens, 0), 'impressions', r.impressions) order by coalesce(o.opens, 0) desc, r.impressions desc, r.entity_id)
      from (select entity_id, impressions from item_rows order by impressions desc, entity_id limit 8) r
      left join item_open_rows o using (entity_id)
    ), '[]'::jsonb),
    'generated_at', now()
  )
  from filtered;
$$;

revoke all on function public.get_menu_analytics_summary(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_menu_analytics_summary(uuid, integer) to authenticated;
