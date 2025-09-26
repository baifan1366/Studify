-- =========================
-- AI Learning Coach System
-- Created: 2025-09-26
-- =========================

-- AI学习教练每日计划表
CREATE TABLE IF NOT EXISTS daily_learning_plans (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  
  -- AI生成的计划内容
  plan_title text NOT NULL,
  plan_description text,
  ai_insights text, -- AI分析用户学习状态的洞察
  motivation_message text, -- 激励消息
  
  -- 计划统计
  total_tasks integer NOT NULL DEFAULT 0,
  completed_tasks integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  earned_points integer NOT NULL DEFAULT 0,
  estimated_duration_minutes integer NOT NULL DEFAULT 0,
  actual_duration_minutes integer DEFAULT 0,
  
  -- 状态管理
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  completion_rate decimal(5,2) DEFAULT 0.00,
  
  -- AI生成相关元数据
  ai_model_version text,
  generation_context jsonb DEFAULT '{}', -- 生成时的用户学习状态上下文
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  
  UNIQUE(user_id, plan_date)
);

-- 每日计划任务表（可勾选的微任务）
CREATE TABLE IF NOT EXISTS daily_plan_tasks (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  plan_id bigint NOT NULL REFERENCES daily_learning_plans(id) ON DELETE CASCADE,
  
  -- 任务信息
  task_title text NOT NULL,
  task_description text,
  task_type text NOT NULL CHECK (task_type IN ('study', 'review', 'quiz', 'reading', 'practice', 'video', 'exercise', 'project')),
  
  -- 关联资源
  related_course_id bigint, -- 关联课程
  related_lesson_id bigint, -- 关联课程
  related_content_type text, -- 'course', 'lesson', 'quiz', 'note', 'path'
  related_content_id text, -- 灵活的关联ID
  
  -- 任务属性
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  estimated_minutes integer NOT NULL DEFAULT 15,
  actual_minutes integer DEFAULT 0,
  points_reward integer NOT NULL DEFAULT 5,
  
  -- 完成状态
  is_completed boolean NOT NULL DEFAULT false,
  completion_progress decimal(5,2) DEFAULT 0.00, -- 支持部分完成
  completed_at timestamptz,
  
  -- 排序和分组
  position integer NOT NULL DEFAULT 0,
  category text, -- 任务分类标签
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 学习复盘记录表
CREATE TABLE IF NOT EXISTS learning_retrospectives (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id bigint REFERENCES daily_learning_plans(id) ON DELETE SET NULL,
  
  -- 复盘基本信息
  retro_date date NOT NULL,
  retro_type text NOT NULL DEFAULT 'daily' CHECK (retro_type IN ('daily', 'weekly', 'monthly')),
  
  -- 用户自我评估
  self_rating integer CHECK (self_rating >= 1 AND self_rating <= 5), -- 1-5分自评
  mood_rating text CHECK (mood_rating IN ('very_bad', 'bad', 'neutral', 'good', 'excellent')),
  energy_level integer CHECK (energy_level >= 1 AND energy_level <= 5),
  focus_quality integer CHECK (focus_quality >= 1 AND focus_quality <= 5),
  
  -- 用户反思内容
  achievements_today text, -- 今日成就
  challenges_faced text, -- 遇到的挑战  
  lessons_learned text, -- 学到的经验
  improvements_needed text, -- 需要改进的地方
  tomorrow_goals text, -- 明日目标
  
  -- AI分析结果
  ai_analysis text, -- AI对学习表现的分析
  ai_suggestions text, -- AI建议
  ai_next_focus text, -- AI建议的下一步重点
  strengths_identified text, -- AI识别的优势
  weaknesses_identified text, -- AI识别的弱点
  learning_patterns text, -- AI发现的学习模式
  
  -- 统计数据快照
  study_time_minutes integer DEFAULT 0,
  tasks_completed integer DEFAULT 0,
  points_earned integer DEFAULT 0,
  courses_progressed integer DEFAULT 0,
  achievements_unlocked integer DEFAULT 0,
  
  -- AI生成相关
  ai_model_version text,
  analysis_context jsonb DEFAULT '{}',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 学习教练推送通知记录表
CREATE TABLE IF NOT EXISTS coach_notifications (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 通知基本信息
  notification_type text NOT NULL CHECK (notification_type IN ('daily_plan', 'task_reminder', 'evening_retro', 'motivation', 'achievement', 'streak_reminder')),
  title text NOT NULL,
  message text NOT NULL,
  
  -- 推送相关
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  onesignal_id text, -- OneSignal消息ID
  
  -- 关联内容
  related_plan_id bigint REFERENCES daily_learning_plans(id) ON DELETE SET NULL,
  related_task_id bigint REFERENCES daily_plan_tasks(id) ON DELETE SET NULL,
  related_retro_id bigint REFERENCES learning_retrospectives(id) ON DELETE SET NULL,
  
  -- 状态管理
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
  delivery_status text, -- OneSignal投递状态
  error_message text,
  
  -- 用户交互
  clicked boolean DEFAULT false,
  clicked_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 学习教练设置表
CREATE TABLE IF NOT EXISTS coach_settings (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 通知时间设置
  daily_plan_time time NOT NULL DEFAULT '08:00:00', -- 每日计划推送时间
  evening_retro_time time NOT NULL DEFAULT '20:00:00', -- 晚间复盘提醒时间
  
  -- 个性化设置
  preferred_difficulty text DEFAULT 'medium' CHECK (preferred_difficulty IN ('easy', 'medium', 'hard', 'adaptive')),
  target_daily_minutes integer DEFAULT 60, -- 每日学习目标时间（分钟）
  max_daily_tasks integer DEFAULT 8, -- 每日最大任务数
  
  -- 推送偏好
  enable_daily_plan boolean DEFAULT true,
  enable_task_reminders boolean DEFAULT true,
  enable_evening_retro boolean DEFAULT true,
  enable_motivation_messages boolean DEFAULT true,
  enable_achievement_celebrations boolean DEFAULT true,
  enable_streak_reminders boolean DEFAULT true,
  
  -- 教练风格偏好
  coaching_style text DEFAULT 'balanced' CHECK (coaching_style IN ('gentle', 'balanced', 'intensive', 'adaptive')),
  motivation_type text DEFAULT 'mixed' CHECK (motivation_type IN ('achievement', 'progress', 'social', 'learning', 'mixed')),
  
  -- 学习偏好
  preferred_session_length integer DEFAULT 25, -- 默认25分钟番茄钟
  break_reminder_interval integer DEFAULT 50, -- 休息提醒间隔（分钟）
  
  -- 时区和语言
  timezone text DEFAULT 'Asia/Kuala_Lumpur',
  language text DEFAULT 'en',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- 索引优化
-- =========================

-- 查询优化索引
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_learning_plans(user_id, plan_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_plans_status ON daily_learning_plans(status);
CREATE INDEX IF NOT EXISTS idx_daily_plan_tasks_plan_id ON daily_plan_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_daily_plan_tasks_completion ON daily_plan_tasks(is_completed, position);
CREATE INDEX IF NOT EXISTS idx_learning_retros_user_date ON learning_retrospectives(user_id, retro_date DESC);
CREATE INDEX IF NOT EXISTS idx_coach_notifications_user_scheduled ON coach_notifications(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_coach_notifications_status ON coach_notifications(status, scheduled_at);

-- =========================
-- 触发器函数：自动更新统计
-- =========================

-- 更新每日计划完成统计
CREATE OR REPLACE FUNCTION update_daily_plan_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新关联的每日计划统计
  UPDATE daily_learning_plans 
  SET 
    completed_tasks = (
      SELECT COUNT(*) FROM daily_plan_tasks 
      WHERE plan_id = COALESCE(NEW.plan_id, OLD.plan_id) AND is_completed = true
    ),
    earned_points = (
      SELECT COALESCE(SUM(points_reward), 0) FROM daily_plan_tasks 
      WHERE plan_id = COALESCE(NEW.plan_id, OLD.plan_id) AND is_completed = true
    ),
    actual_duration_minutes = (
      SELECT COALESCE(SUM(actual_minutes), 0) FROM daily_plan_tasks 
      WHERE plan_id = COALESCE(NEW.plan_id, OLD.plan_id) AND is_completed = true
    ),
    completion_rate = (
      SELECT 
        CASE WHEN COUNT(*) = 0 THEN 0 
        ELSE ROUND((COUNT(*) FILTER (WHERE is_completed = true) * 100.0 / COUNT(*)), 2) 
        END
      FROM daily_plan_tasks 
      WHERE plan_id = COALESCE(NEW.plan_id, OLD.plan_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.plan_id, OLD.plan_id);
  
  -- 如果计划完成度达到100%，标记为已完成
  UPDATE daily_learning_plans 
  SET 
    status = 'completed',
    completed_at = now()
  WHERE id = COALESCE(NEW.plan_id, OLD.plan_id) 
    AND completion_rate >= 100.0 
    AND status = 'active';

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 触发器：任务完成状态变更时更新计划统计
DROP TRIGGER IF EXISTS trigger_update_plan_stats ON daily_plan_tasks;
CREATE TRIGGER trigger_update_plan_stats
  AFTER INSERT OR UPDATE OF is_completed, actual_minutes, points_reward OR DELETE
  ON daily_plan_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_plan_stats();

-- =========================
-- 初始化函数：为现有用户创建教练设置
-- =========================

CREATE OR REPLACE FUNCTION initialize_coach_settings_for_existing_users()
RETURNS void AS $$
BEGIN
  INSERT INTO coach_settings (user_id)
  SELECT id FROM profiles 
  WHERE id NOT IN (SELECT user_id FROM coach_settings)
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE NOTICE 'Coach settings initialized for existing users';
END;
$$ LANGUAGE plpgsql;

-- 执行初始化
SELECT initialize_coach_settings_for_existing_users();
