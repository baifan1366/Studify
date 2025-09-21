-- =========================
-- 建议新增的EMBEDDING触发器
-- 基于Studify数据库架构分析
-- =========================

-- =========================
-- 1. 教室相关触发器 (高优先级)
-- =========================

-- 教室信息embedding
CREATE OR REPLACE FUNCTION trigger_classroom_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 检查相关字段是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.description IS DISTINCT FROM OLD.description
     )) THEN
    
    -- 队列embedding，中等优先级
    PERFORM queue_for_embedding_qstash('classroom', NEW.id, 4);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 教室embedding触发器
CREATE TRIGGER classroom_embedding_trigger
  AFTER INSERT OR UPDATE ON classroom
  FOR EACH ROW EXECUTE FUNCTION trigger_classroom_embedding();

-- 直播课程embedding
CREATE OR REPLACE FUNCTION trigger_live_session_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 检查相关字段是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.title IS DISTINCT FROM OLD.title OR
       NEW.description IS DISTINCT FROM OLD.description
     )) THEN
    
    -- 队列embedding
    PERFORM queue_for_embedding_qstash('live_session', NEW.id, 4);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 直播课程embedding触发器
CREATE TRIGGER live_session_embedding_trigger
  AFTER INSERT OR UPDATE ON classroom_live_session
  FOR EACH ROW EXECUTE FUNCTION trigger_live_session_embedding();

-- =========================
-- 2. 作业系统触发器 (高优先级)
-- =========================

-- 作业embedding
CREATE OR REPLACE FUNCTION trigger_assignment_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 检查相关字段是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.title IS DISTINCT FROM OLD.title OR
       NEW.description IS DISTINCT FROM OLD.description
     )) THEN
    
    -- 队列embedding
    PERFORM queue_for_embedding_qstash('assignment', NEW.id, 4);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 作业embedding触发器
CREATE TRIGGER assignment_embedding_trigger
  AFTER INSERT OR UPDATE ON classroom_assignment
  FOR EACH ROW EXECUTE FUNCTION trigger_assignment_embedding();

-- =========================
-- 3. 测验系统触发器 (高优先级)
-- =========================

-- 测验题目embedding
CREATE OR REPLACE FUNCTION trigger_quiz_question_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 检查相关字段是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.question_text IS DISTINCT FROM OLD.question_text OR
       NEW.explanation IS DISTINCT FROM OLD.explanation OR
       NEW.options IS DISTINCT FROM OLD.options
     )) THEN
    
    -- 队列embedding，高优先级（学习相关）
    PERFORM queue_for_embedding_qstash('quiz_question', NEW.id, 3);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 测验题目embedding触发器
CREATE TRIGGER quiz_question_embedding_trigger
  AFTER INSERT OR UPDATE ON course_quiz_question
  FOR EACH ROW EXECUTE FUNCTION trigger_quiz_question_embedding();

-- =========================
-- 4. 笔记系统触发器 (高优先级)
-- =========================

-- 课程笔记embedding
CREATE OR REPLACE FUNCTION trigger_course_note_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 检查相关字段是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.content IS DISTINCT FROM OLD.content OR
       NEW.ai_summary IS DISTINCT FROM OLD.ai_summary OR
       NEW.tags IS DISTINCT FROM OLD.tags
     )) THEN
    
    -- 队列embedding，高优先级（用户生成内容）
    PERFORM queue_for_embedding_qstash('course_note', NEW.id, 3);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 课程笔记embedding触发器
CREATE TRIGGER course_note_embedding_trigger
  AFTER INSERT OR UPDATE ON course_notes
  FOR EACH ROW EXECUTE FUNCTION trigger_course_note_embedding();

-- =========================
-- 5. 评价系统触发器 (中等优先级)
-- =========================

-- 课程评价embedding
CREATE OR REPLACE FUNCTION trigger_course_review_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 检查评论内容是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.comment IS DISTINCT FROM OLD.comment
     )) THEN
    
    -- 只有当评论不为空时才处理
    IF NEW.comment IS NOT NULL AND LENGTH(trim(NEW.comment)) > 0 THEN
      -- 队列embedding，中等优先级
      PERFORM queue_for_embedding_qstash('course_review', NEW.id, 5);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 课程评价embedding触发器
