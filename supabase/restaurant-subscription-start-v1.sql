-- ============================================================
-- BEYOND FOR RESTAURANTS
-- Start subscription flow before payment
-- V1
-- ============================================================

create or replace function public.start_restaurant_subscription()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_business public.business_accounts%rowtype;
  v_existing public.website_subscriptions%rowtype;
  v_subscription public.website_subscriptions%rowtype;
  v_request public.website_requests%rowtype;
  v_plan_id text;
begin

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be logged in.';
  end if;


  -- ----------------------------------------------------------
  -- Make sure this user is a restaurant/business account
  -- ----------------------------------------------------------

  select *
  into v_business
  from public.business_accounts
  where user_id = v_user_id;

  if not found then
    raise exception 'Business account not found.';
  end if;


  -- ----------------------------------------------------------
  -- Validate selected plan
  -- ----------------------------------------------------------

  select id
  into v_plan_id
  from public.subscription_plans
  where id = v_business.requested_plan
    and active = true
    and monthly_price_ils is not null;

  if not found then
    raise exception 'Subscription plan is not available.';
  end if;


  -- ----------------------------------------------------------
  -- Do not create duplicate open subscriptions
  -- ----------------------------------------------------------

  select *
  into v_existing
  from public.website_subscriptions
  where user_id = v_user_id
    and status in (
      'pending_payment',
      'active',
      'past_due'
    )
  order by created_at desc
  limit 1;


  if found then

    select *
    into v_request
    from public.website_requests
    where subscription_id = v_existing.id
    order by created_at desc
    limit 1;


    if not found then

      insert into public.website_requests (
        user_id,
        subscription_id,
        restaurant_name,
        plan_id,
        status
      )
      values (
        v_user_id,
        v_existing.id,
        v_business.restaurant_name,
        v_existing.plan_id,
        case
          when v_existing.status = 'active'
            then 'paid'
          else 'payment_pending'
        end
      )
      returning *
      into v_request;

    end if;


    return jsonb_build_object(
      'success', true,
      'created', false,
      'subscription_id', v_existing.id,
      'subscription_status', v_existing.status,
      'request_id', v_request.id,
      'request_status', v_request.status,
      'plan_id', v_existing.plan_id
    );

  end if;


  -- ----------------------------------------------------------
  -- Create pending subscription
  -- ----------------------------------------------------------

  insert into public.website_subscriptions (
    user_id,
    plan_id,
    status,
    payment_provider
  )
  values (
    v_user_id,
    v_plan_id,
    'pending_payment',
    'payplus'
  )
  returning *
  into v_subscription;


  -- ----------------------------------------------------------
  -- Create matching website request
  -- ----------------------------------------------------------

  insert into public.website_requests (
    user_id,
    subscription_id,
    restaurant_name,
    plan_id,
    status
  )
  values (
    v_user_id,
    v_subscription.id,
    v_business.restaurant_name,
    v_plan_id,
    'payment_pending'
  )
  returning *
  into v_request;


  return jsonb_build_object(
    'success', true,
    'created', true,
    'subscription_id', v_subscription.id,
    'subscription_status', v_subscription.status,
    'request_id', v_request.id,
    'request_status', v_request.status,
    'plan_id', v_subscription.plan_id
  );

end;
$$;


revoke all
on function public.start_restaurant_subscription()
from public;

grant execute
on function public.start_restaurant_subscription()
to authenticated;
