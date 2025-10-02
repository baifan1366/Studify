CREATE OR REPLACE FUNCTION public.trigger_ai_agent_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- 检查相关字段是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.purpose IS DISTINCT FROM OLD.purpose OR
       NEW.config IS DISTINCT FROM OLD.config
     )) THEN
    
    -- 队列embedding，低优先级
    PERFORM queue_for_embedding('ai_agent', NEW.id, 6);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;;


CREATE OR REPLACE FUNCTION public.trigger_notification_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
      PERFORM queue_for_embedding('notification', NEW.id, 7);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;;


CREATE OR REPLACE FUNCTION public.extract_content_text(p_content_type text, p_content_id bigint)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
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
      SELECT ls.title
      INTO live_session_data
      FROM classroom_live_session ls 
      WHERE ls.id = p_content_id AND ls.is_deleted = false;
      
      IF FOUND THEN
        result_text := COALESCE(live_session_data.title, '');
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
$function$;;


CREATE OR REPLACE FUNCTION public.update_classroom_live_session_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
      BEGIN
        NEW.search_vector := 
          setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.status, '')), 'C');
        RETURN NEW;
      END;
      $function$;


CREATE OR REPLACE FUNCTION public.trigger_live_session_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
    BEGIN
      -- Check if relevant fields have changed (without description)
      IF TG_OP = 'INSERT' OR 
         (TG_OP = 'UPDATE' AND (
           NEW.title IS DISTINCT FROM OLD.title
         )) THEN
        
        -- Queue for embedding
        PERFORM queue_for_embedding('live_session', NEW.id, 4);
      END IF;
      
      RETURN COALESCE(NEW, OLD);
    END;
    $function$;


