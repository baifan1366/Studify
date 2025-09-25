-- =========================
-- STUDIFY CONSOLIDATED DATABASE SCHEMA
-- Generated: 2025-01-20
-- Combines: database.sql + function.sql + all migrations
-- =========================

-- Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Keep everything in public schema
SET search_path = public;

-- =========================
-- CORE PROFILES TABLE (Enhanced)
-- =========================
CREATE TABLE IF NOT EXISTS profiles (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  full_name text,
  display_name text,
  email text,
  role text NOT NULL CHECK (role IN ('admin','student','tutor')),
  avatar_url text,
  bio text,
  timezone text DEFAULT 'Asia/Kuala_Lumpur',
  currency text DEFAULT 'MYR' CHECK (currency IN ('MYR', 'USD', 'EUR', 'GBP', 'SGD', 'JPY', 'CNY', 'THB', 'IDR', 'VND')),
  status text NOT NULL CHECK (status IN ('active','banned')) DEFAULT 'active',
  banned_reason text,
  banned_at timestamptz,
  points int NOT NULL DEFAULT 0,
  onboarded boolean NOT NULL DEFAULT false,
  onboarded_step int DEFAULT 0 CHECK (onboarded_step >= 0 AND onboarded_step <= 3),
  
  -- Enhanced profile fields for settings functionality
  preferences jsonb DEFAULT '{}',
  theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language text DEFAULT 'en',
  notification_settings jsonb DEFAULT '{
    "email_notifications": true,
    "push_notifications": true,
    "course_updates": true,
    "community_updates": false,
    "marketing_emails": false,
    "classroom_notifications": true,
    "assignment_reminders": true,
    "live_session_alerts": true,
    "grade_notifications": true,
    "community_mentions": true,
    "direct_messages": true,
    "system_announcements": true,
    "marketing_notifications": false,
    "digest_frequency": "daily"
  }',
  privacy_settings jsonb DEFAULT '{
    "profile_visibility": "public",
    "show_email": false,
    "show_progress": true,
    "data_collection": true
  }',
  two_factor_enabled boolean DEFAULT false,
  email_verified boolean DEFAULT false,
  profile_completion int DEFAULT 0 CHECK (profile_completion >= 0 AND profile_completion <= 100),
  
  -- OneSignal integration
  onesignal_player_id text,
  onesignal_external_id text,
  push_subscription_status text DEFAULT 'unknown' CHECK (push_subscription_status IN ('subscribed', 'unsubscribed', 'unknown')),
  
  -- Timestamps
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login timestamptz,
  deleted_at timestamptz
);

