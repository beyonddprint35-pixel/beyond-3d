-- ============================================================
-- BEYOND FOR RESTAURANTS
-- Admin links an existing menu website to a restaurant request
-- V1
-- ============================================================

create or replace function public.admin_link_restaurant_site(
  p_request_id uuid,
  p_site_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.website_requests%rowtype;
  v_subscription public.website_subscriptions%rowtype;
  v_site public.menu_sites%rowtype;
  v_next_status text;
begin

  -- Only BEYOND menu admins
  if not private.is_menu_admin() then
    raise exception 'Administrator access required.';
  end if;


  -- Get website request
  select *
  into v_request
  from public.website_requests
  where id = p_request_id;

  if not found then
    raise exception 'Restaurant request not found.';
  end if;


  -- Get subscription
  select *
  into v_subscription
  from public.website_subscriptions
  where id = v_request.subscription_id;

  if not found then
    raise exception 'Subscription not found.';
  end if;


  -- Do not assign websites to unpaid subscriptions
  if v_subscription.status <> 'active' then
    raise exception 'Restaurant subscription must be active first.';
  end if;


  -- Get existing BEYOND website
  select *
  into v_site
  from public.menu_sites
  where id = p_site_id;

  if not found then
    raise exception 'Website not found.';
  end if;


  -- Transfer this website to the restaurant customer
  update public.menu_sites
  set owner_id = v_request.user_id
  where id = p_site_id;


  -- If website is already published it is immediately live.
  -- Otherwise it is ready for final preparation.
  v_next_status :=
    case
      when v_site.published
        then 'live'
      else 'ready'
    end;


  update public.website_requests
  set
    site_id = p_site_id,
    status = v_next_status,
    updated_at = now()
  where id = p_request_id;


  return jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'site_id', p_site_id,
    'site_name', v_site.name,
    'status', v_next_status,
    'customer_id', v_request.user_id
  );

end;
$$;


revoke all
on function public.admin_link_restaurant_site(uuid, uuid)
from public;

grant execute
on function public.admin_link_restaurant_site(uuid, uuid)
to authenticated;


notify pgrst, 'reload schema';
