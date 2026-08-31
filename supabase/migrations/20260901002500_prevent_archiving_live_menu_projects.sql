alter table public.menu_projects
  drop constraint if exists menu_projects_archive_requires_offline;

alter table public.menu_projects
  add constraint menu_projects_archive_requires_offline
  check (archived_at is null or published_version_id is null);
