-- Comprehensive Course System Migration
-- This migration adds all tables needed for the complete course functionality

-- Add missing fields to existing course table
ALTER TABLE course 
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS video_intro_url text,
  ADD COLUMN IF NOT EXISTS requirements text[],
  ADD COLUMN IF NOT EXISTS learning_objectives text[],
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS certificate_template text,
  ADD COLUMN IF NOT EXISTS auto_create_classroom boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_create_community boolean DEFAULT true;

-- Add missing fields to course_lesson
ALTER TABLE course_lesson
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS position int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_preview boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS transcript text,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Update course_progress with AI recommendations
ALTER TABLE course_progress
  ADD COLUMN IF NOT EXISTS ai_recommendation jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS time_spent_sec int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_date timestamptz;

-- Course Notes (enhanced from existing)
CREATE TABLE IF NOT EXISTS course_notes (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4(),
  user_id bigint not null references profiles(id) on delete cascade,
  lesson_id bigint not null references course_lesson(id) on delete cascade,
  timestamp_sec int, -- 视频内时间点
  content text not null,
  ai_summary text, -- AI生成的总结
  tags text[] DEFAULT '{}',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Course Quiz Questions (enhanced)
CREATE TABLE IF NOT EXISTS course_quiz_question (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4(),
  lesson_id bigint not null references course_lesson(id) on delete cascade,
  question_text text not null,
  question_type text not null check (question_type in ('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank')),
  options jsonb, -- For multiple choice: ["Option A", "Option B", "Option C", "Option D"]
  correct_answer jsonb not null, -- For multiple choice: "A", for true/false: true/false, for text: "correct answer"
  explanation text,
  points int DEFAULT 1,
  difficulty int check (difficulty between 1 and 5) DEFAULT 1,
  position int DEFAULT 1,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Course Quiz Submissions (enhanced)
CREATE TABLE IF NOT EXISTS course_quiz_submission (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4(),
  user_id bigint not null references profiles(id) on delete cascade,
  question_id bigint not null references course_quiz_question(id) on delete cascade,
  lesson_id bigint not null references course_lesson(id) on delete cascade,
  user_answer jsonb not null,
  is_correct boolean not null,
  points_earned int DEFAULT 0,
  time_taken_sec int,
  attempt_number int DEFAULT 1,
  submitted_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  UNIQUE(user_id, question_id, attempt_number)
);

-- Course Concepts for Knowledge Graph
CREATE TABLE IF NOT EXISTS course_concept (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4(),
  course_id bigint not null references course(id) on delete cascade,
  name text not null,
  description text,
  embedding vector(1536), -- For AI similarity search
  difficulty_level int check (difficulty_level between 1 and 5) DEFAULT 1,
  estimated_time_minutes int DEFAULT 30,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Course Concept Links for Knowledge Graph
CREATE TABLE IF NOT EXISTS course_concept_link (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4(),
  source_concept_id bigint not null references course_concept(id) on delete cascade,
  target_concept_id bigint not null references course_concept(id) on delete cascade,
  relation_type text not null check (relation_type in ('prerequisite', 'related', 'example_of', 'part_of', 'leads_to')),
  strength numeric(3,2) DEFAULT 1.0 check (strength between 0 and 1), -- Relationship strength
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  UNIQUE(source_concept_id, target_concept_id, relation_type)
);

-- Course Concept to Lesson Mapping
CREATE TABLE IF NOT EXISTS course_concept_lesson (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4(),
  concept_id bigint not null references course_concept(id) on delete cascade,
  lesson_id bigint not null references course_lesson(id) on delete cascade,
  relevance_score numeric(3,2) DEFAULT 1.0 check (relevance_score between 0 and 1),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  UNIQUE(concept_id, lesson_id)
);

-- Course Certificates
CREATE TABLE IF NOT EXISTS course_certificate (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4(),
  user_id bigint not null references profiles(id) on delete cascade,
  course_id bigint not null references course(id) on delete cascade,
  certificate_url text,
  completion_percentage numeric(5,2) not null,
  final_score numeric(5,2),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  UNIQUE(user_id, course_id)
);

-- Course Learning Analytics
CREATE TABLE IF NOT EXISTS course_analytics (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4(),
  user_id bigint not null references profiles(id) on delete cascade,
  course_id bigint not null references course(id) on delete cascade,
  lesson_id bigint references course_lesson(id) on delete cascade,
  event_type text not null, -- 'lesson_start', 'lesson_complete', 'quiz_attempt', 'note_created', etc.
  event_data jsonb DEFAULT '{}'::jsonb,
  session_id uuid,
  timestamp timestamptz not null default now(),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Course Discussion Forums (separate from community groups)
CREATE TABLE IF NOT EXISTS course_discussion (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4(),
  course_id bigint not null references course(id) on delete cascade,
  lesson_id bigint references course_lesson(id) on delete set null,
  author_id bigint not null references profiles(id) on delete cascade,
  title text not null,
  content text not null,
  is_pinned boolean DEFAULT false,
  is_resolved boolean DEFAULT false,
  view_count int DEFAULT 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Course Discussion Replies
CREATE TABLE IF NOT EXISTS course_discussion_reply (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4(),
  discussion_id bigint not null references course_discussion(id) on delete cascade,
  author_id bigint not null references profiles(id) on delete cascade,
  parent_reply_id bigint references course_discussion_reply(id) on delete cascade,
  content text not null,
  is_solution boolean DEFAULT false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Update mistake_book for course integration
ALTER TABLE mistake_book
  ADD COLUMN IF NOT EXISTS course_question_id bigint references course_quiz_question(id) on delete set null,
  ADD COLUMN IF NOT EXISTS course_id bigint references course(id) on delete set null,
  ADD COLUMN IF NOT EXISTS lesson_id bigint references course_lesson(id) on delete set null;

-- Update source_type check constraint
ALTER TABLE mistake_book DROP CONSTRAINT IF EXISTS mistake_book_source_type_check;
ALTER TABLE mistake_book ADD CONSTRAINT mistake_book_source_type_check 
  CHECK (source_type in ('quiz','assignment','manual','course_quiz'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_slug ON course (slug) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_course_lesson_position ON course_lesson (course_id, position) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_course_progress_user_course ON course_progress (user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_user_lesson ON course_notes (user_id, lesson_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_course_quiz_lesson ON course_quiz_question (lesson_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_course_concept_course ON course_concept (course_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_course_analytics_user_course ON course_analytics (user_id, course_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_course_discussion_course ON course_discussion (course_id) WHERE is_deleted = false;

-- Create triggers for automatic slug generation
CREATE OR REPLACE FUNCTION generate_course_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9\s]', '', 'g'));
    NEW.slug := regexp_replace(NEW.slug, '\s+', '-', 'g');
    NEW.slug := NEW.slug || '-' || substring(NEW.public_id::text from 1 for 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_lesson_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9\s]', '', 'g'));
    NEW.slug := regexp_replace(NEW.slug, '\s+', '-', 'g');
    NEW.slug := NEW.slug || '-' || substring(NEW.public_id::text from 1 for 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS course_slug_trigger ON course;
CREATE TRIGGER course_slug_trigger
  BEFORE INSERT OR UPDATE ON course
  FOR EACH ROW EXECUTE FUNCTION generate_course_slug();

DROP TRIGGER IF EXISTS lesson_slug_trigger ON course_lesson;
CREATE TRIGGER lesson_slug_trigger
  BEFORE INSERT OR UPDATE ON course_lesson
  FOR EACH ROW EXECUTE FUNCTION generate_lesson_slug();

-- Function to automatically create classroom and community group when course is purchased
CREATE OR REPLACE FUNCTION create_course_resources()
RETURNS TRIGGER AS $$
DECLARE
  classroom_id bigint;
  community_group_id bigint;
  course_record record;
BEGIN
  -- Get course details
  SELECT * INTO course_record FROM course WHERE id = NEW.course_id;
  
  -- Create classroom if auto_create_classroom is true
  IF course_record.auto_create_classroom THEN
    INSERT INTO classroom (
      slug, name, description, class_code, visibility, owner_id
    ) VALUES (
      course_record.slug || '-classroom',
      course_record.title || ' - Classroom',
      'Auto-generated classroom for ' || course_record.title,
      upper(substring(md5(random()::text) from 1 for 8)),
      'private',
      NEW.user_id
    ) RETURNING id INTO classroom_id;
    
    -- Add user as classroom member
    INSERT INTO classroom_member (classroom_id, user_id, role)
    VALUES (classroom_id, NEW.user_id, 'student');
  END IF;
  
  -- Create community group if auto_create_community is true
  IF course_record.auto_create_community THEN
    INSERT INTO community_group (
      name, description, slug, visibility, owner_id
    ) VALUES (
      course_record.title || ' - Community',
      'Auto-generated community for ' || course_record.title,
      course_record.slug || '-community',
      'private',
      course_record.owner_id
    ) RETURNING id INTO community_group_id;
    
    -- Add user as community member
    INSERT INTO community_group_member (group_id, user_id, role)
    VALUES (community_group_id, NEW.user_id, 'member');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS course_enrollment_resources_trigger ON course_enrollment;
CREATE TRIGGER course_enrollment_resources_trigger
  AFTER INSERT ON course_enrollment
  FOR EACH ROW EXECUTE FUNCTION create_course_resources();

-- Function to update mistake_book when quiz is failed
CREATE OR REPLACE FUNCTION handle_quiz_mistake()
RETURNS TRIGGER AS $$
BEGIN
  -- If answer is incorrect, add to mistake book
  IF NOT NEW.is_correct THEN
    INSERT INTO mistake_book (
      user_id, 
      course_question_id, 
      course_id, 
      lesson_id, 
      mistake_content, 
      source_type
    ) 
    SELECT 
      NEW.user_id,
      NEW.question_id,
      cql.course_id,
      NEW.lesson_id,
      cqq.question_text || ' - Incorrect answer: ' || NEW.user_answer::text,
      'course_quiz'
    FROM course_quiz_question cqq
    JOIN course_lesson cl ON cqq.lesson_id = cl.id
    WHERE cqq.id = NEW.question_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quiz_mistake_trigger ON course_quiz_submission;
CREATE TRIGGER quiz_mistake_trigger
  AFTER INSERT ON course_quiz_submission
  FOR EACH ROW EXECUTE FUNCTION handle_quiz_mistake();
