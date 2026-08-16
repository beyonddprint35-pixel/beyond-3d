-- ============================================================
-- BEYOND MENU PLATFORM V7
-- Owner-only access + Beyond admin assignment
-- ============================================================

create schema if not exists private;

-- ------------------------------------------------------------
-- ADMIN CHECK
-- ------------------------------------------------------------

create or replace function private.is_menu_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.menu_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_menu_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_menu_admin() to authenticated;


-- ------------------------------------------------------------
-- SAFE USER DIRECTORY
--
-- Admins need to assign a restaurant by customer email.
-- Browser users must NOT query auth.users directly.
--
-- This table mirrors only:
--   user_id
--   email
--
-- And RLS makes it visible ONLY to Beyond menu admins.
-- ------------------------------------------------------------

create table if not exists public.menu_user_directory (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  email text not null unique,

  created_at timestamptz not null default now()
);

alter table public.menu_user_directory
enable row level security;


-- Populate users that already exist.

insert into public.menu_user_directory (
  user_id,
  email
)
select
  id,
  lower(email)
from auth.users
where email is not null
on conflict (user_id)
do update set
  email = excluded.email;


-- Keep directory synced when users sign up/change email.

create or replace function private.sync_menu_user_directory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if new.email is null then

    delete from public.menu_user_directory
    where user_id = new.id;

  else

    insert into public.menu_user_directory (
      user_id,
      email
    )
    values (
      new.id,
      lower(new.email)
    )
    on conflict (user_id)
    do update set
      email = excluded.email;

  end if;

  return new;

end;
$$;

drop trigger if exists
  sync_menu_user_directory_on_auth_user
on auth.users;

create trigger sync_menu_user_directory_on_auth_user
after insert or update of email
on auth.users
for each row
execute function private.sync_menu_user_directory();


-- Only admins may see customer email directory.

drop policy if exists
  "menu admins read user directory"
on public.menu_user_directory;

create policy
  "menu admins read user directory"
on public.menu_user_directory
for select
to authenticated
using (
  (select private.is_menu_admin())
);

revoke all
on public.menu_user_directory
from anon;

revoke all
on public.menu_user_directory
from authenticated;

grant select
on public.menu_user_directory
to authenticated;


-- ------------------------------------------------------------
-- MENU SITE SECURITY
-- ------------------------------------------------------------

alter table public.menu_sites
enable row level security;

alter table public.menu_sections
enable row level security;

alter table public.menu_items
enable row level security;


-- ============================================================
-- SITE CREATION
--
-- OLD:
-- owner OR admin could create restaurants.
--
-- NEW:
-- ONLY Beyond admins create restaurants.
-- ============================================================

drop policy if exists
  "owners and admins create menu sites"
on public.menu_sites;

drop policy if exists
  "admins create menu sites"
on public.menu_sites;

create policy
  "admins create menu sites"
on public.menu_sites
for insert
to authenticated
with check (
  (select private.is_menu_admin())
);


-- ============================================================
-- SITE UPDATE
--
-- Restaurant owner:
--   can change name / slug / branding / publish status
--
-- Beyond admin:
--   can also update / reassign owner_id
--
-- An owner cannot transfer the restaurant to another user
-- because WITH CHECK requires the resulting row to still belong
-- to that user unless they are an admin.
-- ============================================================

drop policy if exists
  "owners and admins update menu sites"
on public.menu_sites;

create policy
  "owners and admins update menu sites"
on public.menu_sites
for update
to authenticated
using (
  owner_id = (select auth.uid())
  or
  (select private.is_menu_admin())
)
with check (
  owner_id = (select auth.uid())
  or
  (select private.is_menu_admin())
);


-- ============================================================
-- DELETE SITE
--
-- Only Beyond admin can delete an entire restaurant website.
-- ============================================================

drop policy if exists
  "owners and admins delete menu sites"
on public.menu_sites;

drop policy if exists
  "admins delete menu sites"
on public.menu_sites;

create policy
  "admins delete menu sites"
on public.menu_sites
for delete
to authenticated
using (
  (select private.is_menu_admin())
);


-- ------------------------------------------------------------
-- INDEX
-- ------------------------------------------------------------

create index if not exists
menu_user_directory_email_idx
on public.menu_user_directory(email);


-- ------------------------------------------------------------
-- COMPLETE
-- ------------------------------------------------------------

select
  'Beyond menu owner access V7 installed' as status;
