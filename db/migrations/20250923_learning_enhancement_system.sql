-- =========================
-- LEARNING ENHANCEMENT SYSTEM
-- 积分兑换课程、学习统计、成就系统数据库结构
-- Created: 2025-09-23
-- =========================

-- 课程积分价格表
CREATE TABLE IF NOT EXISTS course_point_price (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id bigint NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  point_price int NOT NULL CHECK (point_price >= 0), -- 积分价格
  discount_pct numeric(5,2) DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100), -- 折扣百分比
  is_active boolean DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (course_id)
);

-- 积分兑换记录表
CREATE TABLE IF NOT EXISTS point_redemption (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id bigint NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  points_spent int NOT NULL CHECK (points_spent > 0),
  original_price_cents int, -- 原价（分）
  discount_applied numeric(5,2) DEFAULT 0, -- 应用的折扣
  status text NOT NULL CHECK (status IN ('pending','completed','failed','refunded')) DEFAULT 'pending',
  redemption_date timestamptz NOT NULL DEFAULT now(),
  completion_date timestamptz,
  failure_reason text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 学习会话记录表（用于统计学习时长）
CREATE TABLE IF NOT EXISTS study_session (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id bigint REFERENCES course_lesson(id) ON DELETE SET NULL,
  course_id bigint REFERENCES course(id) ON DELETE SET NULL,
  session_start timestamptz NOT NULL DEFAULT now(),
  session_end timestamptz,
  duration_minutes int DEFAULT 0 CHECK (duration_minutes >= 0),
  activity_type text CHECK (activity_type IN ('video_watching','quiz_taking','reading','practice')) DEFAULT 'video_watching',
  engagement_score numeric(3,2) CHECK (engagement_score >= 0 AND engagement_score <= 1), -- AI评估的专注度
  progress_made numeric(5,2) DEFAULT 0, -- 本次学习进度增长
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 学习目标表
CREATE TABLE IF NOT EXISTS learning_goal (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_type text NOT NULL CHECK (goal_type IN ('daily_time','weekly_time','course_completion','achievement_unlock','study_streak')),
  target_value int NOT NULL CHECK (target_value > 0), -- 目标值（分钟/课程数/成就数等）
  current_value int DEFAULT 0 CHECK (current_value >= 0), -- 当前进度
  target_date date, -- 目标截止日期
  reward_type text CHECK (reward_type IN ('points','badge','certificate')),
  reward_value int DEFAULT 0, -- 奖励积分数
  status text NOT NULL CHECK (status IN ('active','completed','expired','paused')) DEFAULT 'active',
  completion_date timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 学习统计摘要表（缓存表，提高查询性能）
CREATE TABLE IF NOT EXISTS learning_statistics (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stat_date date NOT NULL DEFAULT current_date,
  total_study_minutes int DEFAULT 0,
  courses_completed int DEFAULT 0,
  lessons_completed int DEFAULT 0,
  quizzes_taken int DEFAULT 0,
  points_earned int DEFAULT 0,
  achievements_unlocked int DEFAULT 0,
  study_streak_days int DEFAULT 0,
  avg_engagement_score numeric(3,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, stat_date)
);

-- 成就规则扩展（增强现有community_achievement表的规则）
-- 为现有的community_achievement.rule字段添加更多学习相关规则示例
INSERT INTO community_achievement (code, name, description, rule) VALUES 
  ('first_course', '学习启程', '完成第一门课程', '{"type": "course_completion", "target": 1, "points": 100}'),
  ('study_10_hours', '勤学者', '累计学习10小时', '{"type": "total_study_time", "target": 600, "points": 200}'),
  ('study_streak_7', '七日坚持', '连续学习7天', '{"type": "study_streak", "target": 7, "points": 150}'),
  ('quiz_master', '答题专家', '完成50道题目', '{"type": "quiz_completion", "target": 50, "points": 300}'),
  ('point_spender', '积分达人', '使用积分兑换第一门课程', '{"type": "point_redemption", "target": 1, "points": 50}'),
  ('early_bird', '早起学习', '在早上6-8点学习5次', '{"type": "time_based_study", "target": 5, "time_range": "06:00-08:00", "points": 100}'),
  ('night_owl', '夜猫学习', '在晚上22-24点学习5次', '{"type": "time_based_study", "target": 5, "time_range": "22:00-24:00", "points": 100}')
ON CONFLICT (code) DO NOTHING;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_course_point_price_course_id ON course_point_price(course_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_point_redemption_user_id ON point_redemption(user_id);
CREATE INDEX IF NOT EXISTS idx_study_session_user_date ON study_session(user_id, session_start);
CREATE INDEX IF NOT EXISTS idx_learning_goal_user_status ON learning_goal(user_id, status);
CREATE INDEX IF NOT EXISTS idx_learning_statistics_user_date ON learning_statistics(user_id, stat_date);

-- 创建触发器自动更新时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER course_point_price_updated_at_trigger
    BEFORE UPDATE ON course_point_price
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER point_redemption_updated_at_trigger
    BEFORE UPDATE ON point_redemption
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER study_session_updated_at_trigger
    BEFORE UPDATE ON study_session
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER learning_goal_updated_at_trigger
    BEFORE UPDATE ON learning_goal
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER learning_statistics_updated_at_trigger
    BEFORE UPDATE ON learning_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 添加注释
COMMENT ON TABLE course_point_price IS '课程积分价格设置表';
COMMENT ON TABLE point_redemption IS '积分兑换课程记录表';
COMMENT ON TABLE study_session IS '学习会话记录表，用于追踪学习时长和活动';
COMMENT ON TABLE learning_goal IS '个人学习目标设置表';
COMMENT ON TABLE learning_statistics IS '学习统计摘要表，缓存每日学习数据';

-- 初始化一些示例课程的积分价格（可选）
-- INSERT INTO course_point_price (course_id, point_price, discount_pct) 
-- SELECT id, 500, 0 FROM course WHERE is_free = false LIMIT 5;
