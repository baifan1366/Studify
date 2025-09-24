-- =========================
-- LEARNING PATHS TABLE
-- AI生成的个性化学习路径保存系统
-- Created: 2025-09-24
-- =========================

-- 学习路径表
CREATE TABLE IF NOT EXISTS learning_paths (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  
  -- 学习路径核心信息
  learning_goal text NOT NULL,
  current_level text,
  time_constraint text,
  
  -- AI生成的内容
  mermaid_diagram text, -- Mermaid流程图代码
  roadmap jsonb DEFAULT '[]'::jsonb, -- 学习步骤数组
  recommended_courses jsonb DEFAULT '[]'::jsonb, -- 推荐课程数组
  quiz_suggestions jsonb DEFAULT '[]'::jsonb, -- 题库建议数组
  study_tips jsonb DEFAULT '[]'::jsonb, -- 学习建议数组
  
  -- 状态管理
  is_active boolean NOT NULL DEFAULT true,
  progress_pct numeric(5,2) DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  
  -- 元数据
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_learning_paths_user_id ON learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_active ON learning_paths(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_learning_paths_created_at ON learning_paths(created_at DESC);

-- 添加注释
COMMENT ON TABLE learning_paths IS 'AI生成的个性化学习路径存储表';
COMMENT ON COLUMN learning_paths.mermaid_diagram IS 'Mermaid格式的学习路径流程图代码';
COMMENT ON COLUMN learning_paths.roadmap IS '结构化的学习步骤，包含标题、描述、资源等';
COMMENT ON COLUMN learning_paths.recommended_courses IS 'AI推荐的相关课程列表';
COMMENT ON COLUMN learning_paths.quiz_suggestions IS 'AI建议的练习题库';
COMMENT ON COLUMN learning_paths.study_tips IS 'AI提供的学习建议和技巧';
