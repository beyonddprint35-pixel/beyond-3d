create extension if not exists pg_cron;

-- Global timestamp index keeps the retention delete efficient across all menus.
create index if not exists menu_analytics_events_occurred_at_idx
  on public.menu_analytics_events(occurred_at);

-- Analytics is intentionally limited to a rolling 30-day window.
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
    select greatest(1, least(coalesce(p_days,30),30))::int as days
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

-- Remove anything already outside the rolling retention window.
delete from public.menu_analytics_events
where occurred_at < now() - interval '30 days';

-- Run once per day. Data can exist for at most a few extra hours in storage,
-- while every analytics query is clamped to exactly the latest 30 days.
select cron.schedule(
  'menu-analytics-retention-30-days',
  '17 3 * * *',
  $$delete from public.menu_analytics_events where occurred_at < now() - interval '30 days'$$
);
