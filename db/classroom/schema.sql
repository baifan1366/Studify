create schema if not exists classroom;

create table if not exists classroom.live_session (
  id uuid primary key default uuid_generate_v1(),
  course_id uuid references courses.course(id) on delete set null,
  title text,
  host_id uuid not null references core.profiles(user_id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null check (status in ('scheduled','live','ended','cancelled')) default 'scheduled'
);
create index if not exists idx_live_time on classroom.live_session(starts_at);

alter table courses.lesson
  add constraint fk_lesson_live_session
  foreign key (live_session_id) references classroom.live_session(id) on delete set null;

create table if not exists classroom.attendance (
  session_id uuid not null references classroom.live_session(id) on delete cascade,
  user_id uuid not null references core.profiles(user_id) on delete cascade,
  join_at timestamptz,
  leave_at timestamptz,
  attention_score numeric(5,2), -- computed from events
  primary key (session_id, user_id)
);

create table if not exists classroom.chat_message (
  id uuid primary key default uuid_generate_v1(),
  session_id uuid not null references classroom.live_session(id) on delete cascade,
  sender_id uuid not null references core.profiles(user_id) on delete cascade,
  message text not null
);

create table if not exists classroom.whiteboard_session (
  id uuid primary key default uuid_generate_v1(),
  session_id uuid references classroom.live_session(id) on delete cascade,
  title text
);

create table if not exists classroom.whiteboard_event (
  id uuid primary key default uuid_generate_v1(),
  wb_id uuid not null references classroom.whiteboard_session(id) on delete cascade,
  actor_id uuid references core.profiles(user_id),
  kind text not null,
  payload jsonb not null
);

create table if not exists classroom.recording (
  id uuid primary key default uuid_generate_v1(),
  session_id uuid not null references classroom.live_session(id) on delete cascade,
  url text not null,
  duration_sec int
);

create index if not exists idx_live_host_time on classroom.live_session(host_id, starts_at);

create table if not exists classroom.mistake_book (
  id uuid primary key default uuid_generate_v1(),
  user_id uuid not null references core.profiles(user_id) on delete cascade,
  assignment_id uuid references assessment.assignment(id) on delete set null,
  submission_id uuid references assessment.submission(id) on delete set null,
  question_id uuid references assessment.question(id) on delete set null,
  mistake_content text not null,
  analysis text,
  knowledge_points text[],
  recommended_exercises jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_deleted boolean default false
);

create index if not exists idx_mistake_user on classroom.mistake_book(user_id);
create index if not exists idx_mistake_assignment on classroom.mistake_book(assignment_id);

-- 学习路径相关表结构

-- 学习路径表
create table if not exists classroom.learning_path (
  id uuid primary key default uuid_generate_v1(),
  user_id uuid not null references core.profiles(user_id) on delete cascade,
  goal text not null,
  duration integer not null, -- 以天为单位
  progress numeric(5,2) default 0, -- 总体进度百分比
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean default true
);
create index if not exists idx_learning_path_user on classroom.learning_path(user_id);

-- 学习路径里程碑表
create table if not exists classroom.milestone (
  id uuid primary key default uuid_generate_v1(),
  path_id uuid not null references classroom.learning_path(id) on delete cascade,
  title text not null,
  description text,
  order_index integer not null, -- 里程碑顺序
  status text not null check (status in ('locked','in-progress','completed')) default 'locked',
  resource_type text, -- 资源类型：course, lesson, assignment, quiz, etc.
  resource_id uuid, -- 关联的资源ID
  prerequisites jsonb, -- 前置条件，如[{"milestone_id": "uuid", "required": true}]
  reward jsonb, -- 奖励信息，如{"badge_id": "uuid", "points": 100, "message": "恭喜解锁中级任务"}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_milestone_path on classroom.milestone(path_id);
create index if not exists idx_milestone_order on classroom.milestone(path_id, order_index);

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

-- 课程聊天消息表
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 为消息表添加索引
CREATE INDEX IF NOT EXISTS messages_classroom_id_idx ON messages(classroom_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);

-- 帖子表
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 为帖子表添加索引
CREATE INDEX IF NOT EXISTS posts_classroom_id_idx ON posts(classroom_id);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at);

-- 帖子评论表
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 为帖子评论表添加索引
CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS post_comments_user_id_idx ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS post_comments_created_at_idx ON post_comments(created_at);

-- 为实时功能添加RLS策略

-- 消息表RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 只有课程成员可以查看消息
CREATE POLICY "课程成员可以查看消息" ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classroom_members
      WHERE classroom_members.classroom_id = messages.classroom_id
      AND classroom_members.user_id = auth.uid()
    )
  );

-- 只有课程成员可以发送消息
CREATE POLICY "课程成员可以发送消息" ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classroom_members
      WHERE classroom_members.classroom_id = messages.classroom_id
      AND classroom_members.user_id = auth.uid()
    )
  );

-- 只有消息作者可以更新自己的消息
CREATE POLICY "消息作者可以更新自己的消息" ON messages
  FOR UPDATE
  USING (user_id = auth.uid());

-- 帖子表RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 只有课程成员可以查看帖子
CREATE POLICY "课程成员可以查看帖子" ON posts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classroom_members
      WHERE classroom_members.classroom_id = posts.classroom_id
      AND classroom_members.user_id = auth.uid()
    )
  );

-- 只有课程成员可以发布帖子
CREATE POLICY "课程成员可以发布帖子" ON posts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classroom_members
      WHERE classroom_members.classroom_id = posts.classroom_id
      AND classroom_members.user_id = auth.uid()
    )
  );

-- 只有帖子作者可以更新自己的帖子
CREATE POLICY "帖子作者可以更新自己的帖子" ON posts
  FOR UPDATE
  USING (user_id = auth.uid());

-- 帖子评论表RLS
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- 只有课程成员可以查看评论
CREATE POLICY "课程成员可以查看评论" ON post_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      JOIN classroom_members ON classroom_members.classroom_id = posts.classroom_id
      WHERE posts.id = post_comments.post_id
      AND classroom_members.user_id = auth.uid()
    )
  );

-- 只有课程成员可以发表评论
CREATE POLICY "课程成员可以发表评论" ON post_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      JOIN classroom_members ON classroom_members.classroom_id = posts.classroom_id
      WHERE posts.id = post_comments.post_id
      AND classroom_members.user_id = auth.uid()
    )
  );

-- 只有评论作者可以更新自己的评论
CREATE POLICY "评论作者可以更新自己的评论" ON post_comments
  FOR UPDATE
  USING (user_id = auth.uid());

-- 创建Supabase Realtime发布
BEGIN;
  -- 启用消息表的实时发布
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  
  -- 启用帖子表的实时发布
  ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  
  -- 启用帖子评论表的实时发布
  ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
COMMIT;