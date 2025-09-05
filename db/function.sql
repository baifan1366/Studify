-- =============================================================================
-- Function to create a public profile for a new user
-- =============================================================================
create or replace function public.create_public_profile_for_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, role)
  values (new.id, 'student');
  return new;
end;
$$;

-- =============================================================================
-- Trigger to call the function when a new user is created
-- =============================================================================
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_public_profile_for_user();

-- =========================
-- Course System Functions and Triggers
-- =========================

-- Create triggers for automatic slug generation
create or replace function generate_course_slug()
returns trigger as $$
begin
  if new.slug is null then
    new.slug := lower(regexp_replace(new.title, '[^a-zA-Z0-9\s]', '', 'g'));
    new.slug := regexp_replace(new.slug, '\s+', '-', 'g');
    new.slug := new.slug || '-' || substring(new.public_id::text from 1 for 8);
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function generate_lesson_slug()
returns trigger as $$
begin
  if new.slug is null then
    new.slug := lower(regexp_replace(new.title, '[^a-zA-Z0-9\s]', '', 'g'));
    new.slug := regexp_replace(new.slug, '\s+', '-', 'g');
    new.slug := new.slug || '-' || substring(new.public_id::text from 1 for 8);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists course_slug_trigger on course;
create trigger course_slug_trigger
  before insert or update on course
  for each row execute function generate_course_slug();

drop trigger if exists lesson_slug_trigger on course_lesson;
create trigger lesson_slug_trigger
  before insert or update on course_lesson
  for each row execute function generate_lesson_slug();

-- Function to automatically create classroom and community group when course is purchased
create or replace function create_course_resources()
returns trigger as $$
declare
  classroom_id bigint;
  community_group_id bigint;
  course_record record;
begin
  -- Get course details
  select * into course_record from course where id = new.course_id;
  
  -- Create classroom if auto_create_classroom is true
  if course_record.auto_create_classroom then
    insert into classroom (
      slug, name, description, class_code, visibility, owner_id
    ) values (
      course_record.slug || '-classroom',
      course_record.title || ' - Classroom',
      'Auto-generated classroom for ' || course_record.title,
      upper(substring(md5(random()::text) from 1 for 8)),
      'private',
      new.user_id
    ) returning id into classroom_id;
    
    -- Add user as classroom member
    insert into classroom_member (classroom_id, user_id, role)
    values (classroom_id, new.user_id, 'student');
  end if;
  
  -- Create community group if auto_create_community is true
  if course_record.auto_create_community then
    insert into community_group (
      name, description, slug, visibility, owner_id
    ) values (
      course_record.title || ' - Community',
      'Auto-generated community for ' || course_record.title,
      course_record.slug || '-community',
      'private',
      course_record.owner_id
    ) returning id into community_group_id;
    
    -- Add user as community member
    insert into community_group_member (group_id, user_id, role)
    values (community_group_id, new.user_id, 'member');
  end if;
  
  return new;
end;
$$ language plpgsql;

drop trigger if exists course_enrollment_resources_trigger on course_enrollment;
create trigger course_enrollment_resources_trigger
  after insert on course_enrollment
  for each row execute function create_course_resources();

-- Function to update mistake_book when quiz is failed
create or replace function handle_quiz_mistake()
returns trigger as $$
begin
  -- If answer is incorrect, add to mistake book
  if not new.is_correct then
    insert into mistake_book (
      user_id, 
      course_question_id, 
      course_id, 
      lesson_id, 
      mistake_content, 
      source_type
    ) 
    select 
      new.user_id,
      new.question_id,
      cl.course_id,
      new.lesson_id,
      cqq.question_text || ' - Incorrect answer: ' || new.user_answer::text,
      'course_quiz'
    from course_quiz_question cqq
    join course_lesson cl on cqq.lesson_id = cl.id
    where cqq.id = new.question_id;
  end if;
  
  return new;
end;
$$ language plpgsql;

drop trigger if exists quiz_mistake_trigger on course_quiz_submission;
create trigger quiz_mistake_trigger
  after insert on course_quiz_submission
  for each row execute function handle_quiz_mistake();