CREATE OR REPLACE FUNCTION public.update_ai_workflow_templates_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'B') ||
    -- Process tags array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.tags, ' '), ''
    )), 'C') ||
    -- Extract workflow definition as searchable text
    setweight(to_tsvector('english', coalesce(
      (NEW.workflow_definition->>'description')::text || ' ' ||
      (NEW.workflow_definition->>'purpose')::text, ''
    )), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.visibility, '')), 'D');
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.update_learning_goal_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.goal_type, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.status, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.reward_type, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.target_value::text, '')), 'D');
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.update_profile_completion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.profile_completion := calculate_profile_completion(NEW);
    NEW.updated_at := now();
    RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.update_classroom_assignment_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if submission_type column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'classroom_assignment' AND column_name = 'submission_type') THEN
    NEW.search_vector := 
      setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(NEW.submission_type, '')), 'C');
  ELSE
    NEW.search_vector := 
      setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  END IF;
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.update_classroom_posts_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'A');
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.update_course_chapter_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.update_mistake_book_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.mistake_content, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.analysis, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.source_type, '')), 'C') ||
    -- Process knowledge_points array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.knowledge_points, ' '), ''
    )), 'B');
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.update_tutoring_note_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.body, '')), 'B');
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.update_community_quiz_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.difficulty::text, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.visibility, '')), 'D') ||
    -- Process tags array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.tags, ' '), ''
    )), 'B');
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.update_tutor_earnings_summary()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update summary when earnings change
  INSERT INTO tutor_earnings_summary (tutor_id, currency)
  VALUES (NEW.tutor_id, NEW.currency)
  ON CONFLICT (tutor_id) DO NOTHING;
  
  -- Recalculate totals
  UPDATE tutor_earnings_summary 
  SET 
    total_earnings_cents = (
      SELECT COALESCE(SUM(tutor_amount_cents), 0) 
      FROM tutor_earnings 
      WHERE tutor_id = NEW.tutor_id AND is_deleted = false
    ),
    pending_earnings_cents = (
      SELECT COALESCE(SUM(tutor_amount_cents), 0) 
      FROM tutor_earnings 
      WHERE tutor_id = NEW.tutor_id AND status = 'pending' AND is_deleted = false
    ),
    released_earnings_cents = (
      SELECT COALESCE(SUM(tutor_amount_cents), 0) 
      FROM tutor_earnings 
      WHERE tutor_id = NEW.tutor_id AND status = 'released' AND is_deleted = false
    ),
    paid_out_earnings_cents = (
      SELECT COALESCE(SUM(tutor_amount_cents), 0) 
      FROM tutor_earnings 
      WHERE tutor_id = NEW.tutor_id AND status = 'released' AND payout_id IS NOT NULL AND is_deleted = false
    ),
    current_month_earnings_cents = (
      SELECT COALESCE(SUM(tutor_amount_cents), 0) 
      FROM tutor_earnings 
      WHERE tutor_id = NEW.tutor_id 
        AND created_at >= date_trunc('month', now()) 
        AND is_deleted = false
    ),
    total_sales_count = (
      SELECT COUNT(*) 
      FROM tutor_earnings 
      WHERE tutor_id = NEW.tutor_id AND is_deleted = false
    ),
    updated_at = now()
  WHERE tutor_id = NEW.tutor_id;
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.calculate_platform_fee(gross_amount_cents integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Default 10% platform fee
  RETURN GREATEST(FLOOR(gross_amount_cents * 0.10), 0);
END;
$function$;;


CREATE OR REPLACE FUNCTION public.search_embeddings_enhanced(query_embedding vector, content_types text[] DEFAULT NULL::text[], chunk_types text[] DEFAULT NULL::text[], languages text[] DEFAULT NULL::text[], hierarchy_levels integer[] DEFAULT NULL::integer[], min_semantic_density double precision DEFAULT NULL::double precision, has_features jsonb DEFAULT NULL::jsonb, similarity_threshold double precision DEFAULT 0.7, max_results integer DEFAULT 10)
 RETURNS TABLE(id bigint, public_id uuid, content_type text, content_id bigint, content_text text, chunk_type text, hierarchy_level integer, section_title text, semantic_density double precision, key_terms text[], similarity_score double precision, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.public_id,
    e.content_type,
    e.content_id,
    e.content_text,
    e.chunk_type,
    e.hierarchy_level,
    e.section_title,
    e.semantic_density,
    e.key_terms,
    (e.embedding <=> query_embedding) * -1 + 1 as similarity_score,
    e.created_at
  FROM embeddings e
  WHERE 
    e.status = 'completed' 
    AND e.is_deleted = false
    AND (e.embedding <=> query_embedding) <= (1 - similarity_threshold)
    AND (content_types IS NULL OR e.content_type = ANY(content_types))
    AND (chunk_types IS NULL OR e.chunk_type = ANY(chunk_types))
    AND (languages IS NULL OR e.chunk_language = ANY(languages))
    AND (hierarchy_levels IS NULL OR e.hierarchy_level = ANY(hierarchy_levels))
    AND (min_semantic_density IS NULL OR e.semantic_density >= min_semantic_density)
    AND (
      has_features IS NULL OR (
        (has_features->>'has_code_block' IS NULL OR 
         e.has_code_block = (has_features->>'has_code_block')::boolean) AND
        (has_features->>'has_table' IS NULL OR 
         e.has_table = (has_features->>'has_table')::boolean) AND
        (has_features->>'has_list' IS NULL OR 
         e.has_list = (has_features->>'has_list')::boolean)
      )
    )
  ORDER BY e.embedding <=> query_embedding
  LIMIT max_results;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.release_eligible_earnings()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  updated_count int;
BEGIN
  -- Release earnings that are 7 days old
  UPDATE tutor_earnings 
  SET 
    status = 'released',
    updated_at = now()
  WHERE 
    status = 'pending' 
    AND created_at <= now() - interval '7 days'
    AND is_deleted = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.get_tutor_monthly_breakdown(target_tutor_id bigint, months_back integer DEFAULT 3)
 RETURNS TABLE(month text, year integer, total_cents integer, course_sales_cents integer, tutoring_cents integer, commission_cents integer, status text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(date_trunc('month', te.created_at), 'Month') as month,
    EXTRACT(year FROM date_trunc('month', te.created_at))::int as year,
    SUM(te.tutor_amount_cents)::int as total_cents,
    SUM(CASE WHEN te.source_type = 'course_sale' THEN te.tutor_amount_cents ELSE 0 END)::int as course_sales_cents,
    SUM(CASE WHEN te.source_type = 'tutoring_session' THEN te.tutor_amount_cents ELSE 0 END)::int as tutoring_cents,
    SUM(CASE WHEN te.source_type = 'commission_bonus' THEN te.tutor_amount_cents ELSE 0 END)::int as commission_cents,
    CASE 
      WHEN date_trunc('month', te.created_at) = date_trunc('month', now()) THEN 'current'
      ELSE 'paid'
    END as status
  FROM tutor_earnings te
  WHERE 
    te.tutor_id = target_tutor_id 
    AND te.is_deleted = false
    AND te.created_at >= date_trunc('month', now()) - interval '1 month' * months_back
  GROUP BY date_trunc('month', te.created_at)
  ORDER BY date_trunc('month', te.created_at) DESC;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.trg_after_post_insert_update_progress()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  ach record;
begin
  -- 处理 post_count
  for ach in
    select id, rule from community_achievement
    where (rule->>'type') in ('post_count','distinct_group_post_count')
      and is_deleted = false
  loop
    insert into community_user_achievement(user_id, achievement_id, current_value)
    values (new.author_id, ach.id, 0)
    on conflict (user_id, achievement_id) do nothing;

    if (ach.rule->>'type') = 'post_count' then
      update community_user_achievement
      set current_value = current_value + 1, updated_at = now()
      where user_id = new.author_id and achievement_id = ach.id;

    elsif (ach.rule->>'type') = 'distinct_group_post_count' then
      update community_user_achievement
      set current_value = (
        select count(distinct group_id)
        from community_post
        where author_id = new.author_id and is_deleted = false
      ), updated_at = now()
      where user_id = new.author_id and achievement_id = ach.id;
    end if;

    perform unlock_achievement(new.author_id, ach.id);
  end loop;

  return new;
END;
$function$;


CREATE OR REPLACE FUNCTION public.handle_quiz_mistake()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- If answer is incorrect, add to mistake book
  if not new.is_correct then
    insert into mistake_book (
      user_id, 
      course_question_id, 
      course_id, 
      lesson_id, 
      mistake_content, 
      source_type
    ) 
    select 
      new.user_id,
      new.question_id,
      cl.course_id,
      new.lesson_id,
      cqq.question_text || ' - Incorrect answer: ' || new.user_answer::text,
      'course_quiz'
    from course_quiz_question cqq
    join course_lesson cl on cqq.lesson_id = cl.id
    where cqq.id = new.question_id;
  end if;
  
  return new;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_quiz_search_vectors()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  subject_translations jsonb := '{}';
  grade_translations jsonb := '{}';
BEGIN
  -- Get subject translations if subject_id exists
  IF NEW.subject_id IS NOT NULL THEN
    SELECT translations INTO subject_translations
    FROM community_quiz_subject
    WHERE id = NEW.subject_id;
  END IF;
  
  -- Get grade translations if grade_id exists
  IF NEW.grade_id IS NOT NULL THEN
    SELECT translations INTO grade_translations
    FROM community_quiz_grade
    WHERE id = NEW.grade_id;
  END IF;
  
  -- Update English search vector
  NEW.search_vector_en := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(subject_translations->>'en', '') || ' ' ||
    COALESCE(grade_translations->>'en', '') || ' ' ||
    COALESCE(array_to_string(NEW.tags, ' '), '')
  );
  
  -- Update Chinese search vector
  NEW.search_vector_zh := to_tsvector('simple', 
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(subject_translations->>'zh', '') || ' ' ||
    COALESCE(grade_translations->>'zh', '') || ' ' ||
    COALESCE(array_to_string(NEW.tags, ' '), '')
  );
  
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.trg_after_reaction_insert_update_progress()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  ach record;
begin
  for ach in
    select id, rule from community_achievement
    where (rule->>'type') = 'reaction_count'
      and is_deleted = false
  loop
    insert into community_user_achievement(user_id, achievement_id, current_value)
    values (new.user_id, ach.id, 0)
    on conflict (user_id, achievement_id) do nothing;

    if (ach.rule->>'emoji') is not null then
      update community_user_achievement
      set current_value = current_value + 1, updated_at = now()
      where user_id = new.user_id
        and achievement_id = ach.id
        and new.emoji = (ach.rule->>'emoji');
    else
      update community_user_achievement
      set current_value = current_value + 1, updated_at = now()
      where user_id = new.user_id
        and achievement_id = ach.id;
    end if;

    perform unlock_achievement(new.user_id, ach.id);
  end loop;

  return new;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_quiz_search_vectors_on_subject_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update all quizzes that reference this subject
  UPDATE community_quiz 
  SET updated_at = now()
  WHERE subject_id = NEW.id;
  
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_quiz_search_vectors_on_grade_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update all quizzes that reference this grade
  UPDATE community_quiz 
  SET updated_at = now()
  WHERE grade_id = NEW.id;
  
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_group_conversation_with_members(group_conv_id bigint)
 RETURNS TABLE(id bigint, name text, description text, avatar_url text, created_by bigint, created_at timestamp with time zone, updated_at timestamp with time zone, member_count bigint, last_message_content text, last_message_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        gc.id,
        gc.name,
        gc.description,
        gc.avatar_url,
        gc.created_by,
        gc.created_at,
        gc.updated_at,
        COUNT(gm.id) FILTER (WHERE gm.left_at IS NULL) as member_count,
        (
            SELECT content 
            FROM group_messages 
            WHERE conversation_id = gc.id 
            AND is_deleted = false 
            ORDER BY created_at DESC 
            LIMIT 1
        ) as last_message_content,
        (
            SELECT created_at 
            FROM group_messages 
            WHERE conversation_id = gc.id 
            AND is_deleted = false 
            ORDER BY created_at DESC 
            LIMIT 1
        ) as last_message_at
    FROM group_conversations gc
    LEFT JOIN group_members gm ON gc.id = gm.conversation_id
    WHERE gc.id = group_conv_id
    AND gc.is_deleted = false
    GROUP BY gc.id, gc.name, gc.description, gc.avatar_url, gc.created_by, gc.created_at, gc.updated_at;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_ai_usage_summary(days_back integer DEFAULT 7)
 RETURNS TABLE(total_requests bigint, successful_requests bigint, failed_requests bigint, success_rate numeric, total_tokens bigint, avg_response_time_ms numeric, active_api_keys integer, top_models jsonb)
 LANGUAGE plpgsql
AS $function$
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
$function$;


CREATE OR REPLACE FUNCTION public.redeem_course_with_points(p_user_id bigint, p_course_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_points int;
    v_course_point_price int;
    v_course_info jsonb;
    v_enrollment_exists boolean;
    v_redemption_id bigint;
    v_result jsonb;
BEGIN
    -- 检查用户是否存在且积分数
    SELECT points INTO v_user_points 
    FROM profiles 
    WHERE id = p_user_id AND is_deleted = false;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;

    -- 检查课程是否存在且获取积分价格
    SELECT 
        jsonb_build_object(
            'id', c.id,
            'title', c.title,
            'price_cents', c.price_cents,
            'thumbnail_url', c.thumbnail_url
        ),
        COALESCE(cpp.point_price, 0)
    INTO v_course_info, v_course_point_price
    FROM course c
    LEFT JOIN course_point_price cpp ON cpp.course_id = c.id AND cpp.is_active = true
    WHERE c.id = p_course_id AND c.is_deleted = false;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Course not found');
    END IF;

    -- 检查课程是否设置了积分价格
    IF v_course_point_price = 0 THEN
        RETURN jsonb_build_object('error', 'This course is not available for point redemption');
    END IF;

    -- 检查用户积分是否足够
    IF v_user_points < v_course_point_price THEN
        RETURN jsonb_build_object(
            'error', 'Insufficient points',
            'required', v_course_point_price,
            'available', v_user_points
        );
    END IF;

    -- 检查用户是否已经注册了这门课程
    SELECT EXISTS(
        SELECT 1 FROM course_enrollment 
        WHERE course_id = p_course_id AND user_id = p_user_id
    ) INTO v_enrollment_exists;

    IF v_enrollment_exists THEN
        RETURN jsonb_build_object('error', 'Already enrolled in this course');
    END IF;

    -- 开始事务操作
    -- 1. 扣除用户积分
    UPDATE profiles 
    SET points = points - v_course_point_price,
        updated_at = now()
    WHERE id = p_user_id;

    -- 2. 创建积分兑换记录
    INSERT INTO point_redemption (
        user_id,
        course_id,
        points_spent,
        original_price_cents,
        status,
        redemption_date,
        completion_date
    ) VALUES (
        p_user_id,
        p_course_id,
        v_course_point_price,
        (v_course_info->>'price_cents')::int,
        'completed',
        now(),
        now()
    ) RETURNING id INTO v_redemption_id;

    -- 3. 添加积分消费记录
    INSERT INTO community_points_ledger (
        user_id,
        points,
        reason,
        ref
    ) VALUES (
        p_user_id,
        -v_course_point_price,
        'Course redemption',
        jsonb_build_object(
            'type', 'course_redemption',
            'course_id', p_course_id,
            'redemption_id', v_redemption_id
        )
    );

    -- 4. 自动注册课程
    INSERT INTO course_enrollment (
        course_id,
        user_id,
        role,
        status,
        started_at
    ) VALUES (
        p_course_id,
        p_user_id,
        'student',
        'active',
        now()
    );

    -- 5. 检查是否解锁"积分达人"成就
    PERFORM check_and_unlock_achievement(p_user_id, 'point_spender');

    -- 返回成功结果
    v_result := jsonb_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'points_spent', v_course_point_price,
        'remaining_points', v_user_points - v_course_point_price,
        'course', v_course_info
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- 回滚会自动发生
        RETURN jsonb_build_object(
            'error', 'Transaction failed: ' || SQLERRM
        );
END;
$function$;


CREATE OR REPLACE FUNCTION public.check_and_unlock_achievement(p_user_id bigint, p_achievement_code text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_achievement_id bigint;
    v_already_unlocked boolean;
    v_points_reward int;
BEGIN
    -- 获取成就信息
    SELECT id, (rule->>'points')::int 
    INTO v_achievement_id, v_points_reward
    FROM community_achievement 
    WHERE code = p_achievement_code AND is_deleted = false;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 检查用户是否已经解锁这个成就
    SELECT unlocked INTO v_already_unlocked
    FROM community_user_achievement
    WHERE user_id = p_user_id AND achievement_id = v_achievement_id;

    IF v_already_unlocked THEN
        RETURN;
    END IF;

    -- 解锁成就
    INSERT INTO community_user_achievement (
        user_id,
        achievement_id,
        current_value,
        unlocked,
        unlocked_at
    ) VALUES (
        p_user_id,
        v_achievement_id,
        1,
        true,
        now()
    ) ON CONFLICT (user_id, achievement_id) 
    DO UPDATE SET 
        unlocked = true,
        unlocked_at = now(),
        current_value = EXCLUDED.current_value;

    -- 给用户增加积分奖励
    IF v_points_reward > 0 THEN
        UPDATE profiles 
        SET points = points + v_points_reward
        WHERE id = p_user_id;

        -- 记录积分获得
        INSERT INTO community_points_ledger (
            user_id,
            points,
            reason,
            ref
        ) VALUES (
            p_user_id,
            v_points_reward,
            'Achievement unlocked: ' || p_achievement_code,
            jsonb_build_object(
                'type', 'achievement_reward',
                'achievement_code', p_achievement_code
            )
        );
    END IF;

END;
$function$;


CREATE OR REPLACE FUNCTION public.get_embedding_batch(batch_size integer DEFAULT 10)
 RETURNS TABLE(id bigint, content_type text, content_id bigint, content_text text, content_hash text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  UPDATE embedding_queue eq
  SET 
    status = 'processing',
    processing_started_at = now(),
    updated_at = now()
  FROM (
    SELECT eq2.id
    FROM embedding_queue eq2
    WHERE eq2.status = 'queued'
      AND eq2.scheduled_at <= now()
      AND eq2.retry_count < eq2.max_retries
    ORDER BY eq2.priority ASC, eq2.created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  ) batch
  WHERE eq.id = batch.id
  RETURNING eq.id, eq.content_type, eq.content_id, eq.content_text, eq.content_hash;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_quiz_session_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_video_comment_counts()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;


CREATE OR REPLACE FUNCTION public.search_video_segments_with_time(query_embedding_e5 vector DEFAULT NULL::vector, query_embedding_bge vector DEFAULT NULL::vector, attachment_ids bigint[] DEFAULT NULL::bigint[], start_time_min double precision DEFAULT NULL::double precision, start_time_max double precision DEFAULT NULL::double precision, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10, include_context boolean DEFAULT false)
 RETURNS TABLE(segment_id bigint, attachment_id bigint, segment_index integer, start_time double precision, end_time double precision, duration double precision, content_text text, topic_keywords text[], similarity_e5 double precision, similarity_bge double precision, combined_similarity double precision, context_before text, context_after text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH segment_matches AS (
    SELECT 
      ve.id,
      ve.attachment_id,
      ve.segment_index,
      ve.segment_start_time,
      ve.segment_end_time,
      ve.segment_duration,
      ve.content_text,
      ve.topic_keywords,
      CASE 
        WHEN query_embedding_e5 IS NOT NULL AND ve.has_e5_embedding 
        THEN 1 - (ve.embedding_e5_small <=> query_embedding_e5)
        ELSE 0 
      END as sim_e5,
      CASE 
        WHEN query_embedding_bge IS NOT NULL AND ve.has_bge_embedding 
        THEN 1 - (ve.embedding_bge_m3 <=> query_embedding_bge)
        ELSE 0 
      END as sim_bge
    FROM video_embeddings ve
    WHERE 
      ve.chunk_type = 'segment'
      AND ve.status = 'completed'
      AND ve.is_deleted = false
      AND (attachment_ids IS NULL OR ve.attachment_id = ANY(attachment_ids))
      AND (start_time_min IS NULL OR ve.segment_start_time >= start_time_min)
      AND (start_time_max IS NULL OR ve.segment_start_time <= start_time_max)
  ),
  ranked_segments AS (
    SELECT 
      *,
      -- Weighted combination of similarities (favor BGE-M3 if available)
      CASE 
        WHEN sim_bge > 0 AND sim_e5 > 0 THEN (sim_bge * 0.7 + sim_e5 * 0.3)
        WHEN sim_bge > 0 THEN sim_bge
        WHEN sim_e5 > 0 THEN sim_e5
        ELSE 0
      END as combined_sim
    FROM segment_matches
  )
  SELECT 
    rs.id,
    rs.attachment_id,
    rs.segment_index,
    rs.segment_start_time,
    rs.segment_end_time,
    rs.segment_duration,
    rs.content_text,
    rs.topic_keywords,
    rs.sim_e5,
    rs.sim_bge,
    rs.combined_sim,
    CASE 
      WHEN include_context THEN (
        SELECT ve_prev.content_text 
        FROM video_embeddings ve_prev 
        WHERE ve_prev.attachment_id = rs.attachment_id 
          AND ve_prev.segment_index = rs.segment_index - 1 
          AND ve_prev.chunk_type = 'segment'
        LIMIT 1
      )
      ELSE NULL 
    END,
    CASE 
      WHEN include_context THEN (
        SELECT ve_next.content_text 
        FROM video_embeddings ve_next 
        WHERE ve_next.attachment_id = rs.attachment_id 
          AND ve_next.segment_index = rs.segment_index + 1 
          AND ve_next.chunk_type = 'segment'
        LIMIT 1
      )
      ELSE NULL 
    END
  FROM ranked_segments rs
  WHERE rs.combined_sim >= match_threshold
  ORDER BY rs.combined_sim DESC
  LIMIT match_count;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_video_comment_likes_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;


CREATE OR REPLACE FUNCTION public.cleanup_ai_workflow_data(days_to_keep integer DEFAULT 90)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
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
$function$;


CREATE OR REPLACE FUNCTION public.generate_course_slug()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.slug is null then
    new.slug := lower(regexp_replace(new.title, '[^a-zA-Z0-9\s]', '', 'g'));
    new.slug := regexp_replace(new.slug, '\s+', '-', 'g');
    new.slug := new.slug || '-' || substring(new.public_id::text from 1 for 8);
  end if;
  return new;
END;
$function$;


CREATE OR REPLACE FUNCTION public.mark_message_delivered(msg_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE direct_messages 
    SET delivered_at = now() 
    WHERE id = msg_id AND delivered_at IS NULL;
END;
$function$;


CREATE OR REPLACE FUNCTION public.unlock_achievement(_user_id bigint, _achievement_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
  rule_json jsonb;
  min_count int;
  ach_type text;
  emoji_filter text;
  current_val int;
begin
  -- 取成就规则
  select rule, (rule->>'min')::int, rule->>'type', rule->>'emoji'
  into rule_json, min_count, ach_type, emoji_filter
  from community_achievement
  where id = _achievement_id and is_deleted = false;

  -- 当前进度
  select current_value
  into current_val
  from community_user_achievement
  where user_id = _user_id and achievement_id = _achievement_id;

  -- 如果还没解锁且达成条件 → 解锁
  if current_val >= min_count then
    update community_user_achievement
    set unlocked = true, unlocked_at = now(), updated_at = now()
    where user_id = _user_id and achievement_id = _achievement_id
      and unlocked = false;
    return true;
  end if;

  return false;
END;
$function$;


CREATE OR REPLACE FUNCTION public.calculate_profile_completion(profile_row profiles)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    completion_score int := 0;
    total_fields int := 8; -- Total number of optional profile fields
BEGIN
    -- Check each optional field and add to completion score
    IF profile_row.display_name IS NOT NULL AND profile_row.display_name != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_row.full_name IS NOT NULL AND profile_row.full_name != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_row.bio IS NOT NULL AND profile_row.bio != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_row.avatar_url IS NOT NULL AND profile_row.avatar_url != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_row.timezone IS NOT NULL THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_row.email IS NOT NULL AND profile_row.email != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_row.email_verified = true THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_row.onboarded = true THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Return percentage
    RETURN (completion_score * 100) / total_fields;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_enhanced_embedding_stats()
 RETURNS TABLE(total_embeddings bigint, by_content_type jsonb, by_chunk_type jsonb, by_language jsonb, by_hierarchy_level jsonb, avg_semantic_density double precision, content_features jsonb)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_embeddings,
    
    -- Group by content type
    jsonb_object_agg(
      content_type, 
      content_type_count
    ) as by_content_type,
    
    -- Group by chunk type
    jsonb_object_agg(
      COALESCE(chunk_type, 'unknown'), 
      chunk_type_count
    ) as by_chunk_type,
    
    -- Group by language
    jsonb_object_agg(
      chunk_language, 
      language_count
    ) as by_language,
    
    -- Group by hierarchy level
    jsonb_object_agg(
      hierarchy_level::text, 
      hierarchy_count
    ) as by_hierarchy_level,
    
    -- Average semantic density
    AVG(semantic_density) as avg_semantic_density,
    
    -- Content features statistics
    jsonb_build_object(
      'has_code_block', SUM(CASE WHEN has_code_block THEN 1 ELSE 0 END),
      'has_table', SUM(CASE WHEN has_table THEN 1 ELSE 0 END),
      'has_list', SUM(CASE WHEN has_list THEN 1 ELSE 0 END)
    ) as content_features
    
  FROM (
    SELECT 
      content_type,
      chunk_type,
      chunk_language,
      hierarchy_level,
      semantic_density,
      has_code_block,
      has_table,
      has_list,
      COUNT(*) OVER (PARTITION BY content_type) as content_type_count,
      COUNT(*) OVER (PARTITION BY chunk_type) as chunk_type_count,
      COUNT(*) OVER (PARTITION BY chunk_language) as language_count,
      COUNT(*) OVER (PARTITION BY hierarchy_level) as hierarchy_count
    FROM embeddings 
    WHERE status = 'completed' AND is_deleted = false
  ) stats
  GROUP BY ();
END;
$function$;


CREATE OR REPLACE FUNCTION public.after_post_insert_check_achievements()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- First Post
  perform unlock_achievement(new.author_id, 1);

  -- Prolific Writer
  perform unlock_achievement(new.author_id, 7);

  -- Rising Contributor
  perform unlock_achievement(new.author_id, 10);

  -- Group Starter
  perform unlock_achievement(new.author_id, 14);

  return new;
END;
$function$;


CREATE OR REPLACE FUNCTION public.cleanup_expired_video_terms()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM video_terms_cache 
  WHERE expires_at < now();
END;
$function$;


CREATE OR REPLACE FUNCTION public.trigger_video_qa_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.trg_after_comment_insert_update_progress()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  ach record;
  post_author_id bigint;
begin
  -- 先把帖子作者查出来（供后面复用）
  select author_id into post_author_id from community_post where id = NEW.post_id;

  for ach in
    select id, rule from community_achievement
    where (rule->>'type') in ('comment_count','comment_counts')
      and is_deleted = false
  loop
    -- 1) 确保评论者在这项成就上有一条记录（初始化）
    insert into community_user_achievement(user_id, achievement_id, current_value, created_at, updated_at)
    values (NEW.author_id, ach.id, 0, now(), now())
    on conflict (user_id, achievement_id) do nothing;

    -- 2) comment_count: 给评论者 +1，使用原子 INSERT ... ON CONFLICT DO UPDATE
    if (ach.rule->>'type') = 'comment_count' then
      insert into community_user_achievement(user_id, achievement_id, current_value, updated_at)
      values (NEW.author_id, ach.id, 1, now())
      on conflict (user_id, achievement_id) do update
      set current_value = community_user_achievement.current_value + 1,
          updated_at = now();

    -- 3) comment_counts: 更新“帖子作者”收到的（非作者自己）评论总数
    elsif (ach.rule->>'type') = 'comment_counts' then
      -- 只在评论者不是帖子作者时更新（避免作者自评导致置 0）
      if post_author_id is not null and NEW.author_id != post_author_id then
        -- 确保帖子作者有行
        insert into community_user_achievement(user_id, achievement_id, current_value, created_at, updated_at)
        values (post_author_id, ach.id, 0, now(), now())
        on conflict (user_id, achievement_id) do nothing;

        update community_user_achievement
        set current_value = (
          select count(*) from community_comment
          where post_id = NEW.post_id
            and is_deleted = false
            and author_id != post_author_id
        ), updated_at = now()
        where user_id = post_author_id
          and achievement_id = ach.id;
      end if;
    end if;

    -- 4) 调用解锁函数：对不同规则要传不同的 user_id
    perform unlock_achievement(
      case when (ach.rule->>'type') = 'comment_counts' then post_author_id else NEW.author_id end,
      ach.id
    );
  end loop;

  return NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.fail_embedding(p_queue_id bigint, p_error_message text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  queue_record embedding_queue%ROWTYPE;
BEGIN
  SELECT * INTO queue_record FROM embedding_queue WHERE id = p_queue_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  UPDATE embedding_queue
  SET 
    retry_count = retry_count + 1,
    error_message = p_error_message,
    status = CASE 
      WHEN retry_count + 1 >= max_retries THEN 'failed'
      ELSE 'queued'
    END,
    scheduled_at = CASE 
      WHEN retry_count + 1 >= max_retries THEN scheduled_at
      ELSE now() + (retry_count + 1) * interval '5 minutes'
    END,
    updated_at = now()
  WHERE id = p_queue_id;
  
  RETURN true;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.hashtags_tsvector_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.search_vector := to_tsvector('english', coalesce(new.name, ''));
  return new;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.search_video_qa_history(p_user_id bigint, p_search_text text DEFAULT NULL::text, p_lesson_id bigint DEFAULT NULL::bigint, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id bigint, public_id uuid, question text, answer text, video_time numeric, is_helpful boolean, created_at timestamp with time zone, lesson_title text, lesson_public_id uuid, course_title text, course_slug text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    vql.id,
    vql.public_id,
    vql.question,
    vql.answer,
    vql.video_time,
    vql.is_helpful,
    vql.created_at,
    vql.lesson_title,
    vql.lesson_public_id,
    vql.course_title,
    vql.course_slug
  FROM video_qa_with_lesson vql
  WHERE vql.user_id = p_user_id
    AND (p_search_text IS NULL OR (
      vql.question ILIKE '%' || p_search_text || '%' OR
      vql.answer ILIKE '%' || p_search_text || '%'
    ))
    AND (p_lesson_id IS NULL OR EXISTS (
      SELECT 1 FROM course_lesson cl 
      WHERE cl.public_id::text = p_lesson_id::text 
      AND cl.id = (
        SELECT lesson_id FROM video_qa_history 
        WHERE id = vql.id
      )
    ))
  ORDER BY vql.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.get_segment_context(target_segment_id bigint, context_window integer DEFAULT 1)
 RETURNS TABLE(segment_id bigint, segment_index integer, start_time double precision, end_time double precision, content_text text, segment_position text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH target AS (
    SELECT ve.attachment_id, ve.segment_index as target_index
    FROM video_embeddings ve
    WHERE ve.id = target_segment_id
  )
  SELECT 
    ve.id,
    ve.segment_index,
    ve.segment_start_time,
    ve.segment_end_time,
    ve.content_text,
    CASE 
      WHEN ve.segment_index < t.target_index THEN 'before'
      WHEN ve.segment_index = t.target_index THEN 'current'
      ELSE 'after'
    END as segment_position
  FROM video_embeddings ve
  JOIN target t ON ve.attachment_id = t.attachment_id
  WHERE 
    ve.chunk_type = 'segment'
    AND ve.segment_index BETWEEN (t.target_index - context_window) AND (t.target_index + context_window)
    AND ve.status = 'completed'
    AND ve.is_deleted = false
  ORDER BY ve.segment_index;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.expire_old_quiz_sessions()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE community_quiz_session 
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' 
    AND expires_at IS NOT NULL 
    AND expires_at < now();
END;
$function$;;


CREATE OR REPLACE FUNCTION public.cleanup_abandoned_quiz_sessions()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Mark sessions as expired if no activity for more than 2 hours
  UPDATE community_quiz_session 
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' 
    AND last_activity_at < now() - interval '2 hours';
    
  -- Optionally delete very old expired sessions (older than 30 days)
  DELETE FROM community_quiz_session 
  WHERE status IN ('expired', 'completed') 
    AND updated_at < now() - interval '30 days';
END;
$function$;;


CREATE OR REPLACE FUNCTION public.trigger_comment_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.body IS DISTINCT FROM NEW.body
  )) THEN
    PERFORM queue_for_embedding('comment', NEW.id, 5);
  END IF;
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.trigger_lesson_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.transcript IS DISTINCT FROM NEW.transcript
  )) THEN
    PERFORM queue_for_embedding('lesson', NEW.id, 3);
  END IF;
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.trigger_profile_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.display_name IS DISTINCT FROM NEW.display_name OR
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.bio IS DISTINCT FROM NEW.bio OR
    OLD.role IS DISTINCT FROM NEW.role OR
    OLD.preferences IS DISTINCT FROM NEW.preferences OR
    OLD.timezone IS DISTINCT FROM NEW.timezone
  )) THEN
    PERFORM queue_for_embedding('profile', NEW.id, 3);
  END IF;
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.trigger_post_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.body IS DISTINCT FROM NEW.body
  )) THEN
    PERFORM queue_for_embedding('post', NEW.id, 4);
  END IF;
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.complete_embedding(p_queue_id bigint, p_embedding vector, p_token_count integer DEFAULT NULL::integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  queue_record embedding_queue%ROWTYPE;
BEGIN
  SELECT * INTO queue_record FROM embedding_queue WHERE id = p_queue_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  INSERT INTO embeddings (
    content_type, content_id, content_hash, embedding, content_text,
    token_count, status, created_at, updated_at
  ) VALUES (
    queue_record.content_type, queue_record.content_id, queue_record.content_hash,
    p_embedding, queue_record.content_text, p_token_count, 'completed', now(), now()
  )
  ON CONFLICT (content_type, content_id)
  DO UPDATE SET
    content_hash = EXCLUDED.content_hash,
    embedding = EXCLUDED.embedding,
    content_text = EXCLUDED.content_text,
    token_count = EXCLUDED.token_count,
    status = 'completed',
    error_message = NULL,
    updated_at = now(),
    is_deleted = false;
  
  DELETE FROM embedding_queue WHERE id = p_queue_id;
  
  RETURN true;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.update_conversation_on_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE direct_conversations 
    SET updated_at = now() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.create_or_get_conversation(user1_id bigint, user2_id bigint)
 RETURNS bigint
 LANGUAGE plpgsql
AS $function$
DECLARE
    conv_id bigint;
    participant1 bigint;
    participant2 bigint;
BEGIN
    -- Ensure participant1_id < participant2_id
    IF user1_id < user2_id THEN
        participant1 := user1_id;
        participant2 := user2_id;
    ELSE
        participant1 := user2_id;
        participant2 := user1_id;
    END IF;
    
    -- Try to find existing conversation
    SELECT id INTO conv_id 
    FROM direct_conversations 
    WHERE participant1_id = participant1 
      AND participant2_id = participant2 
      AND is_deleted = false;
    
    -- If not found, create new conversation
    IF conv_id IS NULL THEN
        INSERT INTO direct_conversations (participant1_id, participant2_id)
        VALUES (participant1, participant2)
        RETURNING id INTO conv_id;
    END IF;
    
    RETURN conv_id;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.after_comment_insert_check_achievements()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Active Commenter
  perform unlock_achievement(new.author_id, 11);
  return new;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.after_reaction_insert_check_achievements()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Expressive User
  perform unlock_achievement(new.user_id, 12);

  -- Heart Giver
  perform unlock_achievement(new.user_id, 13);

  return new;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.trigger_course_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.category IS DISTINCT FROM NEW.category OR
    OLD.tags IS DISTINCT FROM NEW.tags OR
    OLD.requirements IS DISTINCT FROM NEW.requirements OR
    OLD.learning_objectives IS DISTINCT FROM NEW.learning_objectives
  )) THEN
    PERFORM queue_for_embedding('course', NEW.id, 2);
  END IF;
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.community_post_tsvector_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  hashtags_text text;
begin
  -- 拼接该 post 的所有 hashtags 名称
  select string_agg(h.name, ' ')
  into hashtags_text
  from post_hashtags ph
  join hashtags h on h.id = ph.hashtag_id
  where ph.post_id = new.public_id;

  -- 合并 title、body、hashtags 为 search_vector
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.body, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(hashtags_text, '')), 'C');

  return new;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.update_video_processing_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.calculate_video_processing_progress(queue_id_param bigint)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_steps INT;
    completed_steps INT;
    progress INT;
