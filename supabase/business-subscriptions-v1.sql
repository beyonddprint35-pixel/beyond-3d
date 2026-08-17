-- ============================================================
-- BEYOND FOR RESTAURANTS
-- Business accounts + Basic/Premium subscriptions
-- V1
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. BUSINESS ACCOUNTS
-- ============================================================

create table if not exists public.business_accounts (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  restaurant_name text not null,
  contact_name text not null,
  phone text,

  requested_plan text not null default 'basic'
    check (
      requested_plan in (
        'basic',
        'premium'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_accounts
enable row level security;


-- Customer can read their own business account.

drop policy if exists
  "business users read own account"
on public.business_accounts;

create policy
  "business users read own account"
on public.business_accounts
for select
to authenticated
using (
  user_id = (select auth.uid())
  or
  (select private.is_menu_admin())
);


-- Customer can update their own restaurant/contact info.

drop policy if exists
  "business users update own account"
on public.business_accounts;

create policy
  "business users update own account"
on public.business_accounts
for update
to authenticated
using (
  user_id = (select auth.uid())
  or
  (select private.is_menu_admin())
)
with check (
  user_id = (select auth.uid())
  or
  (select private.is_menu_admin())
);


revoke all
on public.business_accounts
from anon;

revoke all
on public.business_accounts
from authenticated;

grant select, update
on public.business_accounts
to authenticated;


-- ============================================================
-- 2. AUTOMATIC BUSINESS ACCOUNT CREATION
-- ============================================================

create or replace function private.handle_business_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_type_value text;
  restaurant_value text;
  contact_value text;
  phone_value text;
  plan_value text;
begin

  account_type_value :=
    coalesce(
      new.raw_user_meta_data ->> 'account_type',
      ''
    );

  if account_type_value <> 'business' then
    return new;
  end if;

  restaurant_value :=
    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'restaurant_name',
          ''
        )
      ),
      ''
    );

  contact_value :=
    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'full_name',
          ''
        )
      ),
      ''
    );

  phone_value :=
    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'phone',
          ''
        )
      ),
      ''
    );

  plan_value :=
    lower(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'requested_plan',
          'basic'
        )
      )
    );

  if plan_value not in ('basic', 'premium') then
    plan_value := 'basic';
  end if;

  insert into public.business_accounts (
    user_id,
    restaurant_name,
    contact_name,
    phone,
    requested_plan
  )
  values (
    new.id,
    coalesce(
      restaurant_value,
      'Restaurant'
    ),
    coalesce(
      contact_value,
      'Restaurant Owner'
    ),
    phone_value,
    plan_value
  )
  on conflict (user_id)
  do update set
    restaurant_name =
      excluded.restaurant_name,

    contact_name =
      excluded.contact_name,

    phone =
      excluded.phone,

    requested_plan =
      excluded.requested_plan,

    updated_at =
      now();

  return new;

end;
$$;


drop trigger if exists
  create_business_account_on_signup
on auth.users;

create trigger
  create_business_account_on_signup
after insert
on auth.users
for each row
execute function private.handle_business_signup();


-- ============================================================
-- 3. SUBSCRIPTION PLANS
-- ============================================================

create table if not exists public.subscription_plans (
  id text primary key,

  name text not null,

  description text,

  monthly_price_ils numeric(10,2),

  setup_fee_ils numeric(10,2),

  includes_nfc_qr_stand boolean
    not null default false,

  active boolean
    not null default true,

  sort_order integer
    not null default 0,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);


insert into public.subscription_plans (
  id,
  name,
  description,
  includes_nfc_qr_stand,
  active,
  sort_order
)
values
(
  'basic',
  'Basic',
  'Digital restaurant menu website and management platform.',
  false,
  true,
  1
),
(
  'premium',
  'Premium',
  'Digital restaurant menu website plus branded NFC and QR stand.',
  true,
  true,
  2
)
on conflict (id)
do update set
  name =
    excluded.name,

  description =
    excluded.description,

  includes_nfc_qr_stand =
    excluded.includes_nfc_qr_stand,

  active =
    excluded.active,

  sort_order =
    excluded.sort_order;