CREATE TRIGGER course_review_embedding_trigger
  AFTER INSERT OR UPDATE ON course_reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_course_review_embedding();

-- =========================
-- 6. 社区群组触发器 (中等优先级)
-- =========================

-- 社区群组embedding
CREATE OR REPLACE FUNCTION trigger_community_group_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 检查相关字段是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.description IS DISTINCT FROM OLD.description
     )) THEN
    
    -- 队列embedding
    PERFORM queue_for_embedding_qstash('community_group', NEW.id, 5);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 社区群组embedding触发器
CREATE TRIGGER community_group_embedding_trigger
  AFTER INSERT OR UPDATE ON community_group
  FOR EACH ROW EXECUTE FUNCTION trigger_community_group_embedding();

-- =========================
-- 7. AI系统触发器 (低优先级)
-- =========================

-- AI代理embedding
CREATE OR REPLACE FUNCTION trigger_ai_agent_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 检查相关字段是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.purpose IS DISTINCT FROM OLD.purpose OR
       NEW.config IS DISTINCT FROM OLD.config
     )) THEN
    
    -- 队列embedding，低优先级
    PERFORM queue_for_embedding_qstash('ai_agent', NEW.id, 6);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- AI代理embedding触发器
CREATE TRIGGER ai_agent_embedding_trigger
  AFTER INSERT OR UPDATE ON ai_agent
  FOR EACH ROW EXECUTE FUNCTION trigger_ai_agent_embedding();

-- =========================
-- 8. 通知系统触发器 (可选)
-- =========================

-- 通知内容embedding (用于智能通知分类和搜索)
CREATE OR REPLACE FUNCTION trigger_notification_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 检查通知内容是否有变化，只处理有实际内容的通知
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.payload IS DISTINCT FROM OLD.payload
     )) THEN
    
    -- 只有当payload包含文本内容时才处理
    IF NEW.payload IS NOT NULL AND 
       (NEW.payload ? 'title' OR NEW.payload ? 'message' OR NEW.payload ? 'content') THEN
      -- 队列embedding，低优先级
      PERFORM queue_for_embedding_qstash('notification', NEW.id, 7);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 通知embedding触发器
CREATE TRIGGER notification_embedding_trigger
  AFTER INSERT OR UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION trigger_notification_embedding();

-- =========================
-- 触发器说明
-- =========================

COMMENT ON TRIGGER classroom_embedding_trigger ON classroom IS 
'自动为教室信息生成embedding，用于教室搜索和推荐功能';

COMMENT ON TRIGGER live_session_embedding_trigger ON classroom_live_session IS 
'自动为直播课程生成embedding，用于课程搜索和相关内容推荐';

COMMENT ON TRIGGER assignment_embedding_trigger ON classroom_assignment IS 
'自动为作业生成embedding，用于作业搜索和相关资源推荐';

COMMENT ON TRIGGER quiz_question_embedding_trigger ON course_quiz_question IS 
'自动为测验题目生成embedding，用于题目搜索和智能组卷功能';

COMMENT ON TRIGGER course_note_embedding_trigger ON course_notes IS 
'自动为课程笔记生成embedding，用于笔记搜索和知识点关联';

COMMENT ON TRIGGER course_review_embedding_trigger ON course_reviews IS 
'自动为课程评价生成embedding，用于评价搜索和情感分析';

COMMENT ON TRIGGER community_group_embedding_trigger ON community_group IS 
'自动为社区群组生成embedding，用于群组发现和推荐';

COMMENT ON TRIGGER ai_agent_embedding_trigger ON ai_agent IS 
'自动为AI代理生成embedding，用于代理搜索和功能匹配';

COMMENT ON TRIGGER notification_embedding_trigger ON notifications IS 
'自动为通知内容生成embedding，用于智能通知分类和搜索';
