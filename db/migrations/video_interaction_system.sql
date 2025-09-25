-- Video Interaction System (Views, Likes, Danmaku, Comments)
-- =============================================================

-- Video Views/Watch History
CREATE TABLE IF NOT EXISTS video_views (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id bigint NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  attachment_id bigint REFERENCES course_attachments(id) ON DELETE CASCADE,
  
  -- View tracking
  watch_duration_sec int NOT NULL DEFAULT 0, -- How long they watched
  total_duration_sec int, -- Total video duration at time of view
  watch_percentage float GENERATED ALWAYS AS (
    CASE 
      WHEN total_duration_sec > 0 THEN (watch_duration_sec::float / total_duration_sec::float) * 100
      ELSE 0 
    END
  ) STORED,
  
  -- View session info
  session_start_time timestamptz NOT NULL DEFAULT now(),
  session_end_time timestamptz,
  last_position_sec int DEFAULT 0, -- Where they left off
  device_info jsonb DEFAULT '{}'::jsonb, -- Browser, OS, etc.
  ip_address inet,
  
  -- Completion tracking
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  
  -- Metadata
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id, lesson_id, session_start_time)
);

-- Video Likes
CREATE TABLE IF NOT EXISTS video_likes (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id bigint NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  attachment_id bigint REFERENCES course_attachments(id) ON DELETE CASCADE,
  
  -- Like info
  is_liked boolean NOT NULL DEFAULT true, -- true for like, false for dislike
  
  -- Metadata
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints - one like per user per lesson
  UNIQUE(user_id, lesson_id)
);

-- Danmaku/Bullet Comments
CREATE TABLE IF NOT EXISTS video_danmaku (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id bigint NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  attachment_id bigint REFERENCES course_attachments(id) ON DELETE CASCADE,
  
  -- Danmaku content
  content text NOT NULL CHECK (length(content) <= 100), -- Keep danmaku short
  color text NOT NULL DEFAULT '#FFFFFF' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  size text NOT NULL DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),
  
  -- Video position
  video_time_sec float NOT NULL CHECK (video_time_sec >= 0),
  
  -- Display settings
  display_type text NOT NULL DEFAULT 'scroll' CHECK (display_type IN ('scroll', 'top', 'bottom')),
  font_family text DEFAULT 'Arial',
  
  -- Moderation
  is_approved boolean DEFAULT true,
  is_blocked boolean DEFAULT false,
  blocked_reason text,
  blocked_by bigint REFERENCES profiles(id),
  blocked_at timestamptz,
  
  -- Metadata
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Video Comments
CREATE TABLE IF NOT EXISTS video_comments (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id bigint NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  attachment_id bigint REFERENCES course_attachments(id) ON DELETE CASCADE,
  
  -- Comment threading
  parent_id bigint REFERENCES video_comments(id) ON DELETE CASCADE,
  reply_to_user_id bigint REFERENCES profiles(id), -- For @mentions in replies
  
  -- Comment content
  content text NOT NULL CHECK (length(content) <= 2000),
  content_type text NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'markdown')),
  
  -- Video timestamp (optional - for time-linked comments)
  video_time_sec float CHECK (video_time_sec >= 0),
  
  -- Engagement metrics
  likes_count int NOT NULL DEFAULT 0,
  replies_count int NOT NULL DEFAULT 0,
  
  -- Moderation
  is_approved boolean DEFAULT true,
  is_pinned boolean DEFAULT false, -- For instructor/important comments
  is_blocked boolean DEFAULT false,
  blocked_reason text,
  blocked_by bigint REFERENCES profiles(id),
  blocked_at timestamptz,
  
  -- Metadata
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Index for threading
  INDEX CONCURRENTLY IF NOT EXISTS idx_video_comments_parent ON video_comments(parent_id) WHERE parent_id IS NOT NULL,
  INDEX CONCURRENTLY IF NOT EXISTS idx_video_comments_lesson ON video_comments(lesson_id) WHERE is_deleted = false
);

-- Video Comment Likes
CREATE TABLE IF NOT EXISTS video_comment_likes (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id bigint NOT NULL REFERENCES video_comments(id) ON DELETE CASCADE,
  
  -- Like info
  is_liked boolean NOT NULL DEFAULT true, -- true for like, false for dislike
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints - one like per user per comment
  UNIQUE(user_id, comment_id)
);

