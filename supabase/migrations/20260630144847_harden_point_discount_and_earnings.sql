revoke execute on function public.reserve_course_points_discount(bigint) from anon;
revoke execute on function public.refund_reserved_course_points(bigint) from anon;

create unique index if not exists tutor_earnings_unique_source
  on public.tutor_earnings(source_type, source_id)
  where source_id is not null and is_deleted = false;
