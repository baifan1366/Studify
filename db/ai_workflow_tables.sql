-- =========================
-- AI WORKFLOW SYSTEM TABLES
-- =========================

-- AI工作流执行记录表
CREATE TABLE IF NOT EXISTS ai_workflow_executions (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id text UNIQUE NOT NULL,
  workflow_id text NOT NULL,
  user_id bigint REFERENCES profiles(id),
  
  -- 执行状态
  status text NOT NULL CHECK (status IN ('running','completed','failed','paused')) DEFAULT 'running',
  current_step text,
  completed_steps int DEFAULT 0,
  total_steps int NOT NULL,
  
  -- 结果数据
  step_results jsonb DEFAULT '{}',
  final_result jsonb,
  error_message text,
  
  -- 元数据
  metadata jsonb DEFAULT '{}',
  input_data jsonb NOT NULL,
  execution_time_ms int,
  
  -- 时间戳
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  deleted_at timestamptz
);

-- API错误日志表
CREATE TABLE IF NOT EXISTS api_error_log (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key_name text NOT NULL,
  error_message text NOT NULL,
  error_type text NOT NULL,
  
  -- 错误详情
  request_data jsonb,
  response_data jsonb,
  http_status int,
  
  -- 元数据
  user_agent text,
  ip_address inet,
  workflow_session_id text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- AI调用统计表
CREATE TABLE IF NOT EXISTS ai_usage_stats (
  id bigserial PRIMARY KEY,
  date date NOT NULL DEFAULT current_date,
  api_key_name text NOT NULL,
  model_name text NOT NULL,
  
  -- 使用统计
  total_requests int DEFAULT 0,
  successful_requests int DEFAULT 0,
  failed_requests int DEFAULT 0,
  total_tokens int DEFAULT 0,
  
  -- 性能统计
  avg_response_time_ms int DEFAULT 0,
  min_response_time_ms int DEFAULT 0,
  max_response_time_ms int DEFAULT 0,
  
  -- 成本统计 (如果有)
  estimated_cost_usd decimal(10,4) DEFAULT 0,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(date, api_key_name, model_name)
);

-- AI工作流模板表 (用于存储自定义工作流)
CREATE TABLE IF NOT EXISTS ai_workflow_templates (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  workflow_definition jsonb NOT NULL,
  
  -- 权限和分类
  owner_id bigint REFERENCES profiles(id),
  visibility text NOT NULL CHECK (visibility IN ('public','private','org')) DEFAULT 'private',
  category text,
  tags text[] DEFAULT '{}',
  
  -- 使用统计
  usage_count int DEFAULT 0,
  average_rating decimal(3,2) DEFAULT 0,
  
  -- 状态
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- =========================
-- 索引
-- =========================

-- 工作流执行索引
CREATE INDEX IF NOT EXISTS idx_ai_workflow_executions_session_id ON ai_workflow_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_executions_user_id ON ai_workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_executions_workflow_id ON ai_workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_executions_status ON ai_workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_executions_created_at ON ai_workflow_executions(created_at);

-- API错误日志索引
CREATE INDEX IF NOT EXISTS idx_api_error_log_key_name ON api_error_log(key_name);
CREATE INDEX IF NOT EXISTS idx_api_error_log_error_type ON api_error_log(error_type);
CREATE INDEX IF NOT EXISTS idx_api_error_log_created_at ON api_error_log(created_at);

-- 使用统计索引
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_date ON ai_usage_stats(date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_api_key ON ai_usage_stats(api_key_name);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_model ON ai_usage_stats(model_name);

-- 工作流模板索引
CREATE INDEX IF NOT EXISTS idx_ai_workflow_templates_owner_id ON ai_workflow_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_templates_visibility ON ai_workflow_templates(visibility);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_templates_category ON ai_workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_templates_tags ON ai_workflow_templates USING GIN(tags);

-- =========================
-- 触发器
-- =========================

-- 更新时间触发器
CREATE TRIGGER ai_workflow_executions_updated_at_trigger
  BEFORE UPDATE ON ai_workflow_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER ai_usage_stats_updated_at_trigger
  BEFORE UPDATE ON ai_usage_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER ai_workflow_templates_updated_at_trigger
  BEFORE UPDATE ON ai_workflow_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================
-- 函数：统计和清理
-- =========================

-- 函数：获取AI使用统计
CREATE OR REPLACE FUNCTION get_ai_usage_summary(
  days_back int DEFAULT 7
) RETURNS TABLE (
  total_requests bigint,
  successful_requests bigint,
  failed_requests bigint,
  success_rate decimal,
  total_tokens bigint,
  avg_response_time_ms decimal,
  active_api_keys int,
  top_models jsonb
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      SUM(total_requests) as total_req,
      SUM(successful_requests) as success_req,
      SUM(failed_requests) as failed_req,
      SUM(total_tokens) as total_tok,
      AVG(avg_response_time_ms) as avg_time,
      COUNT(DISTINCT api_key_name) as api_keys,
      jsonb_agg(
        jsonb_build_object(
          'model', model_name,
          'requests', SUM(total_requests)
        ) ORDER BY SUM(total_requests) DESC
      ) as models
    FROM ai_usage_stats 
    WHERE date >= current_date - interval '%s days'
  )
  SELECT 
    s.total_req,
    s.success_req,
    s.failed_req,
    CASE WHEN s.total_req > 0 
         THEN ROUND((s.success_req::decimal / s.total_req::decimal) * 100, 2)
         ELSE 0 END,
    s.total_tok,
    ROUND(s.avg_time, 2),
    s.api_keys,
    s.models
  FROM stats s;
END;
$$;

-- 函数：清理旧数据
CREATE OR REPLACE FUNCTION cleanup_ai_workflow_data(
  days_to_keep int DEFAULT 90
) RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  deleted_count int;
BEGIN
  -- 软删除旧的工作流执行记录
  UPDATE ai_workflow_executions 
  SET is_deleted = true, deleted_at = now()
  WHERE created_at < (current_date - interval '%s days')
    AND is_deleted = false
    AND status IN ('completed', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- 删除旧的API错误日志
  DELETE FROM api_error_log 
  WHERE created_at < (current_date - interval '%s days');
  
  -- 聚合并删除旧的详细统计数据 (保留月度汇总)
  WITH monthly_summary AS (
    INSERT INTO ai_usage_stats (
      date, api_key_name, model_name,
      total_requests, successful_requests, failed_requests,
      total_tokens, avg_response_time_ms, min_response_time_ms, max_response_time_ms,
      estimated_cost_usd
    )
    SELECT 
      date_trunc('month', date)::date,
      api_key_name,
      model_name,
      SUM(total_requests),
      SUM(successful_requests), 
      SUM(failed_requests),
      SUM(total_tokens),
      AVG(avg_response_time_ms)::int,
      MIN(min_response_time_ms),
      MAX(max_response_time_ms),
      SUM(estimated_cost_usd)
    FROM ai_usage_stats
    WHERE date < (current_date - interval '30 days')
      AND date >= (current_date - interval '%s days')
    GROUP BY date_trunc('month', date), api_key_name, model_name
    ON CONFLICT (date, api_key_name, model_name) DO UPDATE SET
      total_requests = EXCLUDED.total_requests,
      successful_requests = EXCLUDED.successful_requests,
      failed_requests = EXCLUDED.failed_requests,
      total_tokens = EXCLUDED.total_tokens,
      avg_response_time_ms = EXCLUDED.avg_response_time_ms,
      updated_at = now()
    RETURNING 1
  )
  DELETE FROM ai_usage_stats 
  WHERE date < (current_date - interval '30 days')
    AND date >= (current_date - interval '%s days')
    AND date != date_trunc('month', date)::date;
  
  RETURN deleted_count;
END;
$$;

-- =========================
-- 注释说明
-- =========================

COMMENT ON TABLE ai_workflow_executions IS '存储AI工作流的执行记录和结果';
COMMENT ON TABLE api_error_log IS '记录API调用错误，用于监控和调试';
COMMENT ON TABLE ai_usage_stats IS '存储AI服务的使用统计，用于成本控制和性能监控';
COMMENT ON TABLE ai_workflow_templates IS '存储自定义工作流模板';

COMMENT ON FUNCTION get_ai_usage_summary(int) IS '获取指定天数的AI使用统计摘要';
COMMENT ON FUNCTION cleanup_ai_workflow_data(int) IS '清理超过指定天数的AI工作流数据';