BEGIN
    -- Count total and completed steps
    SELECT COUNT(*) INTO total_steps
    FROM video_processing_steps
    WHERE queue_id = queue_id_param;
    
    SELECT COUNT(*) INTO completed_steps
    FROM video_processing_steps
    WHERE queue_id = queue_id_param AND status = 'completed';
    
    -- Calculate progress percentage
    IF total_steps = 0 THEN
        progress := 0;
    ELSE
        progress := ROUND((completed_steps::FLOAT / total_steps::FLOAT) * 100);
    END IF;
    
    -- Update the queue record
    UPDATE video_processing_queue
    SET progress_percentage = progress,
        updated_at = now()
    WHERE id = queue_id_param;
    
    RETURN progress;
END;
$function$;


CREATE OR REPLACE FUNCTION public.initialize_video_processing_steps(queue_id_param bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Insert all required processing steps
    INSERT INTO video_processing_steps (queue_id, step_name, status)
    VALUES 
        (queue_id_param, 'compress', 'pending'),
        (queue_id_param, 'audio_convert', 'pending'),
        (queue_id_param, 'transcribe', 'pending'),
        (queue_id_param, 'embed', 'pending');
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_next_processing_step(queue_id_param bigint)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    next_step TEXT;
BEGIN
    SELECT step_name INTO next_step
    FROM video_processing_steps
    WHERE queue_id = queue_id_param 
    AND status = 'pending'
    ORDER BY 
        CASE step_name
            WHEN 'compress' THEN 1
            WHEN 'audio_convert' THEN 2
            WHEN 'transcribe' THEN 3
            WHEN 'embed' THEN 4
            ELSE 5
        END
    LIMIT 1;
    
    RETURN next_step;
END;
$function$;


CREATE OR REPLACE FUNCTION public.complete_processing_step(queue_id_param bigint, step_name_param text, output_data_param jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    next_step TEXT;
    current_progress INT;
BEGIN
    -- Update the step as completed
    UPDATE video_processing_steps
    SET 
        status = 'completed',
        completed_at = now(),
        duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::INT,
        output_data = COALESCE(output_data_param, output_data),
        updated_at = now()
    WHERE queue_id = queue_id_param AND step_name = step_name_param;
    
    -- Calculate and update progress
    current_progress := calculate_video_processing_progress(queue_id_param);
    
    -- Get next step
    next_step := get_next_processing_step(queue_id_param);
    
    -- Update queue status
    IF next_step IS NULL THEN
        -- All steps completed
        UPDATE video_processing_queue
        SET 
            current_step = 'completed',
            status = 'completed',
            completed_at = now(),
            progress_percentage = 100,
            updated_at = now()
        WHERE id = queue_id_param;
    ELSE
        -- Move to next step
        UPDATE video_processing_queue
        SET 
            current_step = next_step,
            status = 'pending',
            updated_at = now()
        WHERE id = queue_id_param;
    END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.universal_search_enhanced(search_query text, search_tables text[] DEFAULT ARRAY['profiles'::text, 'course'::text, 'course_lesson'::text, 'community_post'::text, 'community_comment'::text, 'classroom'::text, 'community_group'::text, 'ai_agent'::text, 'course_notes'::text, 'tutoring_tutors'::text, 'course_reviews'::text, 'announcements'::text, 'course_quiz_question'::text, 'ai_workflow_templates'::text, 'learning_goal'::text, 'classroom_assignment'::text, 'classroom_posts'::text, 'course_chapter'::text, 'mistake_book'::text, 'tutoring_note'::text, 'community_quiz'::text, 'community_quiz_question'::text], max_results integer DEFAULT 50, min_rank real DEFAULT 0.1)
 RETURNS TABLE(table_name text, record_id bigint, title text, snippet text, rank real, content_type text, created_at timestamp with time zone, additional_data jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
  table_name text;
BEGIN
  -- Search across specified tables
  FOREACH table_name IN ARRAY search_tables
  LOOP
    -- AI workflow templates search
    IF table_name = 'ai_workflow_templates' THEN
      RETURN QUERY
      SELECT 
        'ai_workflow_templates'::text as table_name,
        awt.id as record_id,
        awt.name as title,
        LEFT(COALESCE(awt.description, awt.name), 200) as snippet,
        ts_rank(awt.search_vector, plainto_tsquery('english', search_query)) as rank,
        'workflow_template'::text as content_type,
        awt.created_at,
        jsonb_build_object(
          'category', awt.category,
          'visibility', awt.visibility,
          'tags', awt.tags,
          'usage_count', awt.usage_count,
          'public_id', awt.public_id
        ) as additional_data
      FROM ai_workflow_templates awt
      WHERE awt.search_vector @@ plainto_tsquery('english', search_query)
        AND awt.is_deleted = false
        AND awt.is_active = true
        AND ts_rank(awt.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(awt.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Learning goal search
    IF table_name = 'learning_goal' THEN
      RETURN QUERY
      SELECT 
        'learning_goal'::text as table_name,
        lg.id as record_id,
        CONCAT(lg.goal_type, ' Goal') as title,
        CONCAT('Target: ', lg.target_value, ' - Status: ', lg.status) as snippet,
        ts_rank(lg.search_vector, plainto_tsquery('english', search_query)) as rank,
        'learning_goal'::text as content_type,
        lg.created_at,
        jsonb_build_object(
          'goal_type', lg.goal_type,
          'target_value', lg.target_value,
          'current_value', lg.current_value,
          'status', lg.status,
          'reward_type', lg.reward_type,
          'public_id', lg.public_id
        ) as additional_data
      FROM learning_goal lg
      WHERE lg.search_vector @@ plainto_tsquery('english', search_query)
        AND lg.is_deleted = false
        AND ts_rank(lg.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(lg.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Classroom assignment search
    IF table_name = 'classroom_assignment' THEN
      RETURN QUERY
      SELECT 
        'classroom_assignment'::text as table_name,
        ca.id as record_id,
        ca.title as title,
        LEFT(COALESCE(ca.description, ca.title), 200) as snippet,
        ts_rank(ca.search_vector, plainto_tsquery('english', search_query)) as rank,
        'assignment'::text as content_type,
        ca.created_at,
        jsonb_build_object(
          'classroom_id', ca.classroom_id,
          'due_date', ca.due_date,
          'max_score', ca.max_score,
          'submission_type', ca.submission_type,
          'public_id', ca.public_id
        ) as additional_data
      FROM classroom_assignment ca
      WHERE ca.search_vector @@ plainto_tsquery('english', search_query)
        AND ca.is_deleted = false
        AND ts_rank(ca.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(ca.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Classroom posts search
    IF table_name = 'classroom_posts' THEN
      RETURN QUERY
      SELECT 
        'classroom_posts'::text as table_name,
        cp.id as record_id,
        LEFT(cp.content, 50) as title,
        LEFT(cp.content, 200) as snippet,
        ts_rank(cp.search_vector, plainto_tsquery('english', search_query)) as rank,
        'classroom_post'::text as content_type,
        cp.created_at,
        jsonb_build_object(
          'session_id', cp.session_id,
          'user_id', cp.user_id,
          'public_id', cp.public_id
        ) as additional_data
      FROM classroom_posts cp
      WHERE cp.search_vector @@ plainto_tsquery('english', search_query)
        AND cp.is_deleted = false
        AND ts_rank(cp.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cp.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Course chapter search
    IF table_name = 'course_chapter' THEN
      RETURN QUERY
      SELECT 
        'course_chapter'::text as table_name,
        cc.id as record_id,
        cc.title as title,
        LEFT(COALESCE(cc.description, cc.title), 200) as snippet,
        ts_rank(cc.search_vector, plainto_tsquery('english', search_query)) as rank,
        'chapter'::text as content_type,
        cc.created_at,
        jsonb_build_object(
          'lesson_id', cc.lesson_id,
          'start_time_sec', cc.start_time_sec,
          'end_time_sec', cc.end_time_sec,
          'order_index', cc.order_index
        ) as additional_data
      FROM course_chapter cc
      WHERE cc.search_vector @@ plainto_tsquery('english', search_query)
        AND cc.is_deleted = false
        AND ts_rank(cc.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cc.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Mistake book search
    IF table_name = 'mistake_book' THEN
      RETURN QUERY
      SELECT 
        'mistake_book'::text as table_name,
        mb.id as record_id,
        LEFT(mb.mistake_content, 50) as title,
        LEFT(COALESCE(mb.analysis, mb.mistake_content), 200) as snippet,
        ts_rank(mb.search_vector, plainto_tsquery('english', search_query)) as rank,
        'mistake'::text as content_type,
        mb.created_at,
        jsonb_build_object(
          'user_id', mb.user_id,
          'course_id', mb.course_id,
          'lesson_id', mb.lesson_id,
          'source_type', mb.source_type,
          'knowledge_points', mb.knowledge_points,
          'public_id', mb.public_id
        ) as additional_data
      FROM mistake_book mb
      WHERE mb.search_vector @@ plainto_tsquery('english', search_query)
        AND mb.is_deleted = false
        AND ts_rank(mb.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(mb.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Tutoring note search
    IF table_name = 'tutoring_note' THEN
      RETURN QUERY
      SELECT 
        'tutoring_note'::text as table_name,
        tn.id as record_id,
        COALESCE(tn.title, 'Untitled Note') as title,
        LEFT(COALESCE(tn.body, tn.title, 'No content'), 200) as snippet,
        ts_rank(tn.search_vector, plainto_tsquery('english', search_query)) as rank,
        'tutoring_note'::text as content_type,
        tn.created_at,
        jsonb_build_object(
          'owner_id', tn.owner_id,
          'public_id', tn.public_id
        ) as additional_data
      FROM tutoring_note tn
      WHERE tn.search_vector @@ plainto_tsquery('english', search_query)
        AND tn.is_deleted = false
        AND ts_rank(tn.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(tn.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Community quiz search
    IF table_name = 'community_quiz' THEN
      RETURN QUERY
      SELECT 
        'community_quiz'::text as table_name,
        cq.id as record_id,
        cq.title as title,
        LEFT(COALESCE(cq.description, cq.title), 200) as snippet,
        ts_rank(cq.search_vector, plainto_tsquery('english', search_query)) as rank,
        'quiz'::text as content_type,
        cq.created_at,
        jsonb_build_object(
          'slug', cq.slug,
          'author_id', cq.author_id,
          'difficulty', cq.difficulty,
          'visibility', cq.visibility,
          'tags', cq.tags,
          'public_id', cq.public_id
        ) as additional_data
      FROM community_quiz cq
      WHERE cq.search_vector @@ plainto_tsquery('english', search_query)
        AND cq.is_deleted = false
        AND cq.visibility = 'public'
        AND ts_rank(cq.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cq.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Community quiz question search
    IF table_name = 'community_quiz_question' THEN
      RETURN QUERY
      SELECT 
        'community_quiz_question'::text as table_name,
        cqq.id as record_id,
        LEFT(cqq.question_text, 50) as title,
        LEFT(COALESCE(cqq.explanation, cqq.question_text), 200) as snippet,
        ts_rank(cqq.search_vector, plainto_tsquery('english', search_query)) as rank,
        'quiz_question'::text as content_type,
        cq.created_at,
        jsonb_build_object(
          'quiz_id', cqq.quiz_id,
          'question_type', cqq.question_type,
          'options', cqq.options,
          'public_id', cqq.public_id
        ) as additional_data
      FROM community_quiz_question cqq
      JOIN community_quiz cq ON cqq.quiz_id = cq.id
      WHERE cqq.search_vector @@ plainto_tsquery('english', search_query)
        AND cq.visibility = 'public'
        AND cq.is_deleted = false
        AND ts_rank(cqq.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cqq.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
  END LOOP;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.update_continue_watching_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update is_continue_watching flag based on progress
  NEW.is_continue_watching := (
    NEW.state = 'in_progress' 
    AND NEW.progress_pct > 5 
    AND NEW.progress_pct < 95
    AND NEW.video_position_sec > 0
  );
  
  -- Update last_accessed_at when progress changes
  IF TG_OP = 'UPDATE' AND (
    OLD.progress_pct != NEW.progress_pct 
    OR OLD.video_position_sec != NEW.video_position_sec
    OR OLD.state != NEW.state
  ) THEN
    NEW.last_accessed_at := now();
  END IF;
  
  RETURN NEW;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.handle_step_failure(queue_id_param bigint, step_name_param text, error_message_param text, error_details_param jsonb DEFAULT NULL::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_retry_count INT;
    max_retries_allowed INT;
    should_retry BOOLEAN := FALSE;
BEGIN
    -- Get current retry count and max retries
    SELECT retry_count, max_retries INTO current_retry_count, max_retries_allowed
    FROM video_processing_queue
    WHERE id = queue_id_param;
    
    -- Update step as failed
    UPDATE video_processing_steps
    SET 
        status = 'failed',
        error_message = error_message_param,
        updated_at = now()
    WHERE queue_id = queue_id_param AND step_name = step_name_param;
    
    -- Check if we should retry
    IF current_retry_count < max_retries_allowed THEN
        should_retry := TRUE;
        
        -- Update queue for retry
        UPDATE video_processing_queue
        SET 
            status = 'retrying',
            retry_count = retry_count + 1,
            error_message = error_message_param,
            error_details = error_details_param,
            last_error_at = now(),
            updated_at = now()
        WHERE id = queue_id_param;
        
        -- Reset step to pending for retry
        UPDATE video_processing_steps
        SET 
            status = 'pending',
            retry_count = retry_count + 1,
            error_message = NULL,
            updated_at = now()
        WHERE queue_id = queue_id_param AND step_name = step_name_param;
        
    ELSE
        -- Max retries exceeded, mark as failed
        UPDATE video_processing_queue
        SET 
            current_step = 'failed',
            status = 'failed',
            error_message = error_message_param,
            error_details = error_details_param,
            last_error_at = now(),
            updated_at = now()
        WHERE id = queue_id_param;
    END IF;
    
    RETURN should_retry;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.cancel_video_processing(queue_id_param bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Update queue as cancelled
    UPDATE video_processing_queue
    SET 
        current_step = 'cancelled',
        status = 'cancelled',
        cancelled_at = now(),
        updated_at = now()
    WHERE id = queue_id_param;
    
    -- Cancel all pending steps
    UPDATE video_processing_steps
    SET 
        status = 'skipped',
        updated_at = now()
    WHERE queue_id = queue_id_param AND status = 'pending';
END;
$function$;;


CREATE OR REPLACE FUNCTION public.get_user_notification_preferences(p_user_id bigint, p_category_name text)
 RETURNS TABLE(push_enabled boolean, email_enabled boolean, in_app_enabled boolean, sms_enabled boolean, is_quiet_hours boolean)
 LANGUAGE plpgsql
AS $function$
DECLARE
  category_record RECORD;
  pref_record RECORD;
  current_time_in_tz time;
BEGIN
  -- Get category
  SELECT id INTO category_record FROM notification_categories WHERE name = p_category_name;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get user preferences (create default if not exists)
  SELECT * INTO pref_record 
  FROM user_notification_preferences 
  WHERE user_id = p_user_id AND category_id = category_record.id;
  
  IF NOT FOUND THEN
    -- Insert default preferences
    INSERT INTO user_notification_preferences (user_id, category_id)
    VALUES (p_user_id, category_record.id)
    RETURNING * INTO pref_record;
  END IF;
  
  -- Check if current time is in quiet hours
  current_time_in_tz := (now() AT TIME ZONE COALESCE(pref_record.timezone, 'UTC'))::time;
  
  RETURN QUERY SELECT 
    pref_record.push_enabled,
    pref_record.email_enabled,
    pref_record.in_app_enabled,
    pref_record.sms_enabled,
    CASE 
      WHEN pref_record.quiet_hours_start IS NULL OR pref_record.quiet_hours_end IS NULL THEN false
      WHEN pref_record.quiet_hours_start <= pref_record.quiet_hours_end THEN
        current_time_in_tz BETWEEN pref_record.quiet_hours_start AND pref_record.quiet_hours_end
      ELSE
        current_time_in_tz >= pref_record.quiet_hours_start OR current_time_in_tz <= pref_record.quiet_hours_end
    END as is_quiet_hours;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.queue_for_embedding_qstash(p_content_type text, p_content_id bigint, p_priority integer DEFAULT 5)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  webhook_url text;
  payload jsonb;
  response text;
BEGIN
  -- Validate content type for embedding
  IF p_content_type NOT IN ('profile', 'course', 'post', 'lesson', 'comment', 'auth_user', 
                             'classroom', 'live_session', 'assignment', 'quiz_question', 
                             'course_note', 'course_review', 'community_group', 'ai_agent', 
                             'notification', 'community_post') THEN
    RAISE NOTICE 'Invalid content type for embedding: %', p_content_type;
    RETURN false;
  END IF;

  -- Get the base URL from environment or use default
  webhook_url := coalesce(
    current_setting('app.site_url', true),
    'http://localhost:3000'
  ) || '/api/embeddings/process-webhook';
  
  -- Create payload for embedding webhook
  payload := jsonb_build_object(
    'contentType', p_content_type,
    'contentId', p_content_id,
    'priority', p_priority,
    'timestamp', extract(epoch from now())
  );
  
  -- Log the embedding queue request
  RAISE NOTICE 'Queueing % % for embedding with priority %', p_content_type, p_content_id, p_priority;
  
  -- Use pg_net extension to make HTTP request to QStash
  -- Note: This requires pg_net extension and proper QStash configuration
  -- For now, we'll fall back to database queue if QStash is not available
  
  -- Fallback to database queue
  RETURN queue_for_embedding(p_content_type, p_content_id, p_priority);
  
EXCEPTION WHEN OTHERS THEN
  -- If QStash fails, fallback to database queue
  RAISE NOTICE 'QStash embedding failed, using database queue: %', SQLERRM;
  RETURN queue_for_embedding(p_content_type, p_content_id, p_priority);
END;
$function$;;

- Create the continue watching view
CREATE OR REPLACE VIEW continue_watching_view AS
SELECT 
  cp.user_id,
  cl.public_id as lesson_public_id,
  cl.title as lesson_title,
  c.slug as course_slug,
  c.title as course_title,
  c.thumbnail_url as course_thumbnail,
  cm.title as module_title,
  cp.progress_pct,
  cp.video_position_sec,
  cp.video_duration_sec,
  cp.last_accessed_at,
  -- Calculate a score for "continue watching" priority
  -- Higher score = shown first
  (
    -- Recency: More recent videos get higher priority (decay by hour)
    EXTRACT(EPOCH FROM (NOW() - cp.last_accessed_at)) / 3600 * -0.1 +
    
    -- Progress: Videos with 10-90% completion get highest priority
    CASE 
      WHEN cp.progress_pct BETWEEN 10 AND 90 THEN 15
      WHEN cp.progress_pct BETWEEN 5 AND 95 THEN 10
      ELSE 5
    END +
    
    -- Watch time: Videos watched for at least 30 seconds get bonus
    CASE WHEN cp.video_position_sec > 30 THEN 5 ELSE 0 END +
    
    -- Duration remaining: More content left = higher priority
    CASE 
      WHEN cp.video_duration_sec > 0 THEN 
        ((cp.video_duration_sec - cp.video_position_sec) / 60.0) * 0.01
      ELSE 0
    END
  ) as continue_score,
  
  -- Additional useful fields
  cp.state,
  cp.time_spent_sec,
  cl.id as lesson_id,
  cm.id as module_id,
  c.id as course_id,
  cp.id as progress_id,
  cp.updated_at
  
FROM course_progress cp
INNER JOIN course_lesson cl ON cl.id = cp.lesson_id AND cl.is_deleted = false
INNER JOIN course_module cm ON cm.id = cl.module_id
INNER JOIN course c ON c.id = cl.course_id AND c.is_deleted = false
WHERE 
  cp.is_deleted = false
  AND cp.lesson_kind = 'video'
  AND cp.video_position_sec > 0
  AND cp.progress_pct < 100
  AND cp.progress_pct > 1 -- At least 1% progress
  AND (cp.video_duration_sec - cp.video_position_sec) > 10 -- At least 10 seconds remaining
  AND cp.last_accessed_at > NOW() - INTERVAL '30 days'; -- Only show videos from last 30 days

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_continue_watching_user 
  ON course_progress(user_id, last_accessed_at DESC)
  WHERE is_deleted = false 
    AND lesson_kind = 'video' 
    AND progress_pct < 100 
    AND progress_pct > 1;

-- Grant SELECT permission on the view
GRANT SELECT ON continue_watching_view TO authenticated;
GRANT SELECT ON continue_watching_view TO anon;

-- Add comment
COMMENT ON VIEW continue_watching_view IS 'Optimized view for displaying continue watching items on the dashboard. Shows videos with partial progress sorted by relevance.';


CREATE OR REPLACE FUNCTION public.get_continue_watching_for_user(p_user_id bigint, p_limit integer DEFAULT 5)
 RETURNS TABLE(lesson_public_id uuid, lesson_title text, course_slug text, course_title text, course_thumbnail text, module_title text, progress_pct numeric, video_position_sec integer, video_duration_sec integer, last_accessed_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cw.lesson_public_id,
    cw.lesson_title,
    cw.course_slug,
    cw.course_title,
    cw.course_thumbnail,
    cw.module_title,
    cw.progress_pct,
    cw.video_position_sec,
    cw.video_duration_sec,
    cw.last_accessed_at
  FROM continue_watching_view cw
  WHERE cw.user_id = p_user_id
  ORDER BY cw.continue_score DESC
  LIMIT p_limit;
END;
$function$;;


CREATE OR REPLACE FUNCTION public.universal_search(search_query text, search_tables text[] DEFAULT ARRAY['profiles'::text, 'course'::text, 'course_lesson'::text, 'community_post'::text, 'community_comment'::text, 'classroom'::text, 'community_group'::text, 'ai_agent'::text, 'course_notes'::text, 'tutoring_tutors'::text, 'course_reviews'::text, 'announcements'::text], max_results integer DEFAULT 50, min_rank real DEFAULT 0.1)
 RETURNS TABLE(table_name text, record_id bigint, title text, snippet text, rank real, content_type text, created_at timestamp with time zone, additional_data jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
  table_name text;
  query_text text;
BEGIN
  -- Prepare the search query
  query_text := plainto_tsquery('english', search_query)::text;
  
  -- Search across specified tables
  FOREACH table_name IN ARRAY search_tables
  LOOP
    -- Profiles search
    IF table_name = 'profiles' THEN
      RETURN QUERY
      SELECT 
        'profiles'::text as table_name,
        p.id as record_id,
        COALESCE(p.display_name, p.full_name, p.email, 'Unknown User') as title,
        LEFT(COALESCE(p.bio, p.display_name || ' - ' || p.role, p.email), 200) as snippet,
        ts_rank(p.search_vector, plainto_tsquery('english', search_query)) as rank,
        'user'::text as content_type,
        p.created_at,
        jsonb_build_object(
          'role', p.role,
          'avatar_url', p.avatar_url,
          'public_id', p.public_id,
          'status', p.status
        ) as additional_data
      FROM profiles p
      WHERE p.search_vector @@ plainto_tsquery('english', search_query)
        AND p.is_deleted = false
        AND p.status = 'active'
        AND ts_rank(p.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(p.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Course search
    IF table_name = 'course' THEN
      RETURN QUERY
      SELECT 
        'course'::text as table_name,
        c.id as record_id,
        c.title as title,
        LEFT(COALESCE(c.description, c.title), 200) as snippet,
        ts_rank(c.search_vector, plainto_tsquery('english', search_query)) as rank,
        'course'::text as content_type,
        c.created_at,
        jsonb_build_object(
          'slug', c.slug,
          'category', c.category,
          'level', c.level,
          'thumbnail_url', c.thumbnail_url,
          'price_cents', c.price_cents,
          'is_free', c.is_free,
          'public_id', c.public_id
        ) as additional_data
      FROM course c
      WHERE c.search_vector @@ plainto_tsquery('english', search_query)
        AND c.is_deleted = false
        AND c.status = 'active'
        AND c.visibility = 'public'
        AND ts_rank(c.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(c.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Course lesson search
    IF table_name = 'course_lesson' THEN
      RETURN QUERY
      SELECT 
        'course_lesson'::text as table_name,
        cl.id as record_id,
        cl.title as title,
        LEFT(COALESCE(cl.description, cl.title), 200) as snippet,
        ts_rank(cl.search_vector, plainto_tsquery('english', search_query)) as rank,
        'lesson'::text as content_type,
        cl.created_at,
        jsonb_build_object(
          'course_id', cl.course_id,
          'module_id', cl.module_id,
          'kind', cl.kind,
          'position', cl.position,
          'duration_sec', cl.duration_sec,
          'is_preview', cl.is_preview,
          'public_id', cl.public_id
        ) as additional_data
      FROM course_lesson cl
      JOIN course c ON cl.course_id = c.id
      WHERE cl.search_vector @@ plainto_tsquery('english', search_query)
        AND cl.is_deleted = false
        AND c.is_deleted = false
        AND c.status = 'active'
        AND c.visibility = 'public'
        AND ts_rank(cl.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cl.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Community post search (existing search_vector)
    IF table_name = 'community_post' THEN
      RETURN QUERY
      SELECT 
        'community_post'::text as table_name,
        cp.id as record_id,
        COALESCE(cp.title, LEFT(cp.body, 50), 'Untitled Post') as title,
        LEFT(COALESCE(cp.body, cp.title, 'No content'), 200) as snippet,
        ts_rank(cp.search_vector, plainto_tsquery('english', search_query)) as rank,
        'post'::text as content_type,
        cp.created_at,
        jsonb_build_object(
          'slug', cp.slug,
          'group_id', cp.group_id,
          'author_id', cp.author_id,
          'public_id', cp.public_id
        ) as additional_data
      FROM community_post cp
      LEFT JOIN community_group cg ON cp.group_id = cg.id
      WHERE cp.search_vector @@ plainto_tsquery('english', search_query)
        AND cp.is_deleted = false
        AND (cg.visibility = 'public' OR cg.id IS NULL)
        AND ts_rank(cp.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cp.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Community comment search
    IF table_name = 'community_comment' THEN
      RETURN QUERY
      SELECT 
        'community_comment'::text as table_name,
        cc.id as record_id,
        LEFT(cc.body, 50) as title,
        LEFT(cc.body, 200) as snippet,
        ts_rank(cc.search_vector, plainto_tsquery('english', search_query)) as rank,
        'comment'::text as content_type,
        cc.created_at,
        jsonb_build_object(
          'post_id', cc.post_id,
          'author_id', cc.author_id,
          'parent_id', cc.parent_id,
          'public_id', cc.public_id
        ) as additional_data
      FROM community_comment cc
      JOIN community_post cp ON cc.post_id = cp.id
      LEFT JOIN community_group cg ON cp.group_id = cg.id
      WHERE cc.search_vector @@ plainto_tsquery('english', search_query)
        AND cc.is_deleted = false
        AND cp.is_deleted = false
        AND (cg.visibility = 'public' OR cg.id IS NULL)
        AND ts_rank(cc.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cc.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Classroom search
    IF table_name = 'classroom' THEN
      RETURN QUERY
      SELECT 
        'classroom'::text as table_name,
        cr.id as record_id,
        cr.name as title,
        LEFT(COALESCE(cr.description, cr.name), 200) as snippet,
        ts_rank(cr.search_vector, plainto_tsquery('english', search_query)) as rank,
        'classroom'::text as content_type,
        cr.created_at,
        jsonb_build_object(
          'class_code', cr.class_code,
          'owner_id', cr.owner_id,
          'course_id', cr.course_id,
          'status', cr.status,
          'public_id', cr.public_id
        ) as additional_data
      FROM classroom cr
      WHERE cr.search_vector @@ plainto_tsquery('english', search_query)
        AND cr.is_deleted = false
        AND cr.status = 'active'
        AND ts_rank(cr.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cr.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Community group search
    IF table_name = 'community_group' THEN
      RETURN QUERY
      SELECT 
        'community_group'::text as table_name,
        cg.id as record_id,
        cg.name as title,
        LEFT(COALESCE(cg.description, cg.name), 200) as snippet,
        ts_rank(cg.search_vector, plainto_tsquery('english', search_query)) as rank,
        'group'::text as content_type,
        cg.created_at,
        jsonb_build_object(
          'slug', cg.slug,
          'visibility', cg.visibility,
          'owner_id', cg.owner_id,
          'public_id', cg.public_id
        ) as additional_data
      FROM community_group cg
      WHERE cg.search_vector @@ plainto_tsquery('english', search_query)
        AND cg.is_deleted = false
        AND cg.visibility = 'public'
        AND ts_rank(cg.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cg.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- AI agent search
    IF table_name = 'ai_agent' THEN
      RETURN QUERY
      SELECT 
        'ai_agent'::text as table_name,
        aa.id as record_id,
        aa.name as title,
        LEFT(COALESCE(aa.purpose, aa.name), 200) as snippet,
        ts_rank(aa.search_vector, plainto_tsquery('english', search_query)) as rank,
        'ai_agent'::text as content_type,
        aa.created_at,
        jsonb_build_object(
          'owner_id', aa.owner_id,
          'config', aa.config,
          'public_id', aa.public_id
        ) as additional_data
      FROM ai_agent aa
      WHERE aa.search_vector @@ plainto_tsquery('english', search_query)
        AND aa.is_deleted = false
        AND ts_rank(aa.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(aa.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Course notes search
    IF table_name = 'course_notes' THEN
      RETURN QUERY
      SELECT 
        'course_notes'::text as table_name,
        cn.id as record_id,
        LEFT(cn.content, 50) as title,
        LEFT(COALESCE(cn.ai_summary, cn.content), 200) as snippet,
        ts_rank(cn.search_vector, plainto_tsquery('english', search_query)) as rank,
        'note'::text as content_type,
        cn.created_at,
        jsonb_build_object(
          'user_id', cn.user_id,
          'lesson_id', cn.lesson_id,
          'timestamp_sec', cn.timestamp_sec,
          'tags', cn.tags,
          'public_id', cn.public_id
        ) as additional_data
      FROM course_notes cn
      WHERE cn.search_vector @@ plainto_tsquery('english', search_query)
        AND cn.is_deleted = false
        AND ts_rank(cn.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cn.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Tutoring tutors search
    IF table_name = 'tutoring_tutors' THEN
      RETURN QUERY
      SELECT 
        'tutoring_tutors'::text as table_name,
        tt.id as record_id,
        COALESCE(tt.headline, 'Tutor Profile') as title,
        LEFT(COALESCE(tt.qualifications, tt.headline, 'Professional Tutor'), 200) as snippet,
        ts_rank(tt.search_vector, plainto_tsquery('english', search_query)) as rank,
        'tutor'::text as content_type,
        tt.created_at,
        jsonb_build_object(
          'user_id', tt.user_id,
          'subjects', tt.subjects,
          'hourly_rate', tt.hourly_rate,
          'rating_avg', tt.rating_avg,
          'rating_count', tt.rating_count,
          'public_id', tt.public_id
        ) as additional_data
      FROM tutoring_tutors tt
      WHERE tt.search_vector @@ plainto_tsquery('english', search_query)
        AND tt.is_deleted = false
        AND ts_rank(tt.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(tt.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Course reviews search
    IF table_name = 'course_reviews' THEN
      RETURN QUERY
      SELECT 
        'course_reviews'::text as table_name,
        cr.id as record_id,
        CONCAT('Review (', cr.rating, ' stars)') as title,
        LEFT(COALESCE(cr.comment, 'No comment provided'), 200) as snippet,
        ts_rank(cr.search_vector, plainto_tsquery('english', search_query)) as rank,
        'review'::text as content_type,
        cr.created_at,
        jsonb_build_object(
          'course_id', cr.course_id,
          'user_id', cr.user_id,
          'rating', cr.rating,
          'public_id', cr.public_id
        ) as additional_data
      FROM course_reviews cr
      JOIN course c ON cr.course_id = c.id
      WHERE cr.search_vector @@ plainto_tsquery('english', search_query)
        AND cr.is_deleted = false
        AND c.is_deleted = false
        AND c.status = 'active'
        AND c.visibility = 'public'
        AND ts_rank(cr.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cr.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Announcements search
    IF table_name = 'announcements' THEN
      RETURN QUERY
      SELECT 
        'announcements'::text as table_name,
        a.id as record_id,
        a.title as title,
        LEFT(a.message, 200) as snippet,
        ts_rank(a.search_vector, plainto_tsquery('english', search_query)) as rank,
        'announcement'::text as content_type,
        a.created_at,
        jsonb_build_object(
          'created_by', a.created_by,
          'status', a.status,
          'scheduled_at', a.scheduled_at,
          'public_id', a.public_id
        ) as additional_data
      FROM announcements a
      WHERE a.search_vector @@ plainto_tsquery('english', search_query)
        AND a.is_deleted = false
        AND a.status = 'sent'
        AND ts_rank(a.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(a.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
  END LOOP;
END;
$function$;


CREATE OR REPLACE FUNCTION public.search_users(search_query text, user_role text DEFAULT NULL::text, max_results integer DEFAULT 20)
 RETURNS TABLE(user_id bigint, public_id uuid, display_name text, full_name text, email text, role text, bio text, avatar_url text, rank real)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.public_id,
    p.display_name,
    p.full_name,
    p.email,
    p.role,
    p.bio,
    p.avatar_url,
    ts_rank(p.search_vector, plainto_tsquery('english', search_query)) as rank
  FROM profiles p
  WHERE p.search_vector @@ plainto_tsquery('english', search_query)
    AND p.is_deleted = false
    AND p.status = 'active'
    AND (user_role IS NULL OR p.role = user_role)
  ORDER BY ts_rank(p.search_vector, plainto_tsquery('english', search_query)) DESC
  LIMIT max_results;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_community_quiz_question_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.question_text, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.explanation, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.question_type, '')), 'C') ||
    -- Process options array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.options, ' '), ''
    )), 'B') ||
    -- Process correct_answers array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.correct_answers, ' '), ''
    )), 'C');
  
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_daily_plan_stats()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;


CREATE OR REPLACE FUNCTION public.initialize_coach_settings_for_existing_users()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO coach_settings (user_id)
  SELECT id FROM profiles 
  WHERE id NOT IN (SELECT user_id FROM coach_settings)
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_courses(search_query text, course_category text DEFAULT NULL::text, course_level text DEFAULT NULL::text, max_results integer DEFAULT 20)
 RETURNS TABLE(course_id bigint, public_id uuid, title text, description text, slug text, category text, level text, price_cents integer, is_free boolean, thumbnail_url text, rank real)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as course_id,
    c.public_id,
    c.title,
    c.description,
    c.slug,
    c.category,
    c.level,
    c.price_cents,
    c.is_free,
    c.thumbnail_url,
    ts_rank(c.search_vector, plainto_tsquery('english', search_query)) as rank
  FROM course c
  WHERE c.search_vector @@ plainto_tsquery('english', search_query)
    AND c.is_deleted = false
    AND c.status = 'active'
    AND c.visibility = 'public'
    AND (course_category IS NULL OR c.category = course_category)
    AND (course_level IS NULL OR c.level = course_level)
  ORDER BY ts_rank(c.search_vector, plainto_tsquery('english', search_query)) DESC
  LIMIT max_results;
END;
$function$;


CREATE OR REPLACE FUNCTION public.log_search_query(user_id_param bigint, query_text text, search_type text DEFAULT 'universal'::text, results_count integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO audit_log (actor_id, action, subject_type, subject_id, meta)
  VALUES (
    user_id_param,
    'search',
    'search_query',
    NULL,
    jsonb_build_object(
      'query', query_text,
      'search_type', search_type,
      'results_count', results_count,
      'timestamp', now()
    )
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.search_workflow_templates(search_query text, template_category text DEFAULT NULL::text, template_visibility text DEFAULT NULL::text, max_results integer DEFAULT 20)
 RETURNS TABLE(template_id bigint, public_id uuid, name text, description text, category text, visibility text, tags text[], usage_count integer, rank real)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    awt.id as template_id,
    awt.public_id,
    awt.name,
    awt.description,
    awt.category,
    awt.visibility,
    awt.tags,
    awt.usage_count,
    ts_rank(awt.search_vector, plainto_tsquery('english', search_query)) as rank
  FROM ai_workflow_templates awt
  WHERE awt.search_vector @@ plainto_tsquery('english', search_query)
    AND awt.is_deleted = false
    AND awt.is_active = true
    AND (template_category IS NULL OR awt.category = template_category)
    AND (template_visibility IS NULL OR awt.visibility = template_visibility)
  ORDER BY ts_rank(awt.search_vector, plainto_tsquery('english', search_query)) DESC
  LIMIT max_results;
END;
$function$;


CREATE OR REPLACE FUNCTION public.search_learning_content(search_query text, content_types text[] DEFAULT ARRAY['course'::text, 'course_lesson'::text, 'course_notes'::text, 'course_chapter'::text, 'mistake_book'::text], max_results integer DEFAULT 30)
 RETURNS TABLE(content_type text, content_id bigint, title text, snippet text, rank real, metadata jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
  content_type text;
BEGIN
  FOREACH content_type IN ARRAY content_types
  LOOP
    IF content_type = 'course' THEN
      RETURN QUERY
      SELECT 
        'course'::text,
        c.id,
        c.title,
        LEFT(COALESCE(c.description, c.title), 200),
        ts_rank(c.search_vector, plainto_tsquery('english', search_query)),
        jsonb_build_object('level', c.level, 'category', c.category, 'is_free', c.is_free)
      FROM course c
      WHERE c.search_vector @@ plainto_tsquery('english', search_query)
        AND c.is_deleted = false
        AND c.status = 'active'
        AND c.visibility = 'public'
      ORDER BY ts_rank(c.search_vector, plainto_tsquery('english', search_query)) DESC;
    END IF;
    
    IF content_type = 'course_lesson' THEN
      RETURN QUERY
      SELECT 
        'course_lesson'::text,
        cl.id,
        cl.title,
        LEFT(COALESCE(cl.description, cl.title), 200),
        ts_rank(cl.search_vector, plainto_tsquery('english', search_query)),
        jsonb_build_object('kind', cl.kind, 'duration_sec', cl.duration_sec)
      FROM course_lesson cl
      JOIN course c ON cl.course_id = c.id
      WHERE cl.search_vector @@ plainto_tsquery('english', search_query)
        AND cl.is_deleted = false
        AND c.is_deleted = false
        AND c.status = 'active'
        AND c.visibility = 'public'
      ORDER BY ts_rank(cl.search_vector, plainto_tsquery('english', search_query)) DESC;
    END IF;
    
    -- Add other content types as needed...
  END LOOP;
  
  -- Limit total results
  RETURN QUERY
  SELECT * FROM (
    SELECT DISTINCT ON (content_type, content_id) *
    FROM search_learning_content
    ORDER BY content_type, content_id, rank DESC
  ) sub
  ORDER BY rank DESC
  LIMIT max_results;
END;
$function$;


CREATE OR REPLACE FUNCTION public.generate_lesson_slug()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.slug is null then
    new.slug := lower(regexp_replace(new.title, '[^a-zA-Z0-9\s]', '', 'g'));
    new.slug := regexp_replace(new.slug, '\s+', '-', 'g');
    new.slug := new.slug || '-' || substring(new.public_id::text from 1 for 8);
  end if;
  return new;
END;
$function$;


CREATE OR REPLACE FUNCTION public.search_video_embeddings_e5(query_embedding vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10)
 RETURNS TABLE(id bigint, attachment_id bigint, content_text text, similarity double precision, chunk_type text, word_count integer, sentence_count integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ve.id,
    ve.attachment_id,
    ve.content_text,
    1 - (ve.embedding_e5_small <=> query_embedding) as similarity,
    ve.chunk_type,
    ve.word_count,
    ve.sentence_count,
    ve.created_at
  FROM video_embeddings ve
  WHERE 
    ve.has_e5_embedding = true
    AND ve.status = 'completed'
    AND ve.is_deleted = false
    AND 1 - (ve.embedding_e5_small <=> query_embedding) > match_threshold
  ORDER BY ve.embedding_e5_small <=> query_embedding
  LIMIT match_count;
END;
$function$;


CREATE OR REPLACE FUNCTION public.smart_contextual_search(search_query text, user_id_param bigint DEFAULT NULL::bigint, user_role_param text DEFAULT 'student'::text, search_context text DEFAULT 'general'::text, max_results integer DEFAULT 20)
 RETURNS TABLE(table_name text, record_id bigint, title text, snippet text, rank real, content_type text, relevance_score real, additional_data jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
  tables_to_search text[];
BEGIN
  -- Determine tables to search based on context and role
  CASE search_context
    WHEN 'learning' THEN
      tables_to_search := ARRAY['course', 'course_lesson', 'course_notes', 'course_chapter', 'mistake_book', 'learning_goal'];
    WHEN 'teaching' THEN
      tables_to_search := ARRAY['course', 'course_lesson', 'classroom', 'classroom_assignment', 'ai_workflow_templates'];
    WHEN 'admin' THEN
      tables_to_search := ARRAY['profiles', 'course', 'community_post', 'announcements', 'ai_workflow_templates'];
    ELSE -- 'general'
      tables_to_search := ARRAY['course', 'community_post', 'community_group', 'profiles'];
  END CASE;

  -- Add role-specific tables
  IF user_role_param = 'tutor' THEN
    tables_to_search := tables_to_search || ARRAY['tutoring_tutors', 'tutoring_note'];
  END IF;

  -- Perform enhanced universal search with context
  RETURN QUERY
  SELECT 
    eus.table_name,
    eus.record_id,
    eus.title,
    eus.snippet,
    eus.rank,
    eus.content_type,
    -- Calculate relevance score based on context
    CASE 
      WHEN search_context = 'learning' AND eus.content_type IN ('course', 'lesson', 'note') THEN eus.rank * 1.5
      WHEN search_context = 'teaching' AND eus.content_type IN ('classroom', 'assignment') THEN eus.rank * 1.3
      ELSE eus.rank
    END as relevance_score,
    eus.additional_data
  FROM universal_search_enhanced(search_query, tables_to_search, max_results * 2) eus
  ORDER BY relevance_score DESC
  LIMIT max_results;
END;
$function$;


CREATE OR REPLACE FUNCTION public.search_video_embeddings_bge(query_embedding vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10)
 RETURNS TABLE(id bigint, attachment_id bigint, content_text text, similarity double precision, chunk_type text, word_count integer, sentence_count integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ve.id,
    ve.attachment_id,
    ve.content_text,
    1 - (ve.embedding_bge_m3 <=> query_embedding) as similarity,
    ve.chunk_type,
    ve.word_count,
    ve.sentence_count,
    ve.created_at
  FROM video_embeddings ve
  WHERE 
    ve.has_bge_embedding = true
    AND ve.status = 'completed'
    AND ve.is_deleted = false
    AND 1 - (ve.embedding_bge_m3 <=> query_embedding) > match_threshold
  ORDER BY ve.embedding_bge_m3 <=> query_embedding
  LIMIT match_count;
END;
$function$;


CREATE OR REPLACE FUNCTION public.search_video_embeddings_hybrid(query_embedding_e5 vector DEFAULT NULL::vector, query_embedding_bge vector DEFAULT NULL::vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10, weight_e5 double precision DEFAULT 0.4, weight_bge double precision DEFAULT 0.6)
 RETURNS TABLE(id bigint, attachment_id bigint, content_text text, similarity double precision, chunk_type text, word_count integer, sentence_count integer, created_at timestamp with time zone, embedding_types text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ve.id,
    ve.attachment_id,
    ve.content_text,
    CASE 
      WHEN query_embedding_e5 IS NOT NULL AND query_embedding_bge IS NOT NULL 
           AND ve.has_e5_embedding AND ve.has_bge_embedding THEN
        -- Both embeddings available - weighted average
        (weight_e5 * (1 - (ve.embedding_e5_small <=> query_embedding_e5))) +
        (weight_bge * (1 - (ve.embedding_bge_m3 <=> query_embedding_bge)))
      WHEN query_embedding_e5 IS NOT NULL AND ve.has_e5_embedding THEN
        -- Only E5 available
        1 - (ve.embedding_e5_small <=> query_embedding_e5)
      WHEN query_embedding_bge IS NOT NULL AND ve.has_bge_embedding THEN
        -- Only BGE available
        1 - (ve.embedding_bge_m3 <=> query_embedding_bge)
      ELSE 0
    END as similarity,
    ve.chunk_type,
    ve.word_count,
    ve.sentence_count,
    ve.created_at,
    CASE 
      WHEN ve.has_e5_embedding AND ve.has_bge_embedding THEN 'dual'
      WHEN ve.has_e5_embedding THEN 'e5_only'
      WHEN ve.has_bge_embedding THEN 'bge_only'
      ELSE 'none'
    END as embedding_types
  FROM video_embeddings ve
  WHERE 
    ve.status = 'completed'
    AND ve.is_deleted = false
    AND (
      (query_embedding_e5 IS NOT NULL AND ve.has_e5_embedding AND 
       1 - (ve.embedding_e5_small <=> query_embedding_e5) > match_threshold)
      OR
      (query_embedding_bge IS NOT NULL AND ve.has_bge_embedding AND 
       1 - (ve.embedding_bge_m3 <=> query_embedding_bge) > match_threshold)
    )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$function$;


CREATE OR REPLACE FUNCTION public.generate_content_hash(content_text text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN encode(digest(content_text, 'sha256'), 'hex');
END;
$function$;


CREATE OR REPLACE FUNCTION public.queue_for_embedding(p_content_type text, p_content_id bigint, p_priority integer DEFAULT 5)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  content_text text;
  content_hash text;
  existing_hash text;
BEGIN
  content_text := extract_content_text(p_content_type, p_content_id);
  
  IF content_text = '' THEN
    RETURN false;
  END IF;
  
  content_hash := generate_content_hash(content_text);
  
  SELECT e.content_hash INTO existing_hash
  FROM embeddings e
  WHERE e.content_type = p_content_type 
    AND e.content_id = p_content_id 
    AND e.status = 'completed'
    AND e.is_deleted = false;
  
  IF existing_hash = content_hash THEN
    RETURN false;
  END IF;
  
  UPDATE embeddings 
  SET status = 'outdated', updated_at = now()
  WHERE content_type = p_content_type 
    AND content_id = p_content_id 
    AND status = 'completed';
  
  INSERT INTO embedding_queue (
    content_type, content_id, content_text, content_hash, priority
  ) VALUES (
    p_content_type, p_content_id, content_text, content_hash, p_priority
  )
  ON CONFLICT (content_type, content_id) 
  DO UPDATE SET
    content_text = EXCLUDED.content_text,
    content_hash = EXCLUDED.content_hash,
    priority = EXCLUDED.priority,
    status = 'queued',
    retry_count = 0,
    error_message = NULL,
    updated_at = now();
  
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.semantic_search(p_query_embedding vector, p_content_types text[] DEFAULT NULL::text[], p_similarity_threshold numeric DEFAULT 0.7, p_max_results integer DEFAULT 10, p_user_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(content_type text, content_id bigint, content_text text, similarity numeric, metadata jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
  search_id bigint;
BEGIN
  IF p_user_id IS NOT NULL THEN
    INSERT INTO embedding_searches (
      user_id, query_embedding, content_types, similarity_threshold, max_results
    ) VALUES (
      p_user_id, p_query_embedding, p_content_types, p_similarity_threshold, p_max_results
    ) RETURNING id INTO search_id;
  END IF;
  
  RETURN QUERY
  SELECT 
    e.content_type,
    e.content_id,
    e.content_text,
    (1 - (e.embedding <=> p_query_embedding))::numeric AS similarity,
    jsonb_build_object(
      'created_at', e.created_at,
      'updated_at', e.updated_at,
      'token_count', e.token_count,
      'embedding_model', e.embedding_model
    ) AS metadata
  FROM embeddings e
  WHERE e.status = 'completed'
    AND e.is_deleted = false
    AND (p_content_types IS NULL OR e.content_type = ANY(p_content_types))
    AND (1 - (e.embedding <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT p_max_results;
  
  IF p_user_id IS NOT NULL AND search_id IS NOT NULL THEN
    UPDATE embedding_searches 
    SET results_count = (
      SELECT COUNT(*) FROM embeddings e
      WHERE e.status = 'completed'
        AND e.is_deleted = false
        AND (p_content_types IS NULL OR e.content_type = ANY(p_content_types))
        AND (1 - (e.embedding <=> p_query_embedding)) >= p_similarity_threshold
    )
    WHERE id = search_id;
  END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_embedding_stats()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.word_count = 0 THEN
    NEW.word_count = array_length(string_to_array(trim(NEW.content_text), ' '), 1);
  END IF;
  
  IF NEW.sentence_count = 0 THEN
    NEW.sentence_count = array_length(
      string_to_array(
        regexp_replace(NEW.content_text, '[.!?。！？]+', '|', 'g'), 
        '|'
      ), 
      1
    );
  END IF;
  
  IF NEW.has_code_block IS NULL THEN
    NEW.has_code_block = NEW.content_text ~ '```[\s\S]*?```|`[^`]+`';
  END IF;
  
  IF NEW.has_table IS NULL THEN
    NEW.has_table = NEW.content_text ~ '\|.*\||┌.*┐';
  END IF;
  
  IF NEW.has_list IS NULL THEN
    NEW.has_list = NEW.content_text ~ '^[\s]*[-*+]\s|^[\s]*\d+\.\s';
  END IF;
  
  IF NEW.chunk_type IS NULL THEN
    IF length(NEW.content_text) < 200 THEN
      NEW.chunk_type = 'detail';
      NEW.hierarchy_level = 3;
    ELSIF length(NEW.content_text) > 800 THEN
      NEW.chunk_type = 'section';
      NEW.hierarchy_level = 1;
    ELSE
      NEW.chunk_type = 'paragraph';
      NEW.hierarchy_level = 2;
    END IF;
  END IF;
  
  IF NEW.chunk_language = 'en' AND NEW.content_text ~ '[\u4e00-\u9fff]' THEN
    IF (length(regexp_replace(NEW.content_text, '[^\u4e00-\u9fff]', '', 'g')) * 1.0 / 
        length(regexp_replace(NEW.content_text, '\s', '', 'g'))) > 0.3 THEN
      NEW.chunk_language = 'zh';
    END IF;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_posts_on_hashtag_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  update community_post
  set updated_at = now()  -- 触发 post trigger 更新 search_vector
  where public_id in (
    select ph.post_id
    from post_hashtags ph
    where ph.hashtag_id = new.id
  );
  return new;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_post_on_hashtag_assoc_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  update community_post
  set updated_at = now()  -- 触发 post trigger 更新 search_vector
  where public_id = new.post_id;
  return new;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_embedding_statistics()
 RETURNS TABLE(total_embeddings bigint, dual_embeddings bigint, e5_only bigint, bge_only bigint, incomplete bigint, dual_coverage_percent numeric, avg_text_length numeric, avg_word_count numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_embeddings,
    COUNT(*) FILTER (WHERE has_e5_embedding AND has_bge_embedding) as dual_embeddings,
    COUNT(*) FILTER (WHERE has_e5_embedding AND NOT has_bge_embedding) as e5_only,
    COUNT(*) FILTER (WHERE NOT has_e5_embedding AND has_bge_embedding) as bge_only,
    COUNT(*) FILTER (WHERE NOT has_e5_embedding AND NOT has_bge_embedding) as incomplete,
    ROUND(
      (COUNT(*) FILTER (WHERE has_e5_embedding AND has_bge_embedding)::numeric / 
       NULLIF(COUNT(*), 0)::numeric) * 100, 2
    ) as dual_coverage_percent,
    ROUND(AVG(LENGTH(content_text)), 2) as avg_text_length,
    ROUND(AVG(word_count), 2) as avg_word_count
  FROM video_embeddings
  WHERE status = 'completed' AND is_deleted = false;
END;
$function$;


CREATE OR REPLACE FUNCTION public.find_incomplete_embeddings(limit_count integer DEFAULT 50)
 RETURNS TABLE(id bigint, attachment_id bigint, content_text text, has_e5_embedding boolean, has_bge_embedding boolean, missing_types text[], created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ve.id,
    ve.attachment_id,
    ve.content_text,
    ve.has_e5_embedding,
    ve.has_bge_embedding,
    CASE 
      WHEN NOT ve.has_e5_embedding AND NOT ve.has_bge_embedding THEN ARRAY['e5', 'bge']
      WHEN NOT ve.has_e5_embedding THEN ARRAY['e5']
      WHEN NOT ve.has_bge_embedding THEN ARRAY['bge']
      ELSE ARRAY[]::text[]
    END as missing_types,
    ve.created_at
  FROM video_embeddings ve
  WHERE 
    ve.status = 'completed'
    AND ve.is_deleted = false
    AND (NOT ve.has_e5_embedding OR NOT ve.has_bge_embedding)
  ORDER BY ve.created_at DESC
  LIMIT limit_count;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_checkin_streak()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  prev_date date;
  streak int := 1;
  ach record;
begin
  -- 找到上一次签到日期
  select max(checkin_date) into prev_date
  from community_checkin
  where user_id = new.user_id
    and checkin_date < new.checkin_date;

  if prev_date = new.checkin_date - interval '1 day' then
    -- 连续签到，取之前的 current_value + 1
    select current_value into streak
    from community_user_achievement cua
    join community_achievement ca on ca.id = cua.achievement_id
    where cua.user_id = new.user_id
      and ca.rule->>'type' = 'daily_checkin'
    order by cua.current_value desc
    limit 1;

    streak := coalesce(streak, 0) + 1;
  end if;

  -- 遍历所有 daily_checkin 类型的成就
  for ach in
    select id, (rule->>'min')::int as min_days
    from community_achievement
    where rule->>'type' = 'daily_checkin'
      and is_deleted = false
  loop
    insert into community_user_achievement (user_id, achievement_id, current_value, unlocked, unlocked_at)
    values (new.user_id, ach.id, streak, streak >= ach.min_days, case when streak >= ach.min_days then now() end)
    on conflict (user_id, achievement_id)
    do update set
      current_value = streak,
      unlocked = (streak >= ach.min_days),
      unlocked_at = case when streak >= ach.min_days then now() else community_user_achievement.unlocked_at end,
      updated_at = now();
  end loop;

  return new;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_classroom_color_palette()
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  RETURN ARRAY[
    '#FF6B6B', -- Coral Red
    '#4ECDC4', -- Turquoise
    '#45B7D1', -- Sky Blue
    '#96CEB4', -- Mint Green
    '#FFEAA7', -- Warm Yellow
    '#DDA0DD', -- Plum
    '#98D8C8', -- Seafoam
    '#F7DC6F', -- Golden Yellow
    '#BB8FCE', -- Lavender
    '#85C1E9', -- Light Blue
    '#F8C471', -- Peach
    '#82E0AA', -- Light Green
    '#F1948A', -- Salmon
    '#85C1E9', -- Powder Blue
    '#D7BDE2', -- Light Purple
    '#A9DFBF', -- Pale Green
    '#F9E79F', -- Light Yellow
    '#AED6F1', -- Baby Blue
    '#F5B7B1', -- Pink
    '#A3E4D7'  -- Aqua
  ];
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_next_classroom_color()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  color_palette TEXT[];
  used_colors TEXT[];
  available_colors TEXT[];
  selected_color TEXT;
  color_count INTEGER;
  used_count INTEGER;
BEGIN
  -- Get the predefined color palette
  color_palette := get_classroom_color_palette();
  
  -- Get currently used colors
  SELECT ARRAY_AGG(DISTINCT color) INTO used_colors
  FROM classroom 
  WHERE is_deleted = false OR is_deleted IS NULL;
  
  -- Handle case where no colors are used yet
  IF used_colors IS NULL THEN
    used_colors := ARRAY[]::TEXT[];
  END IF;
  
  -- Find available colors (not currently used)
  SELECT ARRAY_AGG(color) INTO available_colors
  FROM UNNEST(color_palette) AS color
  WHERE color != ALL(used_colors);
  
  -- If we have available colors, pick the first one (sequential assignment)
  IF available_colors IS NOT NULL AND array_length(available_colors, 1) > 0 THEN
    selected_color := available_colors[1];
  ELSE
    -- All colors are used, start reusing colors with least usage
    -- Find the color with minimum usage count
    SELECT color INTO selected_color
    FROM (
      SELECT 
        unnest_color AS color,
        COALESCE(usage_count, 0) AS usage_count
      FROM UNNEST(color_palette) AS unnest_color
      LEFT JOIN (
        SELECT color, COUNT(*) AS usage_count
        FROM classroom 
        WHERE is_deleted = false OR is_deleted IS NULL
        GROUP BY color
      ) usage ON unnest_color = usage.color
      ORDER BY COALESCE(usage_count, 0) ASC, unnest_color
      LIMIT 1
    ) min_usage;
  END IF;
  
  RETURN selected_color;
END;
$function$;


CREATE OR REPLACE FUNCTION public.generate_random_classroom_color()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  color_palette TEXT[];
  used_colors TEXT[];
  available_colors TEXT[];
  selected_color TEXT;
  random_index INTEGER;
BEGIN
  color_palette := get_classroom_color_palette();
  
  -- Get currently used colors
  SELECT ARRAY_AGG(DISTINCT color) INTO used_colors
  FROM classroom 
  WHERE is_deleted = false OR is_deleted IS NULL;
  
  IF used_colors IS NULL THEN
    used_colors := ARRAY[]::TEXT[];
  END IF;
  
  -- Find available colors
  SELECT ARRAY_AGG(color) INTO available_colors
  FROM UNNEST(color_palette) AS color
  WHERE color != ALL(used_colors);
  
  -- If available colors exist, pick randomly
  IF available_colors IS NOT NULL AND array_length(available_colors, 1) > 0 THEN
    random_index := floor(random() * array_length(available_colors, 1)) + 1;
    selected_color := available_colors[random_index];
  ELSE
    -- Fallback to random from full palette
    random_index := floor(random() * array_length(color_palette, 1)) + 1;
    selected_color := color_palette[random_index];
  END IF;
  
  RETURN selected_color;
END;
$function$;


CREATE OR REPLACE FUNCTION public.assign_classroom_color()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only assign color if not already provided
  IF NEW.color IS NULL OR NEW.color = '' THEN
    NEW.color := get_next_classroom_color();
  END IF;
  
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.is_valid_hex_color(color_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  RETURN color_code ~ '^#[0-9A-Fa-f]{6}$';
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_classroom_color_stats()
 RETURNS TABLE(color text, usage_count bigint, percentage numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.color,
    COUNT(*) as usage_count,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
  FROM classroom c
  WHERE c.is_deleted = false OR c.is_deleted IS NULL
  GROUP BY c.color
  ORDER BY usage_count DESC;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_community_group_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.slug, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.visibility, '')), 'D');
  
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_post_interaction_stats(post_ids bigint[])
 RETURNS TABLE(post_id bigint, comments_count bigint, reactions_count bigint, unique_reactors_count bigint, last_activity_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH post_stats AS (
    SELECT 
      p.id as post_id,
      COALESCE(comment_counts.count, 0) as comments_count,
      COALESCE(reaction_counts.count, 0) as reactions_count,
      COALESCE(reaction_counts.unique_users, 0) as unique_reactors_count,
      GREATEST(
        p.updated_at,
        COALESCE(comment_counts.last_comment_at, p.created_at),
        COALESCE(reaction_counts.last_reaction_at, p.created_at)
      ) as last_activity_at
    FROM community_post p
    LEFT JOIN (
      SELECT 
        post_id,
        COUNT(*) as count,
        MAX(created_at) as last_comment_at
      FROM community_comment
      WHERE is_deleted = false
        AND post_id = ANY(post_ids)
      GROUP BY post_id
    ) comment_counts ON comment_counts.post_id = p.id
    LEFT JOIN (
      SELECT 
        target_id as post_id,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(created_at) as last_reaction_at
      FROM community_reaction
      WHERE target_type = 'post'
        AND target_id = ANY(post_ids)
      GROUP BY target_id
    ) reaction_counts ON reaction_counts.post_id = p.id
    WHERE p.id = ANY(post_ids)
  )
  SELECT * FROM post_stats;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_user_hashtag_preferences(user_profile_id bigint, limit_count integer DEFAULT 20)
 RETURNS TABLE(hashtag_name text, usage_count bigint, last_used_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH user_hashtags AS (
    -- From user's own posts
    SELECT 
      h.name as hashtag_name,
      cp.created_at as used_at
    FROM community_post cp
    JOIN post_hashtags ph ON ph.post_id = cp.public_id
    JOIN hashtags h ON h.id = ph.hashtag_id
    WHERE cp.author_id = user_profile_id
      AND cp.is_deleted = false
    
    UNION ALL
    
    -- From posts user reacted to
    SELECT 
      h.name as hashtag_name,
      cr.created_at as used_at
    FROM community_reaction cr
    JOIN community_post cp ON cp.id = cr.target_id
    JOIN post_hashtags ph ON ph.post_id = cp.public_id
    JOIN hashtags h ON h.id = ph.hashtag_id
    WHERE cr.user_id = user_profile_id
      AND cr.target_type = 'post'
      AND cp.is_deleted = false
    
    UNION ALL
    
    -- From posts user commented on
    SELECT 
      h.name as hashtag_name,
      cc.created_at as used_at
    FROM community_comment cc
    JOIN community_post cp ON cp.id = cc.post_id
    JOIN post_hashtags ph ON ph.post_id = cp.public_id
    JOIN hashtags h ON h.id = ph.hashtag_id
    WHERE cc.author_id = user_profile_id
      AND cc.is_deleted = false
      AND cp.is_deleted = false
  )
  SELECT 
    uh.hashtag_name,
    COUNT(*) as usage_count,
    MAX(uh.used_at) as last_used_at
  FROM user_hashtags uh
  GROUP BY uh.hashtag_name
  ORDER BY usage_count DESC, last_used_at DESC
  LIMIT limit_count;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_ai_agent_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.purpose, '')), 'B') ||
    -- Extract config JSON as text for search
    setweight(to_tsvector('english', coalesce(NEW.config::text, '')), 'C');
  
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_course_notes_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.ai_summary, '')), 'B') ||
    -- Process tags array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.tags, ' '), ''
    )), 'C');
  
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_tutoring_tutors_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.headline, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.qualifications, '')), 'B') ||
    -- Process subjects array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.subjects, ' '), ''
    )), 'A');
  
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_course_reviews_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.comment, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.rating::text, '')), 'D');
  
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_frequent_authors(user_profile_id bigint, min_interactions integer DEFAULT 2)
 RETURNS TABLE(author_id bigint, interaction_count bigint, last_interaction_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH author_interactions AS (
    -- Reactions to posts
    SELECT 
      cp.author_id,
      cr.created_at as interaction_at
    FROM community_reaction cr
    JOIN community_post cp ON cp.id = cr.target_id
    WHERE cr.user_id = user_profile_id 
      AND cr.target_type = 'post'
      AND cp.is_deleted = false
    
    UNION ALL
    
    -- Comments on posts
    SELECT 
      cp.author_id,
      cc.created_at as interaction_at
    FROM community_comment cc
    JOIN community_post cp ON cp.id = cc.post_id
    WHERE cc.author_id = user_profile_id
      AND cc.is_deleted = false
      AND cp.is_deleted = false
  )
  SELECT 
    ai.author_id,
    COUNT(*) as interaction_count,
    MAX(ai.interaction_at) as last_interaction_at
  FROM author_interactions ai
  WHERE ai.author_id != user_profile_id -- Exclude self
  GROUP BY ai.author_id
  HAVING COUNT(*) >= min_interactions
  ORDER BY interaction_count DESC, last_interaction_at DESC
  LIMIT 20;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_group_posts_for_user(user_profile_id bigint, days_back integer DEFAULT 30, limit_count integer DEFAULT 50)
 RETURNS TABLE(post_id bigint, group_id bigint, group_name text, author_id bigint, created_at timestamp with time zone, interaction_score numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH user_groups AS (
    SELECT gm.group_id
    FROM community_group_member gm
    WHERE gm.user_id = user_profile_id
      AND gm.is_deleted = false
  ),
  group_posts AS (
    SELECT 
      p.id as post_id,
      p.group_id,
      g.name as group_name,
      p.author_id,
      p.created_at,
      COALESCE(comment_counts.count, 0) + COALESCE(reaction_counts.count, 0) as interaction_score
    FROM community_post p
    JOIN user_groups ug ON ug.group_id = p.group_id
    JOIN community_group g ON g.id = p.group_id
    LEFT JOIN (
      SELECT post_id, COUNT(*) as count
      FROM community_comment
      WHERE is_deleted = false
      GROUP BY post_id
    ) comment_counts ON comment_counts.post_id = p.id
    LEFT JOIN (
      SELECT target_id as post_id, COUNT(*) as count
      FROM community_reaction
      WHERE target_type = 'post'
      GROUP BY target_id
    ) reaction_counts ON reaction_counts.post_id = p.id
    WHERE p.is_deleted = false
      AND p.created_at >= NOW() - INTERVAL '%s days' % days_back
      AND p.author_id != user_profile_id -- Exclude own posts
  )
  SELECT * FROM group_posts
  ORDER BY interaction_score DESC, created_at DESC
  LIMIT limit_count;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_course_quiz_question_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.question_text, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.explanation, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.question_type, '')), 'C') ||
    -- Process options array if it exists
    setweight(to_tsvector('english', coalesce(
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(NEW.options)), 
        ' '
      ), ''
    )), 'B');
  
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_announcements_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.message, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.status, '')), 'D');
  
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_trending_posts(user_profile_id bigint, days_back integer DEFAULT 7, limit_count integer DEFAULT 20)
 RETURNS TABLE(post_id bigint, trending_score numeric, comments_count bigint, reactions_count bigint, age_hours numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH visible_posts AS (
    -- Posts from public groups or user's groups
    SELECT DISTINCT p.id
    FROM community_post p
    LEFT JOIN community_group g ON g.id = p.group_id
    LEFT JOIN community_group_member gm ON gm.group_id = g.id AND gm.user_id = user_profile_id
    WHERE p.is_deleted = false
      AND p.created_at >= NOW() - INTERVAL '%s days' % days_back
      AND (
        p.group_id IS NULL -- Posts without group
        OR g.visibility = 'public' -- Public groups
        OR (g.visibility = 'private' AND gm.user_id IS NOT NULL) -- User's private groups
      )
  ),
  post_metrics AS (
    SELECT 
      vp.id as post_id,
      COALESCE(comment_stats.count, 0) as comments_count,
      COALESCE(reaction_stats.count, 0) as reactions_count,
      EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0 as age_hours
    FROM visible_posts vp
    JOIN community_post p ON p.id = vp.id
    LEFT JOIN (
      SELECT 
        post_id,
        COUNT(*) as count
      FROM community_comment
      WHERE is_deleted = false
        AND created_at >= NOW() - INTERVAL '%s days' % days_back
      GROUP BY post_id
    ) comment_stats ON comment_stats.post_id = vp.id
    LEFT JOIN (
      SELECT 
        target_id as post_id,
        COUNT(*) as count
      FROM community_reaction
      WHERE target_type = 'post'
        AND created_at >= NOW() - INTERVAL '%s days' % days_back
      GROUP BY target_id
    ) reaction_stats ON reaction_stats.post_id = vp.id
  )
  SELECT 
    pm.post_id,
    -- Trending score: weighted by interactions and recency
    (
      (pm.comments_count * 2.0 + pm.reactions_count * 1.0) / 
      GREATEST(1, POWER(pm.age_hours / 24.0 + 1, 1.5))
    ) as trending_score,
    pm.comments_count,
    pm.reactions_count,
    pm.age_hours
  FROM post_metrics pm
  WHERE (pm.comments_count + pm.reactions_count) > 0 -- Must have some interaction
  ORDER BY trending_score DESC
  LIMIT limit_count;
END;
$function$;


CREATE OR REPLACE FUNCTION public.mark_messages_read(conv_id bigint, p_user_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Insert read status for all unread messages in conversation
    INSERT INTO message_read_status (message_id, user_id)
    SELECT dm.id, p_user_id
    FROM direct_messages dm
    LEFT JOIN message_read_status mrs ON dm.id = mrs.message_id AND mrs.user_id = p_user_id
    WHERE dm.conversation_id = conv_id 
      AND dm.sender_id != p_user_id -- Don't mark own messages as read
      AND mrs.id IS NULL -- Only unread messages
      AND dm.is_deleted = false
    ON CONFLICT (message_id, user_id) 
    DO UPDATE SET read_at = now();
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_chat_attachments_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.trigger_classroom_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- 检查相关字段是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.description IS DISTINCT FROM OLD.description
     )) THEN
    
    -- 队列embedding，中等优先级
    PERFORM queue_for_embedding('classroom', NEW.id, 4);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;


CREATE OR REPLACE FUNCTION public.trigger_assignment_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- 检查相关字段是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.title IS DISTINCT FROM OLD.title OR
       NEW.description IS DISTINCT FROM OLD.description
     )) THEN
    
    -- 队列embedding
    PERFORM queue_for_embedding('assignment', NEW.id, 4);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;


CREATE OR REPLACE FUNCTION public.trigger_quiz_question_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- 检查相关字段是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.question_text IS DISTINCT FROM OLD.question_text OR
       NEW.explanation IS DISTINCT FROM OLD.explanation OR
       NEW.options IS DISTINCT FROM OLD.options
     )) THEN
    
    -- 队列embedding，高优先级（学习相关）
    PERFORM queue_for_embedding('quiz_question', NEW.id, 3);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;


CREATE OR REPLACE FUNCTION public.trigger_course_note_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- 检查相关字段是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.content IS DISTINCT FROM OLD.content OR
       NEW.ai_summary IS DISTINCT FROM OLD.ai_summary OR
       NEW.tags IS DISTINCT FROM OLD.tags
     )) THEN
    
    -- 队列embedding，高优先级（用户生成内容）
    PERFORM queue_for_embedding('course_note', NEW.id, 3);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;


CREATE OR REPLACE FUNCTION public.trigger_course_review_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- 检查评论内容是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.comment IS DISTINCT FROM OLD.comment
     )) THEN
    
    -- 只有当评论不为空时才处理
    IF NEW.comment IS NOT NULL AND LENGTH(trim(NEW.comment)) > 0 THEN
      -- 队列embedding，中等优先级
      PERFORM queue_for_embedding('course_review', NEW.id, 5);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;


CREATE OR REPLACE FUNCTION public.trigger_community_group_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- 检查相关字段是否有变化
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.description IS DISTINCT FROM OLD.description
     )) THEN
    
    -- 队列embedding
    PERFORM queue_for_embedding('community_group', NEW.id, 5);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- P0: AI Workflow Templates Embedding
CREATE OR REPLACE FUNCTION public.trigger_ai_workflow_templates_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.description IS DISTINCT FROM OLD.description
     )) THEN
    
    -- 队列embedding，高优先级（AI功能推荐）
    PERFORM queue_for_embedding('ai_workflow_template', NEW.id, 2);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;


-- P0: Mistake Book Embedding
CREATE OR REPLACE FUNCTION public.trigger_mistake_book_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.notes IS DISTINCT FROM OLD.notes OR
       NEW.solution IS DISTINCT FROM OLD.solution OR
       NEW.question_text IS DISTINCT FROM OLD.question_text
     )) THEN
    
    -- 队列embedding，高优先级（个性化学习）
    PERFORM queue_for_embedding('mistake_book', NEW.id, 2);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;


-- P0: Course Discussion Embedding
CREATE OR REPLACE FUNCTION public.trigger_course_discussion_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.title IS DISTINCT FROM OLD.title OR
       NEW.content IS DISTINCT FROM OLD.content
     )) THEN
    
    -- 队列embedding，高优先级（学习社区核心）
    PERFORM queue_for_embedding('course_discussion', NEW.id, 2);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;