-- =========================
-- CORE SYSTEM TABLES
-- =========================
CREATE TABLE IF NOT EXISTS notifications (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  category_id bigint, -- Will reference notification_categories later
  is_read boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  actor_id bigint REFERENCES profiles(id),
  action text NOT NULL,
  subject_type text,
  subject_id text,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkins (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkin_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS report (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  reporter_id bigint REFERENCES profiles(id),
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  reason text,
  status text NOT NULL CHECK (status IN ('open','reviewing','resolved','rejected')) DEFAULT 'open',
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS action (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  report_id bigint REFERENCES report(id) ON DELETE SET NULL,
  actor_id bigint REFERENCES profiles(id),
  action text NOT NULL, -- hide, delete, warn, ban
  notes text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS ban (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  target_id bigint NOT NULL,
  reason text,
  target_type text NOT NULL CHECK (target_type IN ('post', 'chat', 'comment', 'course', 'user', 'other')) DEFAULT 'user',
  status text NOT NULL CHECK (status IN ('approved','pending', 'rejected')) DEFAULT 'pending',
  expires_at timestamptz,
  message text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- =========================
-- AI SYSTEM TABLES
-- =========================
CREATE TABLE IF NOT EXISTS ai_agent (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  owner_id bigint REFERENCES profiles(id),
  purpose text,
  config jsonb NOT NULL DEFAULT '{}',
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS ai_run (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  agent_id bigint NOT NULL REFERENCES ai_agent(id) ON DELETE CASCADE,
  requester_id bigint REFERENCES profiles(id),
  input jsonb NOT NULL,
  output jsonb,
  status text NOT NULL CHECK (status IN ('queued','running','succeeded','failed','needs_review')) DEFAULT 'queued',
  reviewed_by bigint REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_note text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
-- =========================
-- COURSE SYSTEM TABLES (Part 2)
-- =========================

CREATE TABLE IF NOT EXISTS course_attachments (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id bigint NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  title text NOT NULL,
  url text,
  type text DEFAULT 'other',
  cloudinary_hls_url text,
  cloudinary_mp3 text,
  cloudinary_processed_at timestamptz,
  cloudinary_public_id text,
  size int,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS course (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id bigint NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  slug text UNIQUE,
  video_intro_url text,
  requirements text[],
  learning_objectives text[],
  category text,
  language text DEFAULT 'en',
  certificate_template text,
  auto_create_classroom boolean DEFAULT true,
  auto_create_community boolean DEFAULT true,
  visibility text NOT NULL CHECK (visibility IN ('public','private','unlisted')) DEFAULT 'private',
  price_cents int DEFAULT 0,
  currency text DEFAULT 'MYR',
  tags text[] DEFAULT '{}',
  thumbnail_url text,
  level text CHECK (level IN ('beginner','intermediate','advanced')) DEFAULT 'beginner',
  total_lessons int DEFAULT 0,
  total_duration_minutes int DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 0,
  total_students int DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  status text CHECK(status IN ('active', 'pending', 'inactive', 'ban', 'rejected')) DEFAULT 'inactive',
  rejected_message text,
  community_group_public_id UUID, -- Forward reference, will be created later
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS course_module (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id bigint NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  title text NOT NULL,
  position int NOT NULL DEFAULT 1,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS course_lesson (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id bigint NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  module_id bigint REFERENCES course_module(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text,
  position int DEFAULT 1,
  description text,
  is_preview boolean DEFAULT false,
  transcript text,
  attachments jsonb DEFAULT '[]'::jsonb,
  kind text NOT NULL CHECK (kind IN ('video','live','document','quiz','assignment','whiteboard')),
  content_url text,
  duration_sec int,
  live_session_id bigint, -- Forward reference
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS course_enrollment (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id bigint NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('student','tutor','owner','assistant')) DEFAULT 'student',
  status text NOT NULL CHECK (status IN ('active','completed','dropped','locked')) DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

CREATE TABLE IF NOT EXISTS course_progress (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id bigint NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('not_started','in_progress','completed')) DEFAULT 'not_started',
  progress_pct numeric(5,2) NOT NULL DEFAULT 0,
  ai_recommendation jsonb DEFAULT '{}'::jsonb,
  time_spent_sec int DEFAULT 0,
  completion_date timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS course_chapter (
  id bigserial PRIMARY KEY,
  lesson_id bigint NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time_sec int,
  end_time_sec int,
  order_index int NOT NULL DEFAULT 1,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Course Reviews
CREATE TABLE IF NOT EXISTS course_reviews (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id bigint NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (course_id, user_id)
);

-- Course Products and Orders
CREATE TABLE IF NOT EXISTS course_product (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  kind text NOT NULL CHECK (kind IN ('course','plugin','resource')),
  ref_id bigint,
  title text NOT NULL,
  price_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'MYR',
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS course_order (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  buyer_id bigint NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('pending','paid','failed','refunded')) DEFAULT 'pending',
  total_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MYR',
  meta jsonb NOT NULL DEFAULT '{}',
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS course_order_item (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id bigint NOT NULL REFERENCES course_order(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES course_product(id) ON DELETE RESTRICT,
  quantity int NOT NULL DEFAULT 1,
  unit_price_cents int NOT NULL,
  subtotal_cents int NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS course_payment (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id bigint NOT NULL REFERENCES course_order(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_ref text,
  amount_cents int NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','succeeded','failed','refunded')),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Course Notes System
CREATE TABLE IF NOT EXISTS course_notes (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id bigint NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  timestamp_sec int, -- Video timestamp
  content text NOT NULL,
  ai_summary text, -- AI generated summary
  tags text[] DEFAULT '{}',
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Course Quiz System
CREATE TABLE IF NOT EXISTS course_quiz_question (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id bigint NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank')),
  options jsonb, -- For multiple choice: ["Option A", "Option B", "Option C", "Option D"]
  correct_answer jsonb NOT NULL, -- For multiple choice: "A", for true/false: true/false, for text: "correct answer"
  explanation text,
  points int DEFAULT 1,
  difficulty int CHECK (difficulty BETWEEN 1 AND 5) DEFAULT 1,
  position int DEFAULT 1,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS course_quiz_submission (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id bigint NOT NULL REFERENCES course_quiz_question(id) ON DELETE CASCADE,
  lesson_id bigint NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  user_answer jsonb NOT NULL,
  is_correct boolean NOT NULL,
  points_earned int DEFAULT 0,
  time_taken_sec int,
  attempt_number int DEFAULT 1,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(user_id, question_id, attempt_number)
);
-- =========================
-- CLASSROOM SYSTEM TABLES (Part 3)
-- =========================

CREATE TABLE IF NOT EXISTS classroom (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  class_code text NOT NULL UNIQUE,
  owner_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id bigint REFERENCES course(id) ON DELETE SET NULL,
  timezone text DEFAULT 'Asia/Kuala_Lumpur',
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'suspended')),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS classroom_member (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  classroom_id bigint NOT NULL REFERENCES classroom(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','tutor','student')) DEFAULT 'student',
  joined_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (classroom_id, user_id)
);

CREATE TABLE IF NOT EXISTS classroom_live_session (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  classroom_id bigint NOT NULL REFERENCES classroom(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  actual_start timestamptz,
  actual_end timestamptz,
  status text NOT NULL CHECK (status IN ('scheduled','live','ended','cancelled')) DEFAULT 'scheduled',
  livekit_room_name text,
  host_id bigint NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  max_participants int,
  recording_enabled boolean DEFAULT false,
  chat_enabled boolean DEFAULT true,
  whiteboard_enabled boolean DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS classroom_attendance (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id bigint NOT NULL REFERENCES classroom_live_session(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz,
  left_at timestamptz,
  duration_minutes int DEFAULT 0,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS classroom_assignment (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  classroom_id bigint NOT NULL REFERENCES classroom(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  attachments jsonb DEFAULT '[]'::jsonb,
  due_date timestamptz,
  max_score int DEFAULT 100,
  submission_type text CHECK (submission_type IN ('file','text','url','quiz')) DEFAULT 'file',
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS classroom_assignment_submission (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assignment_id bigint NOT NULL REFERENCES classroom_assignment(id) ON DELETE CASCADE,
  student_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  attachments jsonb DEFAULT '[]'::jsonb,
  score int,
  feedback text,
  graded_by bigint REFERENCES profiles(id),
  graded_at timestamptz,
  status text CHECK (status IN ('draft','submitted','graded','returned')) DEFAULT 'draft',
  submitted_at timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (assignment_id, student_id)
);

-- Course Quiz Sessions
CREATE TABLE IF NOT EXISTS course_quiz_session (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lesson_id bigint NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  status text CHECK (status IN ('active','completed','abandoned')) DEFAULT 'active',
  time_limit_minutes int,
  time_spent_seconds int DEFAULT 0,
  total_questions int DEFAULT 0,
  correct_answers int DEFAULT 0,
  total_score int DEFAULT 0,
  max_score int DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Mistake Book System
CREATE TABLE IF NOT EXISTS mistake_book (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id bigint REFERENCES course(id) ON DELETE SET NULL,
  lesson_id bigint REFERENCES course_lesson(id) ON DELETE SET NULL,
  mistake_content text NOT NULL,
  analysis text,
  source_type text CHECK (source_type IN ('quiz','assignment','manual','course_quiz')) DEFAULT 'manual',
  knowledge_points text[],
  recommended_exercises jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Learning Path System
CREATE TABLE IF NOT EXISTS learning_path (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal text NOT NULL,
  duration integer NOT NULL, -- in days
  progress numeric(5,2) DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS milestone (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  path_id bigint NOT NULL REFERENCES learning_path(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL,
  status text NOT NULL CHECK (status IN ('locked','in-progress','completed')) DEFAULT 'locked',
  resource_type text,
  resource_id bigint,
  prerequisites jsonb,
  reward jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- =========================
-- COMMUNITY SYSTEM TABLES
-- =========================

CREATE TABLE IF NOT EXISTS community_group (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  name text NOT NULL,
  description text,
  slug text UNIQUE NOT NULL,
  visibility text CHECK (visibility IN ('public','private')) DEFAULT 'public',
  owner_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS community_group_member (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id bigint NOT NULL REFERENCES community_group(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text CHECK (role IN ('owner','admin','member')) DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_post (
  id bigserial PRIMARY KEY,
  public_id uuid UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
  group_id bigint REFERENCES community_group(id) ON DELETE SET NULL,
  author_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  body text,
  slug text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  search_vector tsvector,
  UNIQUE (group_id, slug)
);

CREATE TABLE IF NOT EXISTS community_post_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES community_post(public_id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_comment (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  post_id bigint NOT NULL REFERENCES community_post(id) ON DELETE CASCADE,
  author_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id bigint REFERENCES community_comment(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS community_comment_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES community_comment(public_id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_reaction (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id bigint NOT NULL,
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS community_points_ledger (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points int NOT NULL,
  reason text,
  ref jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS community_achievement (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  rule jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS community_user_achievement (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id bigint NOT NULL REFERENCES community_achievement(id) ON DELETE CASCADE,
  current_value int NOT NULL DEFAULT 0,
  unlocked boolean NOT NULL DEFAULT false,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS community_checkin (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkin_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);
-- =========================
-- COMMUNITY QUIZ SYSTEM (Part 4)
-- =========================

-- Subject table for quiz categorization
CREATE TABLE IF NOT EXISTS community_quiz_subject (
  id bigserial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  translations jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Grade table for quiz level classification
CREATE TABLE IF NOT EXISTS community_quiz_grade (
  id bigserial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  translations jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_quiz (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  tags text[],
  difficulty int CHECK (difficulty BETWEEN 1 AND 5),
  max_attempts int NOT NULL DEFAULT 1,
  visibility text CHECK (visibility IN ('public','private')) DEFAULT 'public',
  time_limit_minutes int,
  subject_id bigint REFERENCES community_quiz_subject(id),
  grade_id bigint REFERENCES community_quiz_grade(id),
  search_vector_en tsvector,
  search_vector_zh tsvector,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_quiz_question (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  quiz_id bigint NOT NULL REFERENCES community_quiz(id),
  slug text NOT NULL,
  question_type text NOT NULL DEFAULT 'single_choice' CHECK (question_type IN ('single_choice', 'multiple_choice', 'fill_in_blank')),
  question_text text NOT NULL,
  options text[],
  correct_answers text[],
  explanation text,
  UNIQUE(quiz_id, slug)
);

CREATE TABLE IF NOT EXISTS community_quiz_attempt (
  id bigserial PRIMARY KEY,
  quiz_id bigint NOT NULL REFERENCES community_quiz(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'graded')),
  score int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_quiz_attempt_answer (
  id bigserial PRIMARY KEY,
  attempt_id bigint NOT NULL REFERENCES community_quiz_attempt(id) ON DELETE CASCADE,
  question_id bigint NOT NULL REFERENCES community_quiz_question(id),
  user_answer text[],
  is_correct boolean
);

CREATE TABLE IF NOT EXISTS community_quiz_attempt_session (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  attempt_id bigint NOT NULL REFERENCES community_quiz_attempt(id) ON DELETE CASCADE,
  quiz_id bigint NOT NULL REFERENCES community_quiz(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  session_token varchar(255) NOT NULL UNIQUE,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed')),
  time_limit_minutes integer,
  time_spent_seconds integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  current_question_index integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL,
  browser_info jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(attempt_id)
);

CREATE TABLE IF NOT EXISTS community_quiz_permission (
  id bigserial PRIMARY KEY,
  quiz_id bigint NOT NULL REFERENCES community_quiz(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  permission_type text NOT NULL CHECK (permission_type IN ('view', 'attempt', 'edit')),
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(quiz_id, user_id, permission_type)
);

-- Add unique index on (quiz_id, user_id)
create unique index if not exists uq_cqp_quiz_user
on community_quiz_permission (quiz_id, user_id);

create table if not exists community_quiz_invite_token (
  id bigserial primary key,
  token text unique not null,
  quiz_id bigint not null references community_quiz(id),
  permission_type text not null check (permission_type in ('view', 'attempt', 'edit')),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz,
  max_uses int DEFAULT NULL,
  current_uses int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_quiz_like (
  id bigserial PRIMARY KEY,
  quiz_id bigint NOT NULL REFERENCES community_quiz(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(quiz_id, user_id)
);

-- =========================
-- ENHANCED NOTIFICATION SYSTEM
-- =========================

CREATE TABLE IF NOT EXISTS notification_categories (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  icon text,
  color text,
  default_enabled boolean DEFAULT true,
  priority int DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  is_system boolean DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS notification_templates (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  category_id bigint NOT NULL REFERENCES notification_categories(id) ON DELETE CASCADE,
  template_key text NOT NULL UNIQUE,
  subject_template text,
  body_template text NOT NULL,
  push_template text,
  email_template text,
  variables jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id bigint NOT NULL REFERENCES notification_categories(id) ON DELETE CASCADE,
  push_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,
  frequency text DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'never')),
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text DEFAULT 'UTC',
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (user_id, category_id)
);

CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  notification_id bigint NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  delivery_method text NOT NULL CHECK (delivery_method IN ('push', 'email', 'sms', 'in_app')),
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')) DEFAULT 'pending',
  external_id text, -- OneSignal notification ID, email provider ID, etc.
  external_response jsonb,
  error_message text,
  retry_count int DEFAULT 0,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- =========================
-- EMBEDDING SYSTEM TABLES
-- =========================

CREATE TABLE IF NOT EXISTS embeddings (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  content_type text NOT NULL CHECK (content_type IN ('profile', 'post', 'comment', 'course', 'lesson', 'auth_user')),
  content_id bigint NOT NULL,
  content_hash text NOT NULL,
  
  -- Dual embedding support
  embedding vector(384), -- Legacy E5-Small embedding
  embedding_e5_small vector(384), -- E5-Small embedding (384d)
  embedding_bge_m3 vector(1024), -- BGE-M3 embedding (1024d)
  
  content_text text NOT NULL,
  chunk_type text CHECK (chunk_type IN ('summary', 'section', 'paragraph', 'detail')),
  hierarchy_level int DEFAULT 0,
  parent_chunk_id bigint REFERENCES embeddings(id),
  section_title text,
  semantic_density float CHECK (semantic_density >= 0 AND semantic_density <= 1),
  key_terms text[],
  sentence_count int DEFAULT 0,
  word_count int DEFAULT 0,
  has_code_block boolean DEFAULT false,
  has_table boolean DEFAULT false,
  has_list boolean DEFAULT false,
  chunk_language text DEFAULT 'en',
  
  -- Embedding model tracking
  embedding_model text DEFAULT 'intfloat/e5-small',
  embedding_e5_model text DEFAULT 'intfloat/e5-small',
  embedding_bge_model text DEFAULT 'BAAI/bge-m3',
  
  -- Embedding availability flags
  has_e5_embedding boolean DEFAULT false,
  has_bge_embedding boolean DEFAULT false,
  
  language text DEFAULT 'en',
  token_count int,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'outdated')) DEFAULT 'pending',
  error_message text,
  retry_count int DEFAULT 0,
  
  -- Timestamps
  embedding_created_at timestamptz,
  embedding_updated_at timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  
  UNIQUE(content_type, content_id)
);

CREATE TABLE IF NOT EXISTS embedding_queue (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  content_type text NOT NULL CHECK (content_type IN ('profile', 'post', 'comment', 'course', 'lesson', 'auth_user')),
  content_id bigint NOT NULL,
  content_text text NOT NULL,
  content_hash text NOT NULL,
  
  -- Dual embedding processing
  embedding_types text[] DEFAULT ARRAY['e5', 'bge'],
  processed_embeddings text[] DEFAULT ARRAY[]::text[],
  failed_embeddings text[] DEFAULT ARRAY[]::text[],
  
  priority int DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  scheduled_at timestamptz DEFAULT now(),
  processing_started_at timestamptz,
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3,
  status text NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')) DEFAULT 'queued',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_type, content_id)
);

CREATE TABLE IF NOT EXISTS embedding_searches (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint REFERENCES profiles(id) ON DELETE SET NULL,
  query_text text NOT NULL,
  query_embedding vector(384), -- E5 query embedding
  query_embedding_bge vector(1024), -- BGE query embedding
  content_types text[] DEFAULT '{}',
  similarity_threshold numeric(3,2) DEFAULT 0.7,
  max_results int DEFAULT 10,
  
  -- Search type and weights for hybrid search
  search_type text DEFAULT 'hybrid' CHECK (search_type IN ('e5_only', 'bge_only', 'hybrid')),
  embedding_weights jsonb DEFAULT '{"e5": 0.4, "bge": 0.6}'::jsonb,
  
  results_count int DEFAULT 0,
  results_data jsonb DEFAULT '[]'::jsonb,
  processing_time_ms int,
  embedding_time_ms int,
  search_time_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_hierarchy (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  content_type text NOT NULL,
  content_id bigint NOT NULL,
  document_title text,
  document_structure jsonb,
  summary_embedding_id bigint REFERENCES embeddings(id),
  total_chunks int DEFAULT 0,
  estimated_reading_time int DEFAULT 0,
  has_table_of_contents boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_type, content_id)
);
-- =========================
-- VIDEO PROCESSING SYSTEM (Part 5)
-- =========================

CREATE TABLE IF NOT EXISTS video_embeddings (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  attachment_id bigint NOT NULL REFERENCES course_attachments(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('profile', 'post', 'comment', 'course', 'lesson', 'auth_user')),
  
  -- Dual embedding support (updated from migration)
  embedding vector(384), -- Legacy embedding
  embedding_e5_small vector(384), -- E5-Small embedding
  embedding_bge_m3 vector(1024), -- BGE-M3 embedding
  
  content_text text NOT NULL,
  chunk_type text CHECK (chunk_type IN ('summary', 'section', 'paragraph', 'detail', 'segment')),
  hierarchy_level int DEFAULT 0,
  parent_chunk_id bigint REFERENCES embeddings(id),
  section_title text,
  semantic_density float CHECK (semantic_density >= 0 AND semantic_density <= 1),
  key_terms text[],
  sentence_count int DEFAULT 0,
  word_count int DEFAULT 0,
  has_code_block boolean DEFAULT false,
  has_table boolean DEFAULT false,
  has_list boolean DEFAULT false,
  chunk_language text DEFAULT 'en',
  
  -- Embedding model tracking
  embedding_model text DEFAULT 'intfloat/e5-small',
  embedding_e5_model text DEFAULT 'intfloat/e5-small',
  embedding_bge_model text DEFAULT 'BAAI/bge-m3',
  
  -- Embedding availability flags
  has_e5_embedding boolean DEFAULT false,
  has_bge_embedding boolean DEFAULT false,
  
  -- Video segment specific fields (from migration)
  segment_start_time float DEFAULT NULL,
  segment_end_time float DEFAULT NULL,
  segment_index int DEFAULT NULL,
  total_segments int DEFAULT NULL,
  segment_duration float GENERATED ALWAYS AS (
    CASE 
      WHEN segment_start_time IS NOT NULL AND segment_end_time IS NOT NULL 
      THEN segment_end_time - segment_start_time 
      ELSE NULL 
    END
  ) STORED,
  
  -- Context and relationship fields
  prev_segment_id bigint REFERENCES video_embeddings(id),
  next_segment_id bigint REFERENCES video_embeddings(id),
  segment_overlap_start float DEFAULT NULL,
  segment_overlap_end float DEFAULT NULL,
  
  -- Segment quality and content metadata
  contains_code boolean DEFAULT false,
  contains_math boolean DEFAULT false,
  contains_diagram boolean DEFAULT false,
  topic_keywords text[] DEFAULT '{}',
  confidence_score float DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  language text DEFAULT 'en',
  token_count int,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'outdated')) DEFAULT 'pending',
  error_message text,
  retry_count int DEFAULT 0,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS video_processing_queue (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  attachment_id bigint NOT NULL REFERENCES course_attachments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Processing step information (simplified flow: transcribe → embed)
  current_step VARCHAR(50) NOT NULL CHECK (current_step IN ('upload', 'transcribe', 'embed', 'completed', 'failed', 'cancelled')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying', 'cancelled')) DEFAULT 'pending',
  
  -- QStash integration
  qstash_message_id TEXT,
  qstash_schedule_id TEXT,
  
  -- Retry configuration
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 5, -- Increased for HuggingFace cold starts
  retry_delay_minutes INT DEFAULT 1,
  
  -- Error handling
  error_message TEXT,
  error_details JSONB,
  last_error_at TIMESTAMPTZ,
  
  -- Step data storage
  step_data JSONB DEFAULT '{}',
  processing_metadata JSONB DEFAULT '{}',
  
  -- Progress tracking
  progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  estimated_completion_time TIMESTAMPTZ,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS video_processing_steps (
  id bigserial PRIMARY KEY,
  queue_id bigint NOT NULL REFERENCES video_processing_queue(id) ON DELETE CASCADE,
  step_name VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
  
  -- Step execution details
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INT,
  
  -- Step-specific data
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  
  -- QStash tracking
  qstash_message_id TEXT,
  retry_count INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- TUTORING SYSTEM TABLES
-- =========================

CREATE TABLE IF NOT EXISTS tutoring_tutors (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  headline text,
  subjects text[] NOT NULL DEFAULT '{}',
  hourly_rate numeric(10,2),
  qualifications text,
  rating_avg numeric(3,2) DEFAULT 0,
  rating_count int DEFAULT 0,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS tutoring_students (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school text,
  grade text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS tutoring_availability (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tutor_id bigint NOT NULL REFERENCES tutoring_tutors(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  rrule text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS tutoring_appointments (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tutor_id bigint NOT NULL REFERENCES tutoring_tutors(id) ON DELETE RESTRICT,
  student_id bigint NOT NULL REFERENCES tutoring_students(id) ON DELETE RESTRICT,
  scheduled_at timestamptz NOT NULL,
  duration_min int NOT NULL CHECK (duration_min > 0),
  status text NOT NULL CHECK (status IN ('requested','confirmed','completed','cancelled')) DEFAULT 'requested',
  notes text,
  created_by bigint REFERENCES profiles(id),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS tutoring_file (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS tutoring_note (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  body text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS tutoring_share (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  resource_kind text NOT NULL CHECK (resource_kind IN ('file','note')),
  resource_id bigint NOT NULL,
  shared_with bigint REFERENCES profiles(id),
  access text NOT NULL CHECK (access IN ('view','edit','comment')),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- =========================
-- HASHTAGS AND SEARCH
-- =========================

CREATE TABLE IF NOT EXISTS hashtags (
  id bigserial PRIMARY KEY,
  name text UNIQUE NOT NULL CHECK (name <> ''),
  search_vector tsvector
);

CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id uuid REFERENCES community_post(public_id) ON DELETE CASCADE,
  hashtag_id bigint REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

-- =========================
-- ADDITIONAL SYSTEM TABLES
-- =========================

CREATE TABLE IF NOT EXISTS announcements (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_by bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  deep_link TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  onesignal_id TEXT,
  onesignal_response JSONB,
  is_deleted boolean DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS currencies (
  id bigserial PRIMARY KEY,
  code CHAR(3) UNIQUE NOT NULL,
  name VARCHAR(100),
  country VARCHAR(100),
  symbol VARCHAR(10),
  rate_to_usd DECIMAL(15,6),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- CLASSROOM POSTS SYSTEM
-- =========================

CREATE TABLE IF NOT EXISTS classroom_posts (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id bigint NOT NULL REFERENCES classroom_live_session(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS classroom_post_comments (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id bigint NOT NULL REFERENCES classroom_posts(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS classroom_post_reactions (
  id bigserial PRIMARY KEY,
  post_id bigint NOT NULL REFERENCES classroom_posts(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (post_id, user_id, reaction_type)
);

CREATE TABLE IF NOT EXISTS classroom_engagement_report (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES profiles(id),
  course_id bigint NOT NULL REFERENCES course(id),
  participation_score numeric(5,2),
  report jsonb,
  generated_at timestamptz DEFAULT now()
);
-- Column comments for community_quiz_session
COMMENT ON COLUMN community_quiz_session.session_token IS 'Unique token for session validation and security';
COMMENT ON COLUMN community_quiz_session.status IS 'Session status: active (ongoing), paused (temporarily stopped), expired (timed out), completed (finished)';
COMMENT ON COLUMN community_quiz_session.time_limit_minutes IS 'Total time limit for this session in minutes, copied from quiz settings';
COMMENT ON COLUMN community_quiz_session.time_spent_seconds IS 'Total time spent in this session in seconds';
COMMENT ON COLUMN community_quiz_session.current_question_index IS 'Current question index (0-based) for progress tracking';
COMMENT ON COLUMN community_quiz_session.browser_info IS 'Browser and client information for session validation';

CREATE TABLE IF NOT EXISTS roles (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS permissions (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS role_permission (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  role_id bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id bigint NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS admin_roles (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  role_permission_id bigint NOT NULL REFERENCES role_permission(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- TODO: 整理到database.sql, rls.sql, function.sql, trigger.sql， index.sql
-- Direct Messages Tables
CREATE TABLE IF NOT EXISTS direct_messages (
  id bigserial not null,
  public_id uuid not null default uuid_generate_v4 (),
  conversation_id bigint not null,
  sender_id bigint not null,
  content text not null,
  message_type text not null default 'text'::text,
  attachment_id bigint null,
  reply_to_id bigint null,
  is_edited boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone null,
  delivered_at timestamp with time zone null,
  constraint direct_messages_pkey primary key (id),
  constraint direct_messages_attachment_id_fkey foreign KEY (attachment_id) references chat_attachments (id),
  constraint direct_messages_conversation_id_fkey foreign KEY (conversation_id) references direct_conversations (id) on delete CASCADE,
  constraint direct_messages_reply_to_id_fkey foreign KEY (reply_to_id) references direct_messages (id) on delete set null,
  constraint direct_messages_sender_id_fkey foreign KEY (sender_id) references profiles (id) on delete CASCADE,
  constraint direct_messages_message_type_check check (
    (
      message_type = any (
        array[
          'text'::text,
          'image'::text,
          'file'::text,
          'system'::text,
          'share_post'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_direct_messages_conversation_id on public.direct_messages using btree (conversation_id) TABLESPACE pg_default;

create index IF not exists idx_direct_messages_sender_id on public.direct_messages using btree (sender_id) TABLESPACE pg_default;

create index IF not exists idx_direct_messages_created_at on public.direct_messages using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_direct_messages_conversation_created on public.direct_messages using btree (conversation_id, created_at desc) TABLESPACE pg_default;

create trigger update_conversation_on_message_insert
after INSERT on direct_messages for EACH row
execute FUNCTION update_conversation_on_new_message ();

create trigger update_direct_messages_updated_at BEFORE
update on direct_messages for EACH row
execute FUNCTION update_updated_at_column ();

CREATE TABLE IF NOT EXISTS message_read_status (
  id bigserial not null,
  message_id bigint not null,
  user_id bigint not null,
  read_at timestamp with time zone not null default now(),
  constraint message_read_status_pkey primary key (id),
  constraint unique_read_status unique (message_id, user_id),
  constraint message_read_status_message_id_fkey foreign KEY (message_id) references direct_messages (id) on delete CASCADE,
  constraint message_read_status_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_message_read_status_message_id on public.message_read_status using btree (message_id) TABLESPACE pg_default;

create index IF not exists idx_message_read_status_user_id on public.message_read_status using btree (user_id) TABLESPACE pg_default;

-- Group Messages Tables
CREATE TABLE IF NOT EXISTS group_messages (
  id bigserial not null,
  conversation_id bigint not null,
  sender_id bigint not null,
  content text not null,
  attachment_id bigint null,
  is_deleted boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone null,
  message_type text not null default 'text'::text,
  reply_to_id bigint null,
  is_edited boolean not null default false,
  constraint group_messages_pkey primary key (id),
  constraint group_messages_reply_to_id_fkey foreign KEY (reply_to_id) references group_messages (id) on delete set null,
  constraint group_messages_sender_id_fkey foreign KEY (sender_id) references profiles (id) on delete CASCADE,
  constraint group_messages_conversation_id_fkey foreign KEY (conversation_id) references group_conversations (id) on delete CASCADE,
  constraint group_messages_attachment_id_fkey foreign KEY (attachment_id) references chat_attachments (id) on delete set null,
  constraint group_messages_message_type_check check (
    (
      message_type = any (
        array[
          'text'::text,
          'image'::text,
          'file'::text,
          'system'::text,
          'share_post'::text
        ]
      )
    )
  ),
  constraint group_messages_content_check check ((length(content) >= 1))
) TABLESPACE pg_default;

create index IF not exists idx_group_messages_conversation_id on public.group_messages using btree (conversation_id) TABLESPACE pg_default;

create index IF not exists idx_group_messages_sender_id on public.group_messages using btree (sender_id) TABLESPACE pg_default;

create index IF not exists idx_group_messages_created_at on public.group_messages using btree (conversation_id, created_at desc) TABLESPACE pg_default;

create index IF not exists idx_group_messages_not_deleted on public.group_messages using btree (conversation_id, created_at desc) TABLESPACE pg_default
where
  (is_deleted = false);

CREATE TABLE IF NOT EXISTS group_message_read_status (
  id bigserial not null,
  message_id bigint not null,
  user_id bigint not null,
  read_at timestamp with time zone not null default now(),
  constraint group_message_read_status_pkey primary key (id),
  constraint group_message_read_status_message_id_user_id_key unique (message_id, user_id),
  constraint group_message_read_status_message_id_fkey foreign KEY (message_id) references group_messages (id) on delete CASCADE,
  constraint group_message_read_status_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_group_message_read_status_message_id on public.group_message_read_status using btree (message_id) TABLESPACE pg_default;

create index IF not exists idx_group_message_read_status_user_id on public.group_message_read_status using btree (user_id) TABLESPACE pg_default;