alter table public.subscription_plans
enable row level security;


drop policy if exists
  "anyone reads active subscription plans"
on public.subscription_plans;

create policy
  "anyone reads active subscription plans"
on public.subscription_plans
for select
to anon, authenticated
using (
  active = true
  or
  (select private.is_menu_admin())
);


revoke all
on public.subscription_plans
from anon;

revoke all
on public.subscription_plans
from authenticated;

grant select
on public.subscription_plans
to anon, authenticated;


-- ============================================================
-- 4. WEBSITE SUBSCRIPTIONS
-- ============================================================

create table if not exists public.website_subscriptions (
  id uuid primary key
    default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  plan_id text not null
    references public.subscription_plans(id),

  status text not null
    default 'pending_payment'
    check (
      status in (
        'pending_payment',
        'active',
        'past_due',
        'cancelled'
      )
    ),

  payment_provider text
    not null default 'payplus',

  provider_subscription_id text,

  provider_customer_id text,

  current_period_start timestamptz,

  current_period_end timestamptz,

  cancelled_at timestamptz,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);


create index if not exists
  website_subscriptions_user_idx
on public.website_subscriptions(user_id);


create index if not exists
  website_subscriptions_status_idx
on public.website_subscriptions(status);


alter table public.website_subscriptions
enable row level security;


drop policy if exists
  "users read own website subscriptions"
on public.website_subscriptions;

create policy
  "users read own website subscriptions"
on public.website_subscriptions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or
  (select private.is_menu_admin())
);


revoke all
on public.website_subscriptions
from anon;

revoke all
on public.website_subscriptions
from authenticated;

grant select
on public.website_subscriptions
to authenticated;


-- ============================================================
-- 5. WEBSITE REQUESTS
-- ============================================================

create table if not exists public.website_requests (
  id uuid primary key
    default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  subscription_id uuid
    references public.website_subscriptions(id)
    on delete set null,

  restaurant_name text not null,

  plan_id text not null
    references public.subscription_plans(id),

  status text not null
    default 'payment_pending'
    check (
      status in (
        'payment_pending',
        'paid',
        'setup_in_progress',
        'ready',
        'live',
        'cancelled'
      )
    ),

  site_id uuid
    references public.menu_sites(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);


create index if not exists
  website_requests_user_idx
on public.website_requests(user_id);


create index if not exists
  website_requests_status_idx
on public.website_requests(status);


alter table public.website_requests
enable row level security;


drop policy if exists
  "users read own website requests"
on public.website_requests;

create policy
  "users read own website requests"
on public.website_requests
for select
to authenticated
using (
  user_id = (select auth.uid())
  or
  (select private.is_menu_admin())
);


revoke all
on public.website_requests
from anon;

revoke all
on public.website_requests
from authenticated;

grant select
on public.website_requests
to authenticated;


-- ============================================================
-- 6. UPDATED_AT HELPER
-- ============================================================

create or replace function private.set_business_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists
  business_accounts_updated_at
on public.business_accounts;

create trigger
  business_accounts_updated_at
before update
on public.business_accounts
for each row
execute function private.set_business_updated_at();


drop trigger if exists
  subscription_plans_updated_at
on public.subscription_plans;

create trigger
  subscription_plans_updated_at
before update
on public.subscription_plans
for each row
execute function private.set_business_updated_at();


drop trigger if exists
  website_subscriptions_updated_at
on public.website_subscriptions;

create trigger
  website_subscriptions_updated_at
before update
on public.website_subscriptions
for each row
execute function private.set_business_updated_at();


drop trigger if exists
  website_requests_updated_at
on public.website_requests;

create trigger
  website_requests_updated_at
before update
on public.website_requests
for each row
execute function private.set_business_updated_at();


-- ============================================================
-- COMPLETE
-- ============================================================
