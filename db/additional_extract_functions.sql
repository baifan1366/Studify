-- =========================
-- 安全更新 extract_content_text 函数
-- =========================

-- 先删除旧的函数（如果存在）
DROP FUNCTION IF EXISTS extract_content_text(text, bigint);

-- 重新创建函数
CREATE FUNCTION extract_content_text(
  p_content_type text,
  p_content_id bigint
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result_text text := '';
  temp_text text;
  profile_data record;
  course_data record;
  post_data record;
  comment_data record;
  lesson_data record;
  auth_user_data record;
  classroom_data record;
  live_session_data record;
  assignment_data record;
  quiz_question_data record;
  course_note_data record;
  course_review_data record;
  community_group_data record;
  ai_agent_data record;
  notification_data record;
BEGIN
  CASE p_content_type
    WHEN 'profile' THEN
      SELECT p.display_name, p.full_name, p.bio, p.role, p.timezone, p.preferences
      INTO profile_data
      FROM profiles p 
      WHERE p.id = p_content_id AND p.is_deleted = false;
      
      IF FOUND THEN
        result_text := COALESCE(profile_data.display_name, '') || ' ' ||
                      COALESCE(profile_data.full_name, '') || ' ' ||
                      COALESCE(profile_data.bio, '') || ' ' ||
                      COALESCE(profile_data.role, '') || ' ' ||
                      COALESCE(profile_data.timezone, '');
                      
        -- Extract preferences data for better searchability
        IF profile_data.preferences IS NOT NULL THEN
          -- Extract onboarding data
          IF profile_data.preferences ? 'onboarding' THEN
            temp_text := profile_data.preferences->>'onboarding';
            IF temp_text IS NOT NULL THEN
              result_text := result_text || ' ' || temp_text;
            END IF;
          END IF;
          
          -- Extract interests data
          IF profile_data.preferences ? 'interests' THEN
            IF profile_data.preferences->'interests' ? 'broadField' THEN
              result_text := result_text || ' ' || (profile_data.preferences->'interests'->>'broadField');
            END IF;
            
            IF profile_data.preferences->'interests' ? 'subFields' THEN
              SELECT string_agg(value::text, ' ') INTO temp_text
              FROM jsonb_array_elements_text(profile_data.preferences->'interests'->'subFields');
              IF temp_text IS NOT NULL THEN
                result_text := result_text || ' ' || temp_text;
              END IF;
            END IF;
          END IF;
        END IF;
      END IF;
      
    WHEN 'course' THEN
      SELECT c.title, c.description, c.requirements, c.learning_objectives, c.category, c.tags
      INTO course_data
      FROM course c 
      WHERE c.id = p_content_id AND c.is_deleted = false;
      
      IF FOUND THEN
        result_text := COALESCE(course_data.title, '') || ' ' ||
                      COALESCE(course_data.description, '') || ' ' ||
                      COALESCE(course_data.category, '') || ' ' ||
                      COALESCE(array_to_string(course_data.requirements, ' '), '') || ' ' ||
                      COALESCE(array_to_string(course_data.learning_objectives, ' '), '') || ' ' ||
                      COALESCE(array_to_string(course_data.tags, ' '), '');
      END IF;
      
    WHEN 'post' THEN
      SELECT cp.title, cp.body
      INTO post_data
      FROM community_post cp 
      WHERE cp.id = p_content_id AND cp.is_deleted = false;
      
      IF FOUND THEN
        result_text := COALESCE(post_data.title, '') || ' ' || COALESCE(post_data.body, '');
      END IF;
      
    WHEN 'comment' THEN
      SELECT cc.body
      INTO comment_data
      FROM community_comment cc 
      WHERE cc.id = p_content_id AND cc.is_deleted = false;
      
      IF FOUND THEN
        result_text := COALESCE(comment_data.body, '');
      END IF;
      
    WHEN 'lesson' THEN
      SELECT cl.title, cl.description, cl.transcript
      INTO lesson_data
      FROM course_lesson cl 
      WHERE cl.id = p_content_id AND cl.is_deleted = false;
      
      IF FOUND THEN
        result_text := COALESCE(lesson_data.title, '') || ' ' ||
                      COALESCE(lesson_data.description, '') || ' ' ||
                      COALESCE(lesson_data.transcript, '');
      END IF;
      
    WHEN 'auth_user' THEN
      -- Convert UUID to bigint for auth.users compatibility
      SELECT au.email, au.raw_user_meta_data, au.user_metadata
      INTO auth_user_data
      FROM auth.users au
      WHERE ('x' || lpad(substring(au.id::text, 1, 16), 16, '0'))::bit(64)::bigint = p_content_id;
      
      IF FOUND THEN
        result_text := COALESCE(auth_user_data.email, '');
        
        -- Extract metadata
        IF auth_user_data.raw_user_meta_data IS NOT NULL THEN
          SELECT string_agg(value::text, ' ') INTO temp_text
          FROM jsonb_each_text(auth_user_data.raw_user_meta_data);
          IF temp_text IS NOT NULL THEN
            result_text := result_text || ' ' || temp_text;
          END IF;
        END IF;
        
        IF auth_user_data.user_metadata IS NOT NULL THEN
          SELECT string_agg(value::text, ' ') INTO temp_text
          FROM jsonb_each_text(auth_user_data.user_metadata);
          IF temp_text IS NOT NULL THEN
            result_text := result_text || ' ' || temp_text;
          END IF;
        END IF;
      END IF;
      
    WHEN 'classroom' THEN
      SELECT c.name, c.description
      INTO classroom_data
      FROM classroom c 
      WHERE c.id = p_content_id AND c.is_deleted = false;
      
      IF FOUND THEN
        result_text := COALESCE(classroom_data.name, '') || ' ' ||
                      COALESCE(classroom_data.description, '');
      END IF;
      
    WHEN 'live_session' THEN
      SELECT ls.title, ls.description
      INTO live_session_data
      FROM classroom_live_session ls 
      WHERE ls.id = p_content_id AND ls.is_deleted = false;
      
      IF FOUND THEN
        result_text := COALESCE(live_session_data.title, '') || ' ' ||
                      COALESCE(live_session_data.description, '');
      END IF;
      
    WHEN 'assignment' THEN
      SELECT a.title, a.description
      INTO assignment_data
      FROM classroom_assignment a 
      WHERE a.id = p_content_id AND a.is_deleted = false;
      
      IF FOUND THEN
        result_text := COALESCE(assignment_data.title, '') || ' ' ||
                      COALESCE(assignment_data.description, '');
      END IF;
      
    WHEN 'quiz_question' THEN
      SELECT qq.question_text, qq.explanation, qq.options
      INTO quiz_question_data
      FROM course_quiz_question qq 
      WHERE qq.id = p_content_id AND qq.is_deleted = false;
      
      IF FOUND THEN
        result_text := COALESCE(quiz_question_data.question_text, '') || ' ' ||
                      COALESCE(quiz_question_data.explanation, '');
        
        -- 处理选项数组
        IF quiz_question_data.options IS NOT NULL THEN
          SELECT string_agg(value::text, ' ') INTO temp_text
          FROM jsonb_array_elements_text(quiz_question_data.options);
          IF temp_text IS NOT NULL THEN
            result_text := result_text || ' ' || temp_text;
          END IF;
        END IF;
      END IF;
      
    WHEN 'course_note' THEN
      SELECT cn.content, cn.ai_summary, cn.tags
      INTO course_note_data
      FROM course_notes cn 
      WHERE cn.id = p_content_id AND cn.is_deleted = false;
      
      IF FOUND THEN
        result_text := COALESCE(course_note_data.content, '') || ' ' ||
                      COALESCE(course_note_data.ai_summary, '') || ' ' ||
                      COALESCE(array_to_string(course_note_data.tags, ' '), '');
      END IF;
      
    WHEN 'course_review' THEN
      SELECT cr.comment
      INTO course_review_data
      FROM course_reviews cr 
      WHERE cr.id = p_content_id AND cr.is_deleted = false;
      
      IF FOUND THEN
        result_text := COALESCE(course_review_data.comment, '');
      END IF;
      
    WHEN 'community_group' THEN
      SELECT cg.name, cg.description
      INTO community_group_data
      FROM community_group cg 
      WHERE cg.id = p_content_id AND cg.is_deleted = false;
      
      IF FOUND THEN
        result_text := COALESCE(community_group_data.name, '') || ' ' ||
                      COALESCE(community_group_data.description, '');
      END IF;
      
    WHEN 'ai_agent' THEN
      SELECT aa.name, aa.purpose, aa.config
      INTO ai_agent_data
      FROM ai_agent aa 
      WHERE aa.id = p_content_id AND aa.is_deleted = false;
      
      IF FOUND THEN
        result_text := COALESCE(ai_agent_data.name, '') || ' ' ||
                      COALESCE(ai_agent_data.purpose, '');
        
        -- 处理config JSONB
        IF ai_agent_data.config IS NOT NULL THEN
          SELECT string_agg(value::text, ' ') INTO temp_text
          FROM jsonb_each_text(ai_agent_data.config);
          IF temp_text IS NOT NULL THEN
            result_text := result_text || ' ' || temp_text;
          END IF;
        END IF;
      END IF;
      
    WHEN 'notification' THEN
      SELECT n.payload
      INTO notification_data
      FROM notifications n 
      WHERE n.id = p_content_id AND n.is_deleted = false;
      
      IF FOUND AND notification_data.payload IS NOT NULL THEN
        result_text := '';
        
        -- 提取标题
        IF notification_data.payload ? 'title' THEN
          result_text := result_text || ' ' || (notification_data.payload->>'title');
        END IF;
        
        -- 提取消息内容
        IF notification_data.payload ? 'message' THEN
          result_text := result_text || ' ' || (notification_data.payload->>'message');
        END IF;
        
        -- 提取其他内容字段
        IF notification_data.payload ? 'content' THEN
          result_text := result_text || ' ' || (notification_data.payload->>'content');
        END IF;
        
        -- 提取描述
        IF notification_data.payload ? 'description' THEN
          result_text := result_text || ' ' || (notification_data.payload->>'description');
        END IF;
      END IF;
      
    ELSE
      RAISE NOTICE 'Unknown content type: %', p_content_type;
      RETURN NULL;
  END CASE;
  
  -- Clean up the result
  result_text := trim(regexp_replace(result_text, '\s+', ' ', 'g'));
  
  RETURN NULLIF(result_text, '');
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error extracting content for % %: %', p_content_type, p_content_id, SQLERRM;
  RETURN NULL;
END;
$$;