-- P1: Community Quiz Question Embedding
CREATE OR REPLACE FUNCTION public.trigger_community_quiz_question_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.question_text IS DISTINCT FROM OLD.question_text OR
       NEW.explanation IS DISTINCT FROM OLD.explanation OR
       NEW.options IS DISTINCT FROM OLD.options
     )) THEN
    
    -- 队列embedding，高优先级（题目推荐）
    PERFORM queue_for_embedding('community_quiz_question', NEW.id, 3);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;


-- P1: Announcements Embedding
CREATE OR REPLACE FUNCTION public.trigger_announcements_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.title IS DISTINCT FROM OLD.title OR
       NEW.message IS DISTINCT FROM OLD.message
     )) THEN
    
    -- 队列embedding，中等优先级（智能推送）
    PERFORM queue_for_embedding('announcement', NEW.id, 4);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;


-- P1: Tutoring Note Embedding
CREATE OR REPLACE FUNCTION public.trigger_tutoring_note_embedding()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.title IS DISTINCT FROM OLD.title OR
       NEW.content IS DISTINCT FROM OLD.content
     )) THEN
    
    -- 队列embedding，中等优先级（用户生成内容）
    PERFORM queue_for_embedding('tutoring_note', NEW.id, 4);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;


DROP TRIGGER IF EXISTS community_quiz_question_search_vector_trigger ON community_quiz_question;
CREATE TRIGGER community_quiz_question_search_vector_trigger BEFORE INSERT OR UPDATE ON community_quiz_question FOR EACH ROW EXECUTE FUNCTION update_community_quiz_question_search_vector();

