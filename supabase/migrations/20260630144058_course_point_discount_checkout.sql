alter table public.point_redemption
  add column if not exists order_id bigint references public.course_order(id) on delete set null,
  add column if not exists discount_cents integer not null default 0,
  add column if not exists cash_paid_cents integer not null default 0;

create unique index if not exists point_redemption_order_id_key
  on public.point_redemption(order_id)
  where order_id is not null and is_deleted = false;

-- Existing point prices meant "redeem the whole course". Preserve that
-- behavior explicitly; new configurations must always state the discount.
update public.course_point_price
set discount_pct = 100
where discount_pct is null or discount_pct <= 0;

alter table public.course_point_price
  drop constraint if exists course_point_price_point_price_check,
  drop constraint if exists course_point_price_discount_pct_check;

alter table public.course_point_price
  add constraint course_point_price_point_price_check check (point_price > 0),
  add constraint course_point_price_discount_pct_check check (discount_pct > 0 and discount_pct <= 100);

create or replace function public.reserve_course_points_discount(p_course_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id bigint;
  v_points integer;
  v_point_price integer;
  v_discount_pct numeric(5,2);
  v_original_cents integer;
  v_discount_cents integer;
  v_cash_cents integer;
  v_redemption_id bigint;
begin
  select id, coalesce(points, 0)
    into v_user_id, v_points
  from public.profiles
  where user_id = auth.uid() and is_deleted = false
  for update;

  if v_user_id is null then
    return jsonb_build_object('error', 'User not found');
  end if;

  select cpp.point_price, cpp.discount_pct, c.price_cents
    into v_point_price, v_discount_pct, v_original_cents
  from public.course c
  join public.course_point_price cpp
    on cpp.course_id = c.id and cpp.is_active and not cpp.is_deleted
  where c.id = p_course_id and not c.is_deleted
  limit 1;

  if v_point_price is null then
    return jsonb_build_object('error', 'Course does not offer a points discount');
  end if;
  if exists (
    select 1 from public.course_enrollment
    where user_id = v_user_id and course_id = p_course_id
  ) then
    return jsonb_build_object('error', 'Already enrolled in this course');
  end if;
  if v_points < v_point_price then
    return jsonb_build_object(
      'error', 'Insufficient points',
      'required', v_point_price,
      'available', v_points
    );
  end if;

  v_discount_cents := least(
    v_original_cents,
    round(v_original_cents * v_discount_pct / 100.0)::integer
  );
  v_cash_cents := greatest(0, v_original_cents - v_discount_cents);

  insert into public.point_redemption(
    user_id, course_id, points_spent, original_price_cents,
    discount_applied, discount_cents, cash_paid_cents, status,
    completion_date
  ) values (
    v_user_id, p_course_id, v_point_price, v_original_cents,
    v_discount_pct, v_discount_cents, v_cash_cents,
    case when v_cash_cents = 0 then 'completed' else 'reserved' end,
    case when v_cash_cents = 0 then now() else null end
  ) returning id into v_redemption_id;

  insert into public.community_points_ledger(user_id, points, reason, ref)
  values (
    v_user_id, -v_point_price, 'Course points discount',
    jsonb_build_object(
      'type', 'course_points_discount',
      'course_id', p_course_id,
      'redemption_id', v_redemption_id,
      'discount_cents', v_discount_cents
    )
  );

  if v_cash_cents = 0 then
    insert into public.course_enrollment(course_id, user_id, role, status)
    values (p_course_id, v_user_id, 'student', 'active');
  end if;

  return jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'points_spent', v_point_price,
    'discount_pct', v_discount_pct,
    'discount_cents', v_discount_cents,
    'cash_due_cents', v_cash_cents,
    'original_price_cents', v_original_cents,
    'remaining_points', v_points - v_point_price,
    'fully_redeemed', v_cash_cents = 0
  );
exception
  when unique_violation then
    return jsonb_build_object('error', 'Already enrolled in this course');
end;
$$;

create or replace function public.refund_reserved_course_points(p_redemption_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id bigint;
  v_points integer;
begin
  select id into v_user_id
  from public.profiles
  where user_id = auth.uid() and is_deleted = false;

  select points_spent into v_points
  from public.point_redemption
  where id = p_redemption_id
    and user_id = v_user_id
    and status = 'reserved'
    and not is_deleted
  for update;

  if v_points is null then
    return jsonb_build_object('success', false, 'error', 'No refundable reservation');
  end if;

  update public.point_redemption
  set status = 'failed', failure_reason = 'Checkout creation failed', updated_at = now()
  where id = p_redemption_id;

  insert into public.community_points_ledger(user_id, points, reason, ref)
  values (
    v_user_id, v_points, 'Course points discount refund',
    jsonb_build_object('type', 'course_points_refund', 'redemption_id', p_redemption_id)
  );

  return jsonb_build_object('success', true, 'points_refunded', v_points);
end;
$$;

revoke all on function public.reserve_course_points_discount(bigint) from public;
revoke all on function public.refund_reserved_course_points(bigint) from public;
grant execute on function public.reserve_course_points_discount(bigint) to authenticated;
grant execute on function public.refund_reserved_course_points(bigint) to authenticated;
