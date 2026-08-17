
-- ==========================================================
-- BEYOND GLOBAL CONTACT SETTINGS V1
-- ==========================================================

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.app_settings
enable row level security;


-- ----------------------------------------------------------
-- Helper: determine whether current user is a BEYOND admin
-- ----------------------------------------------------------

create or replace function public.is_beyond_menu_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.menu_admins
    where user_id = auth.uid()
  );
$$;

grant execute
on function public.is_beyond_menu_admin()
to anon, authenticated;


-- ----------------------------------------------------------
-- Public can READ settings
-- Needed so homepage contact works while logged out.
-- ----------------------------------------------------------

drop policy if exists
"Public can read app settings"
on public.app_settings;

create policy
"Public can read app settings"
on public.app_settings
for select
to anon, authenticated
using (true);


-- ----------------------------------------------------------
-- Only BEYOND admins can INSERT
-- ----------------------------------------------------------

drop policy if exists
"Admins can insert app settings"
on public.app_settings;

create policy
"Admins can insert app settings"
on public.app_settings
for insert
to authenticated
with check (
  public.is_beyond_menu_admin()
);


-- ----------------------------------------------------------
-- Only BEYOND admins can UPDATE
-- ----------------------------------------------------------

drop policy if exists
"Admins can update app settings"
on public.app_settings;

create policy
"Admins can update app settings"
on public.app_settings
for update
to authenticated
using (
  public.is_beyond_menu_admin()
)
with check (
  public.is_beyond_menu_admin()
);


-- ----------------------------------------------------------
-- Initial BEYOND contact number
-- ----------------------------------------------------------

insert into public.app_settings (
  key,
  value
)
values (
  'contact_phone',
  '+972-537707072'
)
on conflict (key)
do update set
  value = excluded.value,
  updated_at = now();