DROP TRIGGER IF EXISTS ai_workflow_executions_updated_at_trigger ON ai_workflow_executions;
CREATE TRIGGER ai_workflow_executions_updated_at_trigger BEFORE UPDATE ON ai_workflow_executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS ai_agent_embedding_trigger ON ai_agent;
CREATE TRIGGER ai_agent_embedding_trigger AFTER INSERT OR UPDATE ON ai_agent FOR EACH ROW EXECUTE FUNCTION trigger_ai_agent_embedding();

DROP TRIGGER IF EXISTS ai_agent_search_vector_trigger ON ai_agent;
CREATE TRIGGER ai_agent_search_vector_trigger BEFORE INSERT OR UPDATE ON ai_agent FOR EACH ROW EXECUTE FUNCTION update_ai_agent_search_vector();

DROP TRIGGER IF EXISTS quiz_mistake_trigger ON course_quiz_submission;
CREATE TRIGGER quiz_mistake_trigger AFTER INSERT ON course_quiz_submission FOR EACH ROW EXECUTE FUNCTION handle_quiz_mistake();

DROP TRIGGER IF EXISTS update_chat_attachments_updated_at ON chat_attachments;
CREATE TRIGGER update_chat_attachments_updated_at BEFORE UPDATE ON chat_attachments FOR EACH ROW EXECUTE FUNCTION update_chat_attachments_updated_at();

