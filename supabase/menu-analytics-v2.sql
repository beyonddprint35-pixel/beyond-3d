create index if not exists menu_analytics_events_owner_idx
  on public.menu_analytics_events(owner_user_id);
create index if not exists menu_analytics_events_publication_version_idx
  on public.menu_analytics_events(publication_version_id)
  where publication_version_id is not null;
create index if not exists menu_analytics_events_legacy_site_idx
  on public.menu_analytics_events(legacy_site_id)
  where legacy_site_id is not null;

drop policy if exists "Menu owners can read analytics" on public.menu_analytics_events;
create policy "Menu owners can read analytics"
on public.menu_analytics_events
for select
to authenticated
using (
  exists (
    select 1
    from public.menu_projects p
    where p.id = menu_analytics_events.project_id
  )
);
