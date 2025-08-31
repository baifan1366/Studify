
-- =============================================================================
-- Functions for automatically creating user profiles and other tasks
-- =============================================================================

-- =============================================================================
-- 1. Function to create a public profile for a new user
-- =============================================================================
create or replace function public.create_public_profile_for_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    'student'
  );
  return new;
end;
$$;

-- =============================================================================
-- 2. Trigger to call the function when a new user is created
-- =============================================================================
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_public_profile_for_user();

