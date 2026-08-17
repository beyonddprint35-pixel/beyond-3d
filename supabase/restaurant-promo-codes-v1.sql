-- ============================================================
-- BEYOND FOR RESTAURANTS
-- Secure promo codes
-- V1
-- ============================================================

create table if not exists public.restaurant_promo_codes (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,

  plan_id text
    references public.subscription_plans(id),

  discount_percent numeric(5,2)
    not null default 100
    check (
      discount_percent >= 0
      and discount_percent <= 100
    ),

  max_redemptions integer
    not null default 1
    check (max_redemptions > 0),

  redemption_count integer
    not null default 0
    check (redemption_count >= 0),

  active boolean
    not null default true,

  expires_at timestamptz,

  created_at timestamptz
    not null default now()
);


create table if not exists public.restaurant_promo_redemptions (
  id uuid primary key default gen_random_uuid(),

  promo_id uuid not null
    references public.restaurant_promo_codes(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  subscription_id uuid not null
    references public.website_subscriptions(id)
    on delete cascade,

  redeemed_at timestamptz
    not null default now(),

  unique (
    promo_id,
    user_id
  )
);


alter table public.restaurant_promo_codes
enable row level security;

alter table public.restaurant_promo_redemptions
enable row level security;


-- Customers must NOT be able to list promo codes.
revoke all
on public.restaurant_promo_codes
from anon, authenticated;

revoke all
on public.restaurant_promo_redemptions
from anon, authenticated;


-- ============================================================
-- REDEEM PROMO
-- ============================================================

create or replace function public.redeem_restaurant_promo(
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();

  v_business public.business_accounts%rowtype;
  v_promo public.restaurant_promo_codes%rowtype;

  v_subscription_id uuid;
  v_request_id uuid;
begin

  if v_user_id is null then
    raise exception 'You must be logged in.';
  end if;


  select *
  into v_business
  from public.business_accounts
  where user_id = v_user_id;

  if not found then
    raise exception 'Business account not found.';
  end if;


  select *
  into v_promo
  from public.restaurant_promo_codes
  where upper(code) =
        upper(trim(p_code))
  for update;


  if not found then
    raise exception 'Invalid promo code.';
  end if;


  if not v_promo.active then
    raise exception 'This promo code is no longer active.';
  end if;


  if (
    v_promo.expires_at is not null
    and v_promo.expires_at < now()
  ) then
    raise exception 'This promo code has expired.';
  end if;


  if (
    v_promo.redemption_count >=
    v_promo.max_redemptions
  ) then
    raise exception 'This promo code has already been used.';
  end if;


  if (
    v_promo.plan_id is not null
    and v_promo.plan_id <>
        v_business.requested_plan
  ) then
    raise exception 'This promo code is not valid for the selected plan.';
  end if;


  -- Existing subscription if customer already pressed Activate.
  select id
  into v_subscription_id
  from public.website_subscriptions
  where user_id = v_user_id
    and status in (
      'pending_payment',
      'active',
      'past_due'
    )
  order by created_at desc
  limit 1;


  if v_subscription_id is null then

    insert into public.website_subscriptions (
      user_id,
      plan_id,
      status,
      payment_provider,
      current_period_start
    )
    values (
      v_user_id,
      v_business.requested_plan,
      'active',
      'promo',
      now()
    )
    returning id
    into v_subscription_id;

  else

    update public.website_subscriptions
    set
      status = 'active',
      payment_provider = 'promo',
      current_period_start = now(),
      cancelled_at = null
    where id = v_subscription_id;

  end if;


  -- Website request
  select id
  into v_request_id
  from public.website_requests
  where subscription_id =
        v_subscription_id
  order by created_at desc
  limit 1;


  if v_request_id is null then

    insert into public.website_requests (
      user_id,
      subscription_id,
      restaurant_name,
      plan_id,
      status
    )
    values (
      v_user_id,
      v_subscription_id,
      v_business.restaurant_name,
      v_business.requested_plan,
      'paid'
    )
    returning id
    into v_request_id;

  else

    update public.website_requests
    set status = 'paid'
    where id = v_request_id;

  end if;


  insert into public.restaurant_promo_redemptions (
    promo_id,
    user_id,
    subscription_id
  )
  values (
    v_promo.id,
    v_user_id,
    v_subscription_id
  );


  update public.restaurant_promo_codes
  set redemption_count =
      redemption_count + 1
  where id = v_promo.id;


  return jsonb_build_object(
    'success', true,
    'subscription_id',
      v_subscription_id,
    'request_id',
      v_request_id,
    'plan_id',
      v_business.requested_plan,
    'discount_percent',
      v_promo.discount_percent
  );

end;
$$;


revoke all
on function public.redeem_restaurant_promo(text)
from public;

grant execute
on function public.redeem_restaurant_promo(text)
to authenticated;


-- ============================================================
-- EL PUERTO PROMO
-- One customer, 100% free.
-- Valid for Basic OR Premium.
-- ============================================================

insert into public.restaurant_promo_codes (
  code,
  plan_id,
  discount_percent,
  max_redemptions,
  active
)
values (
  'ELPUERTO100',
  null,
  100,
  1,
  true
)
on conflict (code)
do nothing;


notify pgrst, 'reload schema';