DROP TRIGGER IF EXISTS lesson_embedding_trigger ON course_lesson;
CREATE TRIGGER lesson_embedding_trigger AFTER INSERT OR UPDATE ON course_lesson FOR EACH ROW EXECUTE FUNCTION trigger_lesson_embedding();

DROP TRIGGER IF EXISTS lesson_slug_trigger ON course_lesson;
CREATE TRIGGER lesson_slug_trigger BEFORE INSERT OR UPDATE ON course_lesson FOR EACH ROW EXECUTE FUNCTION generate_lesson_slug();

DROP TRIGGER IF EXISTS course_review_embedding_trigger ON course_reviews;
CREATE TRIGGER course_review_embedding_trigger AFTER INSERT OR UPDATE ON course_reviews FOR EACH ROW EXECUTE FUNCTION trigger_course_review_embedding();

DROP TRIGGER IF EXISTS course_reviews_search_vector_trigger ON course_reviews;
CREATE TRIGGER course_reviews_search_vector_trigger BEFORE INSERT OR UPDATE ON course_reviews FOR EACH ROW EXECUTE FUNCTION update_course_reviews_search_vector();

DROP TRIGGER IF EXISTS ai_workflow_templates_search_vector_trigger ON ai_workflow_templates;
CREATE TRIGGER ai_workflow_templates_search_vector_trigger BEFORE INSERT OR UPDATE ON ai_workflow_templates FOR EACH ROW EXECUTE FUNCTION update_ai_workflow_templates_search_vector();