-- Indexes for Performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_views_user_lesson ON video_views(user_id, lesson_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_views_lesson ON video_views(lesson_id) WHERE is_deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_likes_lesson ON video_likes(lesson_id) WHERE is_deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_danmaku_lesson_time ON video_danmaku(lesson_id, video_time_sec) WHERE is_deleted = false AND is_approved = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_comments_lesson_created ON video_comments(lesson_id, created_at DESC) WHERE is_deleted = false;

-- Triggers for updating comment counts
CREATE OR REPLACE FUNCTION update_video_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update replies count for parent comment
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE video_comments 
      SET replies_count = replies_count + 1 
      WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update replies count for parent comment
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE video_comments 
      SET replies_count = GREATEST(0, replies_count - 1) 
      WHERE id = OLD.parent_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_video_comment_counts
  AFTER INSERT OR DELETE ON video_comments
  FOR EACH ROW EXECUTE FUNCTION update_video_comment_counts();

-- Trigger for updating comment likes count
CREATE OR REPLACE FUNCTION update_video_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE video_comments 
    SET likes_count = likes_count + CASE WHEN NEW.is_liked THEN 1 ELSE -1 END
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE video_comments 
    SET likes_count = likes_count + CASE 
      WHEN NEW.is_liked AND NOT OLD.is_liked THEN 2
      WHEN NOT NEW.is_liked AND OLD.is_liked THEN -2
      ELSE 0
    END
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE video_comments 
    SET likes_count = GREATEST(0, likes_count - CASE WHEN OLD.is_liked THEN 1 ELSE -1 END)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_video_comment_likes_count
  AFTER INSERT OR UPDATE OR DELETE ON video_comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_video_comment_likes_count();

-- RLS Policies (Row Level Security)
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_danmaku ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_comment_likes ENABLE ROW LEVEL SECURITY;

-- Views policy - users can only see their own views
CREATE POLICY video_views_policy ON video_views
  FOR ALL USING (
    auth.uid()::text = (SELECT auth_user_id::text FROM profiles WHERE id = user_id)
  );

-- Likes policy - users can see all likes but only modify their own
CREATE POLICY video_likes_select_policy ON video_likes
  FOR SELECT USING (true);

CREATE POLICY video_likes_modify_policy ON video_likes
  FOR ALL USING (
    auth.uid()::text = (SELECT auth_user_id::text FROM profiles WHERE id = user_id)
  );

-- Danmaku policy - users can see approved danmaku, only modify their own
CREATE POLICY video_danmaku_select_policy ON video_danmaku
  FOR SELECT USING (is_approved = true AND is_deleted = false);

CREATE POLICY video_danmaku_modify_policy ON video_danmaku
  FOR ALL USING (
    auth.uid()::text = (SELECT auth_user_id::text FROM profiles WHERE id = user_id)
  );

-- Comments policy - users can see all approved comments, only modify their own
CREATE POLICY video_comments_select_policy ON video_comments
  FOR SELECT USING (is_approved = true AND is_deleted = false);

CREATE POLICY video_comments_modify_policy ON video_comments
  FOR ALL USING (
    auth.uid()::text = (SELECT auth_user_id::text FROM profiles WHERE id = user_id)
  );

-- Comment likes policy - users can see all likes but only modify their own
CREATE POLICY video_comment_likes_select_policy ON video_comment_likes
  FOR SELECT USING (true);

CREATE POLICY video_comment_likes_modify_policy ON video_comment_likes
  FOR ALL USING (
    auth.uid()::text = (SELECT auth_user_id::text FROM profiles WHERE id = user_id)
  );

-- Comments on tables
COMMENT ON TABLE video_views IS 'Tracks video viewing sessions and watch progress';
COMMENT ON TABLE video_likes IS 'Video likes and dislikes by users';
COMMENT ON TABLE video_danmaku IS 'Bullet comments (danmaku) overlaid on videos';
COMMENT ON TABLE video_comments IS 'Traditional comments on videos with threading support';
COMMENT ON TABLE video_comment_likes IS 'Likes/dislikes on video comments';

COMMENT ON COLUMN video_views.watch_percentage IS 'Automatically calculated percentage of video watched';
COMMENT ON COLUMN video_danmaku.video_time_sec IS 'Video timestamp when danmaku should appear';
COMMENT ON COLUMN video_comments.video_time_sec IS 'Optional video timestamp for time-linked comments';
COMMENT ON COLUMN video_comments.is_pinned IS 'Whether comment is pinned by instructor/moderator';
