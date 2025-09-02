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

  
-- 触发器：更新learning_path的updated_at字段
create or replace function classroom.update_learning_path_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_learning_path_timestamp
before update on classroom.learning_path
for each row
execute function classroom.update_learning_path_timestamp();

-- 触发器：更新milestone的updated_at字段
create trigger update_milestone_timestamp
before update on classroom.milestone
for each row
execute function classroom.update_learning_path_timestamp();

-- 触发器：自动计算学习路径进度
create or replace function classroom.calculate_path_progress()
returns trigger as $$
declare
  total_milestones integer;
  completed_milestones integer;
  progress_value numeric(5,2);
begin
  -- 获取总里程碑数量
  select count(*) into total_milestones
  from classroom.milestone
  where path_id = new.path_id;
  
  -- 获取已完成的里程碑数量
  select count(*) into completed_milestones
  from classroom.milestone
  where path_id = new.path_id and status = 'completed';
  
  -- 计算进度百分比
  if total_milestones > 0 then
    progress_value := (completed_milestones::numeric / total_milestones::numeric) * 100;
  else
    progress_value := 0;
  end if;
  
  -- 更新学习路径进度
  update classroom.learning_path
  set progress = progress_value
  where id = new.path_id;
  
  return new;
end;
$$ language plpgsql;

create trigger update_path_progress
after update of status on classroom.milestone
for each row
when (old.status <> 'completed' and new.status = 'completed')
execute function classroom.calculate_path_progress();