DROP TRIGGER IF EXISTS ai_workflow_templates_updated_at_trigger ON ai_workflow_templates;
CREATE TRIGGER ai_workflow_templates_updated_at_trigger BEFORE UPDATE ON ai_workflow_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS ai_usage_stats_updated_at_trigger ON ai_usage_stats;
CREATE TRIGGER ai_usage_stats_updated_at_trigger BEFORE UPDATE ON ai_usage_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS community_quiz_search_vector_trigger ON community_quiz;
CREATE TRIGGER community_quiz_search_vector_trigger BEFORE INSERT OR UPDATE ON community_quiz FOR EACH ROW EXECUTE FUNCTION update_community_quiz_search_vector();

DROP TRIGGER IF EXISTS trigger_update_quiz_search_vectors ON community_quiz;
CREATE TRIGGER trigger_update_quiz_search_vectors BEFORE INSERT OR UPDATE ON community_quiz FOR EACH ROW EXECUTE FUNCTION update_quiz_search_vectors();

DROP TRIGGER IF EXISTS course_progress_continue_watching_trigger ON course_progress;
CREATE TRIGGER course_progress_continue_watching_trigger BEFORE INSERT OR UPDATE ON course_progress FOR EACH ROW EXECUTE FUNCTION update_continue_watching_status();

DROP TRIGGER IF EXISTS set_timestamp ON classroom_attachments;
CREATE TRIGGER set_timestamp BEFORE UPDATE ON classroom_attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS comment_embedding_trigger ON community_comment;
CREATE TRIGGER comment_embedding_trigger AFTER INSERT OR UPDATE ON community_comment FOR EACH ROW EXECUTE FUNCTION trigger_comment_embedding();

DROP TRIGGER IF EXISTS trg_after_comment_insert ON community_comment;
CREATE TRIGGER trg_after_comment_insert AFTER INSERT ON community_comment FOR EACH ROW EXECUTE FUNCTION trg_after_comment_insert_update_progress();

DROP TRIGGER IF EXISTS trg_after_reaction_insert ON community_reaction;
CREATE TRIGGER trg_after_reaction_insert AFTER INSERT ON community_reaction FOR EACH ROW EXECUTE FUNCTION trg_after_reaction_insert_update_progress();

DROP TRIGGER IF EXISTS trigger_community_quiz_subject_updated_at ON community_quiz_subject;
CREATE TRIGGER trigger_community_quiz_subject_updated_at BEFORE UPDATE ON community_quiz_subject FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_quiz_search_on_subject_change ON community_quiz_subject;
CREATE TRIGGER trigger_update_quiz_search_on_subject_change AFTER UPDATE ON community_quiz_subject FOR EACH ROW WHEN (old.translations IS DISTINCT FROM new.translations) EXECUTE FUNCTION update_quiz_search_vectors_on_subject_change();

DROP TRIGGER IF EXISTS tutoring_tutors_search_vector_trigger ON tutoring_tutors;
CREATE TRIGGER tutoring_tutors_search_vector_trigger BEFORE INSERT OR UPDATE ON tutoring_tutors FOR EACH ROW EXECUTE FUNCTION update_tutoring_tutors_search_vector();

DROP TRIGGER IF EXISTS profile_embedding_trigger ON profiles;
CREATE TRIGGER profile_embedding_trigger AFTER INSERT OR UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION trigger_profile_embedding();

DROP TRIGGER IF EXISTS trigger_update_profile_completion ON profiles;
CREATE TRIGGER trigger_update_profile_completion BEFORE INSERT OR UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_profile_completion();

DROP TRIGGER IF EXISTS tutoring_note_search_vector_trigger ON tutoring_note;
CREATE TRIGGER tutoring_note_search_vector_trigger BEFORE INSERT OR UPDATE ON tutoring_note FOR EACH ROW EXECUTE FUNCTION update_tutoring_note_search_vector();

DROP TRIGGER IF EXISTS trigger_community_quiz_grade_updated_at ON community_quiz_grade;
CREATE TRIGGER trigger_community_quiz_grade_updated_at BEFORE UPDATE ON community_quiz_grade FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_quiz_search_on_grade_change ON community_quiz_grade;
CREATE TRIGGER trigger_update_quiz_search_on_grade_change AFTER UPDATE ON community_quiz_grade FOR EACH ROW WHEN (old.translations IS DISTINCT FROM new.translations) EXECUTE FUNCTION update_quiz_search_vectors_on_grade_change();

DROP TRIGGER IF EXISTS course_chapter_search_vector_trigger ON course_chapter;
CREATE TRIGGER course_chapter_search_vector_trigger BEFORE INSERT OR UPDATE ON course_chapter FOR EACH ROW EXECUTE FUNCTION update_course_chapter_search_vector();

DROP TRIGGER IF EXISTS trg_checkin_streak ON community_checkin;
CREATE TRIGGER trg_checkin_streak AFTER INSERT ON community_checkin FOR EACH ROW EXECUTE FUNCTION update_checkin_streak();

DROP TRIGGER IF EXISTS classroom_live_session_search_vector_trigger ON classroom_live_session;
CREATE TRIGGER classroom_live_session_search_vector_trigger BEFORE INSERT OR UPDATE ON classroom_live_session FOR EACH ROW EXECUTE FUNCTION update_classroom_live_session_search_vector();

DROP TRIGGER IF EXISTS live_session_embedding_trigger ON classroom_live_session;
CREATE TRIGGER live_session_embedding_trigger AFTER INSERT OR UPDATE ON classroom_live_session FOR EACH ROW EXECUTE FUNCTION trigger_live_session_embedding();

DROP TRIGGER IF EXISTS classroom_embedding_trigger ON classroom;
CREATE TRIGGER classroom_embedding_trigger AFTER INSERT OR UPDATE ON classroom FOR EACH ROW EXECUTE FUNCTION trigger_classroom_embedding();

DROP TRIGGER IF EXISTS trigger_update_embedding_stats ON embeddings;
CREATE TRIGGER trigger_update_embedding_stats BEFORE INSERT OR UPDATE ON embeddings FOR EACH ROW EXECUTE FUNCTION update_embedding_stats();

DROP TRIGGER IF EXISTS assignment_embedding_trigger ON classroom_assignment;
CREATE TRIGGER assignment_embedding_trigger AFTER INSERT OR UPDATE ON classroom_assignment FOR EACH ROW EXECUTE FUNCTION trigger_assignment_embedding();

DROP TRIGGER IF EXISTS classroom_assignment_search_vector_trigger ON classroom_assignment;
CREATE TRIGGER classroom_assignment_search_vector_trigger BEFORE INSERT OR UPDATE ON classroom_assignment FOR EACH ROW EXECUTE FUNCTION update_classroom_assignment_search_vector();

DROP TRIGGER IF EXISTS course_point_price_updated_at_trigger ON course_point_price;
CREATE TRIGGER course_point_price_updated_at_trigger BEFORE UPDATE ON course_point_price FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS point_redemption_updated_at_trigger ON point_redemption;
CREATE TRIGGER point_redemption_updated_at_trigger BEFORE UPDATE ON point_redemption FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS classroom_posts_search_vector_trigger ON classroom_posts;
CREATE TRIGGER classroom_posts_search_vector_trigger BEFORE INSERT OR UPDATE ON classroom_posts FOR EACH ROW EXECUTE FUNCTION update_classroom_posts_search_vector();

DROP TRIGGER IF EXISTS mistake_book_search_vector_trigger ON mistake_book;
CREATE TRIGGER mistake_book_search_vector_trigger BEFORE INSERT OR UPDATE ON mistake_book FOR EACH ROW EXECUTE FUNCTION update_mistake_book_search_vector();

DROP TRIGGER IF EXISTS trg_update_hashtag_tsvector ON hashtags;
CREATE TRIGGER trg_update_hashtag_tsvector BEFORE INSERT OR UPDATE ON hashtags FOR EACH ROW EXECUTE FUNCTION hashtags_tsvector_update();

DROP TRIGGER IF EXISTS trg_update_posts_on_hashtag_change ON hashtags;
CREATE TRIGGER trg_update_posts_on_hashtag_change AFTER UPDATE ON hashtags FOR EACH ROW EXECUTE FUNCTION update_posts_on_hashtag_change();

DROP TRIGGER IF EXISTS trg_update_post_on_hashtag_assoc_delete ON post_hashtags;
CREATE TRIGGER trg_update_post_on_hashtag_assoc_delete AFTER DELETE ON post_hashtags FOR EACH ROW EXECUTE FUNCTION update_post_on_hashtag_assoc_change();

DROP TRIGGER IF EXISTS trg_update_post_on_hashtag_assoc_insert ON post_hashtags;
CREATE TRIGGER trg_update_post_on_hashtag_assoc_insert AFTER INSERT ON post_hashtags FOR EACH ROW EXECUTE FUNCTION update_post_on_hashtag_assoc_change();

DROP TRIGGER IF EXISTS study_session_updated_at_trigger ON study_session;
CREATE TRIGGER study_session_updated_at_trigger BEFORE UPDATE ON study_session FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS learning_goal_search_vector_trigger ON learning_goal;
CREATE TRIGGER learning_goal_search_vector_trigger BEFORE INSERT OR UPDATE ON learning_goal FOR EACH ROW EXECUTE FUNCTION update_learning_goal_search_vector();

DROP TRIGGER IF EXISTS learning_goal_updated_at_trigger ON learning_goal;
CREATE TRIGGER learning_goal_updated_at_trigger BEFORE UPDATE ON learning_goal FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS learning_statistics_updated_at_trigger ON learning_statistics;
CREATE TRIGGER learning_statistics_updated_at_trigger BEFORE UPDATE ON learning_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS video_processing_queue_updated_at ON video_processing_queue;
CREATE TRIGGER video_processing_queue_updated_at BEFORE UPDATE ON video_processing_queue FOR EACH ROW EXECUTE FUNCTION update_video_processing_updated_at();

DROP TRIGGER IF EXISTS video_processing_steps_updated_at ON video_processing_steps;
CREATE TRIGGER video_processing_steps_updated_at BEFORE UPDATE ON video_processing_steps FOR EACH ROW EXECUTE FUNCTION update_video_processing_updated_at();

DROP TRIGGER IF EXISTS course_quiz_question_search_vector_trigger ON course_quiz_question;
CREATE TRIGGER course_quiz_question_search_vector_trigger BEFORE INSERT OR UPDATE ON course_quiz_question FOR EACH ROW EXECUTE FUNCTION update_course_quiz_question_search_vector();

DROP TRIGGER IF EXISTS quiz_question_embedding_trigger ON course_quiz_question;
CREATE TRIGGER quiz_question_embedding_trigger AFTER INSERT OR UPDATE ON course_quiz_question FOR EACH ROW EXECUTE FUNCTION trigger_quiz_question_embedding();

DROP TRIGGER IF EXISTS update_direct_conversations_updated_at ON direct_conversations;
CREATE TRIGGER update_direct_conversations_updated_at BEFORE UPDATE ON direct_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_tutor_earnings_summary ON tutor_earnings;
CREATE TRIGGER trigger_update_tutor_earnings_summary AFTER INSERT OR UPDATE ON tutor_earnings FOR EACH ROW EXECUTE FUNCTION update_tutor_earnings_summary();

DROP TRIGGER IF EXISTS course_note_embedding_trigger ON course_notes;
CREATE TRIGGER course_note_embedding_trigger AFTER INSERT OR UPDATE ON course_notes FOR EACH ROW EXECUTE FUNCTION trigger_course_note_embedding();

DROP TRIGGER IF EXISTS course_notes_search_vector_trigger ON course_notes;
CREATE TRIGGER course_notes_search_vector_trigger BEFORE INSERT OR UPDATE ON course_notes FOR EACH ROW EXECUTE FUNCTION update_course_notes_search_vector();

DROP TRIGGER IF EXISTS post_embedding_trigger ON community_post;
CREATE TRIGGER post_embedding_trigger AFTER INSERT OR UPDATE ON community_post FOR EACH ROW EXECUTE FUNCTION trigger_post_embedding();

DROP TRIGGER IF EXISTS trg_after_post_insert ON community_post;
CREATE TRIGGER trg_after_post_insert AFTER INSERT ON community_post FOR EACH ROW EXECUTE FUNCTION trg_after_post_insert_update_progress();

DROP TRIGGER IF EXISTS trg_update_post_tsvector ON community_post;
CREATE TRIGGER trg_update_post_tsvector BEFORE INSERT OR UPDATE ON community_post FOR EACH ROW EXECUTE FUNCTION community_post_tsvector_update();

DROP TRIGGER IF EXISTS update_conversation_settings_updated_at ON conversation_settings;
CREATE TRIGGER update_conversation_settings_updated_at BEFORE UPDATE ON conversation_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS community_group_embedding_trigger ON community_group;
CREATE TRIGGER community_group_embedding_trigger AFTER INSERT OR UPDATE ON community_group FOR EACH ROW EXECUTE FUNCTION trigger_community_group_embedding();

DROP TRIGGER IF EXISTS community_group_search_vector_trigger ON community_group;
CREATE TRIGGER community_group_search_vector_trigger BEFORE INSERT OR UPDATE ON community_group FOR EACH ROW EXECUTE FUNCTION update_community_group_search_vector();

DROP TRIGGER IF EXISTS update_conversation_on_message_insert ON direct_messages;
CREATE TRIGGER update_conversation_on_message_insert AFTER INSERT ON direct_messages FOR EACH ROW EXECUTE FUNCTION update_conversation_on_new_message();

DROP TRIGGER IF EXISTS update_direct_messages_updated_at ON direct_messages;
CREATE TRIGGER update_direct_messages_updated_at BEFORE UPDATE ON direct_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_video_comment_likes_count ON video_comment_likes;
CREATE TRIGGER trigger_video_comment_likes_count AFTER INSERT OR DELETE OR UPDATE ON video_comment_likes FOR EACH ROW EXECUTE FUNCTION update_video_comment_likes_count();

DROP TRIGGER IF EXISTS trigger_video_comment_counts ON video_comments;
CREATE TRIGGER trigger_video_comment_counts AFTER INSERT OR DELETE ON video_comments FOR EACH ROW EXECUTE FUNCTION update_video_comment_counts();

DROP TRIGGER IF EXISTS trigger_update_plan_stats ON daily_plan_tasks;
CREATE TRIGGER trigger_update_plan_stats AFTER INSERT OR DELETE OR UPDATE OF is_completed, actual_minutes, points_reward ON daily_plan_tasks FOR EACH ROW EXECUTE FUNCTION update_daily_plan_stats();

DROP TRIGGER IF EXISTS video_qa_history_updated_at ON video_qa_history;
CREATE TRIGGER video_qa_history_updated_at BEFORE UPDATE ON video_qa_history FOR EACH ROW EXECUTE FUNCTION trigger_video_qa_updated_at();

DROP TRIGGER IF EXISTS video_segments_updated_at ON video_segments;
CREATE TRIGGER video_segments_updated_at BEFORE UPDATE ON video_segments FOR EACH ROW EXECUTE FUNCTION trigger_video_qa_updated_at();

DROP TRIGGER IF EXISTS announcements_search_vector_trigger ON announcements;
CREATE TRIGGER announcements_search_vector_trigger BEFORE INSERT OR UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_announcements_search_vector();

DROP TRIGGER IF EXISTS course_embedding_trigger ON course;
CREATE TRIGGER course_embedding_trigger AFTER INSERT OR UPDATE ON course FOR EACH ROW EXECUTE FUNCTION trigger_course_embedding();

DROP TRIGGER IF EXISTS course_slug_trigger ON course;
CREATE TRIGGER course_slug_trigger BEFORE INSERT OR UPDATE ON course FOR EACH ROW EXECUTE FUNCTION generate_course_slug();

-- AI Workflow Templates
DROP TRIGGER IF EXISTS ai_workflow_templates_embedding_trigger ON ai_workflow_templates;
CREATE TRIGGER ai_workflow_templates_embedding_trigger AFTER INSERT OR UPDATE ON ai_workflow_templates FOR EACH ROW EXECUTE FUNCTION trigger_ai_workflow_templates_embedding();

-- Mistake Book
DROP TRIGGER IF EXISTS mistake_book_embedding_trigger ON mistake_book;
CREATE TRIGGER mistake_book_embedding_trigger AFTER INSERT OR UPDATE ON mistake_book FOR EACH ROW EXECUTE FUNCTION trigger_mistake_book_embedding();

-- Course Discussion
DROP TRIGGER IF EXISTS course_discussion_embedding_trigger ON course_discussion;
CREATE TRIGGER course_discussion_embedding_trigger AFTER INSERT OR UPDATE ON course_discussion FOR EACH ROW EXECUTE FUNCTION trigger_course_discussion_embedding();

-- Community Quiz Question
DROP TRIGGER IF EXISTS community_quiz_question_embedding_trigger ON community_quiz_question;
CREATE TRIGGER community_quiz_question_embedding_trigger AFTER INSERT OR UPDATE ON community_quiz_question FOR EACH ROW EXECUTE FUNCTION trigger_community_quiz_question_embedding();

-- Announcements
DROP TRIGGER IF EXISTS announcements_embedding_trigger ON announcements;
CREATE TRIGGER announcements_embedding_trigger AFTER INSERT OR UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION trigger_announcements_embedding();

-- Tutoring Note
DROP TRIGGER IF EXISTS tutoring_note_embedding_trigger ON tutoring_note;
CREATE TRIGGER tutoring_note_embedding_trigger AFTER INSERT OR UPDATE ON tutoring_note FOR EACH ROW EXECUTE FUNCTION trigger_tutoring_note_embedding();
