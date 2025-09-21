-- =========================
-- CONSOLIDATED DATABASE FUNCTIONS
-- =========================

-- =========================
-- UTILITY FUNCTIONS
-- =========================

-- Function to generate slugs from text
CREATE OR REPLACE FUNCTION generate_slug(input_text text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        trim(input_text),
        '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special characters
      ),
      '\s+', '-', 'g'  -- Replace spaces with hyphens
    )
  );
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- PROFILE FUNCTIONS
-- =========================

-- Function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_row profiles)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  completion_score int := 0;
  total_fields int := 10; -- Total number of fields we consider
BEGIN
  -- Basic profile fields (5 points each)
  IF profile_row.display_name IS NOT NULL AND LENGTH(profile_row.display_name) > 0 THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_row.full_name IS NOT NULL AND LENGTH(profile_row.full_name) > 0 THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_row.email IS NOT NULL AND LENGTH(profile_row.email) > 0 THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_row.bio IS NOT NULL AND LENGTH(profile_row.bio) > 0 THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_row.avatar_url IS NOT NULL AND LENGTH(profile_row.avatar_url) > 0 THEN
    completion_score := completion_score + 10;
  END IF;
  
  -- Advanced fields (10 points each)
  IF profile_row.preferences IS NOT NULL AND jsonb_typeof(profile_row.preferences) = 'object' 
     AND profile_row.preferences != '{}'::jsonb THEN
    completion_score := completion_score + 10;
  END IF;
  
  -- Onboarding completion
  IF profile_row.onboarded = true THEN
    completion_score := completion_score + 20;
  END IF;
  
  -- Email verification
  IF profile_row.email_verified = true THEN
    completion_score := completion_score + 10;
  END IF;
  
  -- Two factor enabled
  IF profile_row.two_factor_enabled = true THEN
    completion_score := completion_score + 10;
  END IF;
  
  RETURN completion_score;
END;
$$;

-- Function to update profile completion
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_completion int;
BEGIN
  new_completion := calculate_profile_completion(NEW);
  NEW.profile_completion := new_completion;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- =========================
-- EMBEDDING FUNCTIONS (From function.sql and migrations)
-- =========================

-- Function to queue content for embedding using QStash
CREATE OR REPLACE FUNCTION queue_for_embedding_qstash(
  p_content_type text,
  p_content_id bigint,
  p_priority int DEFAULT 5
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  webhook_url text;
  payload jsonb;
BEGIN
  -- Validate content type for embedding
  IF p_content_type NOT IN ('profile', 'course', 'post', 'lesson', 'comment', 'auth_user') THEN
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
  
  -- Fallback to database queue
  RETURN queue_for_embedding(p_content_type, p_content_id, p_priority);
  
EXCEPTION WHEN OTHERS THEN
  -- If QStash fails, fallback to database queue
  RAISE NOTICE 'QStash embedding failed, using database queue: %', SQLERRM;
  RETURN queue_for_embedding(p_content_type, p_content_id, p_priority);
END;
$$;

-- Function to queue content for embedding (fallback)
CREATE OR REPLACE FUNCTION queue_for_embedding(
  p_content_type text,
  p_content_id bigint,
  p_priority int DEFAULT 5
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  content_text text;
  content_hash text;
BEGIN
  -- Extract content text
  content_text := extract_content_text(p_content_type, p_content_id);
  
  IF content_text IS NULL OR LENGTH(trim(content_text)) = 0 THEN
    RAISE NOTICE 'No content found for % %', p_content_type, p_content_id;
    RETURN false;
  END IF;
  
  -- Generate content hash
  content_hash := encode(digest(content_text, 'sha256'), 'hex');
  
  -- Insert or update embedding queue
  INSERT INTO embedding_queue (content_type, content_id, content_text, content_hash, priority)
  VALUES (p_content_type, p_content_id, content_text, content_hash, p_priority)
  ON CONFLICT (content_type, content_id) 
  DO UPDATE SET
    content_text = EXCLUDED.content_text,
    content_hash = EXCLUDED.content_hash,
    priority = EXCLUDED.priority,
    status = 'queued',
    retry_count = 0,
    updated_at = now();
    
  RETURN true;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Failed to queue embedding for % %: %', p_content_type, p_content_id, SQLERRM;
  RETURN false;
END;
$$;

-- Function to extract content text for embedding
CREATE OR REPLACE FUNCTION extract_content_text(
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
-- =========================
-- CONSOLIDATED DATABASE FUNCTIONS (Part 2)
-- =========================

-- =========================
-- DUAL EMBEDDING SEARCH FUNCTIONS
-- =========================

-- Function for E5-Small embedding search (384 dimensions)
CREATE OR REPLACE FUNCTION search_embeddings_e5(
  query_embedding vector(384),
  content_types text[] DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  user_id bigint DEFAULT NULL
)
RETURNS TABLE (
  content_type text,
  content_id bigint,
  content_text text,
  similarity float,
  chunk_type text,
  hierarchy_level int,
  word_count int,
  sentence_count int,
  created_at timestamptz,
  embedding_model text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.content_type,
    e.content_id,
    e.content_text,
    1 - (e.embedding_e5_small <=> query_embedding) as similarity,
    e.chunk_type,
    e.hierarchy_level,
    e.word_count,
    e.sentence_count,
    e.created_at,
    e.embedding_e5_model as embedding_model
  FROM embeddings e
  WHERE 
    e.has_e5_embedding = true
    AND e.status = 'completed'
    AND e.is_deleted = false
    AND (content_types IS NULL OR e.content_type = ANY(content_types))
    AND 1 - (e.embedding_e5_small <=> query_embedding) > match_threshold
  ORDER BY e.embedding_e5_small <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function for BGE-M3 embedding search (1024 dimensions)
CREATE OR REPLACE FUNCTION search_embeddings_bge(
  query_embedding vector(1024),
  content_types text[] DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  user_id bigint DEFAULT NULL
)
RETURNS TABLE (
  content_type text,
  content_id bigint,
  content_text text,
  similarity float,
  chunk_type text,
  hierarchy_level int,
  word_count int,
  sentence_count int,
  created_at timestamptz,
  embedding_model text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.content_type,
    e.content_id,
    e.content_text,
    1 - (e.embedding_bge_m3 <=> query_embedding) as similarity,
    e.chunk_type,
    e.hierarchy_level,
    e.word_count,
    e.sentence_count,
    e.created_at,
    e.embedding_bge_model as embedding_model
  FROM embeddings e
  WHERE 
    e.has_bge_embedding = true
    AND e.status = 'completed'
    AND e.is_deleted = false
    AND (content_types IS NULL OR e.content_type = ANY(content_types))
    AND 1 - (e.embedding_bge_m3 <=> query_embedding) > match_threshold
  ORDER BY e.embedding_bge_m3 <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Advanced hybrid search function that combines both embeddings
CREATE OR REPLACE FUNCTION search_embeddings_hybrid(
  query_embedding_e5 vector(384) DEFAULT NULL,
  query_embedding_bge vector(1024) DEFAULT NULL,
  content_types text[] DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  weight_e5 float DEFAULT 0.4,
  weight_bge float DEFAULT 0.6,
  user_id bigint DEFAULT NULL
)
RETURNS TABLE (
  content_type text,
  content_id bigint,
  content_text text,
  similarity float,
  chunk_type text,
  hierarchy_level int,
  word_count int,
  sentence_count int,
  created_at timestamptz,
  embedding_types text,
  individual_scores jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
  search_id bigint;
BEGIN
  -- Log search if user_id provided
  IF user_id IS NOT NULL THEN
    INSERT INTO embedding_searches (
      user_id, query_text, query_embedding, query_embedding_bge, 
      content_types, similarity_threshold, max_results, search_type, embedding_weights
    ) VALUES (
      user_id, '', query_embedding_e5, query_embedding_bge,
      content_types, match_threshold, match_count, 'hybrid',
      jsonb_build_object('e5', weight_e5, 'bge', weight_bge)
    ) RETURNING id INTO search_id;
  END IF;

  RETURN QUERY
  WITH scored_results AS (
    SELECT
      e.content_type,
      e.content_id,
      e.content_text,
      e.chunk_type,
      e.hierarchy_level,
      e.word_count,
      e.sentence_count,
      e.created_at,
      -- Calculate individual similarities
      CASE WHEN e.has_e5_embedding AND query_embedding_e5 IS NOT NULL 
           THEN 1 - (e.embedding_e5_small <=> query_embedding_e5) 
           ELSE NULL END as e5_similarity,
      CASE WHEN e.has_bge_embedding AND query_embedding_bge IS NOT NULL 
           THEN 1 - (e.embedding_bge_m3 <=> query_embedding_bge) 
           ELSE NULL END as bge_similarity,
      -- Calculate combined similarity
      CASE 
        WHEN query_embedding_e5 IS NOT NULL AND query_embedding_bge IS NOT NULL 
             AND e.has_e5_embedding AND e.has_bge_embedding THEN
          -- Both embeddings available - weighted average
          (weight_e5 * (1 - (e.embedding_e5_small <=> query_embedding_e5))) +
          (weight_bge * (1 - (e.embedding_bge_m3 <=> query_embedding_bge)))
        WHEN query_embedding_e5 IS NOT NULL AND e.has_e5_embedding THEN
          -- Only E5 available
          1 - (e.embedding_e5_small <=> query_embedding_e5)
        WHEN query_embedding_bge IS NOT NULL AND e.has_bge_embedding THEN
          -- Only BGE available
          1 - (e.embedding_bge_m3 <=> query_embedding_bge)
        ELSE 0
      END as combined_similarity,
      -- Determine embedding types available
      CASE 
        WHEN e.has_e5_embedding AND e.has_bge_embedding THEN 'dual'
        WHEN e.has_e5_embedding THEN 'e5_only'
        WHEN e.has_bge_embedding THEN 'bge_only'
        ELSE 'none'
      END as embedding_types
    FROM embeddings e
    WHERE 
      e.status = 'completed'
      AND e.is_deleted = false
      AND (content_types IS NULL OR e.content_type = ANY(content_types))
      AND (
        (query_embedding_e5 IS NOT NULL AND e.has_e5_embedding AND 
         1 - (e.embedding_e5_small <=> query_embedding_e5) > match_threshold)
        OR
        (query_embedding_bge IS NOT NULL AND e.has_bge_embedding AND 
         1 - (e.embedding_bge_m3 <=> query_embedding_bge) > match_threshold)
      )
  )
  SELECT 
    sr.content_type,
    sr.content_id,
    sr.content_text,
    sr.combined_similarity as similarity,
    sr.chunk_type,
    sr.hierarchy_level,
    sr.word_count,
    sr.sentence_count,
    sr.created_at,
    sr.embedding_types,
    jsonb_build_object(
      'e5_similarity', sr.e5_similarity,
      'bge_similarity', sr.bge_similarity,
      'combined_similarity', sr.combined_similarity,
      'weights', jsonb_build_object('e5', weight_e5, 'bge', weight_bge)
    ) as individual_scores
  FROM scored_results sr
  ORDER BY sr.combined_similarity DESC
  LIMIT match_count;
END;
$$;

-- =========================
-- VIDEO EMBEDDING SEARCH FUNCTIONS
-- =========================

-- Function for E5-Small video embedding search
CREATE OR REPLACE FUNCTION search_video_embeddings_e5(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  attachment_id bigint,
  content_text text,
  similarity float,
  chunk_type text,
  word_count int,
  sentence_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
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
$$;

-- Function for BGE-M3 video embedding search
CREATE OR REPLACE FUNCTION search_video_embeddings_bge(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  attachment_id bigint,
  content_text text,
  similarity float,
  chunk_type text,
  word_count int,
  sentence_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
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
$$;

-- Function to search video segments with time-based filtering
CREATE OR REPLACE FUNCTION search_video_segments_with_time(
  query_embedding_e5 vector(384) DEFAULT NULL,
  query_embedding_bge vector(1024) DEFAULT NULL,
  attachment_ids bigint[] DEFAULT NULL,
  start_time_min float DEFAULT NULL,
  start_time_max float DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  include_context boolean DEFAULT false
) RETURNS TABLE (
  segment_id bigint,
  attachment_id bigint,
  segment_index int,
  start_time float,
  end_time float,
  duration float,
  content_text text,
  topic_keywords text[],
  similarity_e5 float,
  similarity_bge float,
  combined_similarity float,
  context_before text,
  context_after text
) LANGUAGE plpgsql AS $$
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
$$;

-- =========================
-- STATISTICS AND UTILITY FUNCTIONS
-- =========================

-- Function to get comprehensive embedding statistics
CREATE OR REPLACE FUNCTION get_dual_embedding_statistics()
RETURNS TABLE (
  total_embeddings bigint,
  dual_embeddings bigint,
  e5_only bigint,
  bge_only bigint,
  incomplete bigint,
  dual_coverage_percent numeric,
  avg_text_length numeric,
  avg_word_count numeric,
  content_type_breakdown jsonb,
  model_info jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total_embeddings,
      COUNT(*) FILTER (WHERE has_e5_embedding AND has_bge_embedding) as dual_embeddings,
      COUNT(*) FILTER (WHERE has_e5_embedding AND NOT has_bge_embedding) as e5_only,
      COUNT(*) FILTER (WHERE NOT has_e5_embedding AND has_bge_embedding) as bge_only,
      COUNT(*) FILTER (WHERE NOT has_e5_embedding AND NOT has_bge_embedding) as incomplete,
      ROUND(AVG(LENGTH(content_text)), 2) as avg_text_length,
      ROUND(AVG(word_count), 2) as avg_word_count
    FROM embeddings e
    WHERE e.status = 'completed' AND e.is_deleted = false
  ),
  content_breakdown AS (
    SELECT 
      jsonb_object_agg(
        content_type,
        jsonb_build_object(
          'total', type_count,
          'dual', dual_count,
          'e5_only', e5_only_count,
          'bge_only', bge_only_count
        )
      ) as breakdown
    FROM (
      SELECT 
        content_type,
        COUNT(*) as type_count,
        COUNT(*) FILTER (WHERE has_e5_embedding AND has_bge_embedding) as dual_count,
        COUNT(*) FILTER (WHERE has_e5_embedding AND NOT has_bge_embedding) as e5_only_count,
        COUNT(*) FILTER (WHERE NOT has_e5_embedding AND has_bge_embedding) as bge_only_count
      FROM embeddings 
      WHERE status = 'completed' AND is_deleted = false
      GROUP BY content_type
    ) t
  ),
  model_data AS (
    SELECT jsonb_build_object(
      'e5_model', (SELECT DISTINCT embedding_e5_model FROM embeddings WHERE has_e5_embedding LIMIT 1),
      'bge_model', (SELECT DISTINCT embedding_bge_model FROM embeddings WHERE has_bge_embedding LIMIT 1),
      'last_updated', (SELECT MAX(embedding_updated_at) FROM embeddings)
    ) as model_info
  )
  SELECT 
    s.total_embeddings,
    s.dual_embeddings,
    s.e5_only,
    s.bge_only,
    s.incomplete,
    ROUND(
      (s.dual_embeddings::numeric / NULLIF(s.total_embeddings, 0)::numeric) * 100, 2
    ) as dual_coverage_percent,
    s.avg_text_length,
    s.avg_word_count,
    cb.breakdown as content_type_breakdown,
    md.model_info
  FROM stats s, content_breakdown cb, model_data md;
END;
$$;
-- =========================
-- VIDEO PROCESSING & UTILITY FUNCTIONS (Part 3)
-- =========================

-- =========================
-- VIDEO PROCESSING FUNCTIONS
-- =========================

-- Function to calculate progress percentage based on completed steps
CREATE OR REPLACE FUNCTION calculate_video_processing_progress(queue_id_param bigint)
RETURNS INT AS $$
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
$$ LANGUAGE plpgsql;

-- Function to initialize processing steps for a new queue item (simplified flow)
CREATE OR REPLACE FUNCTION initialize_video_processing_steps(queue_id_param bigint)
RETURNS VOID AS $$
BEGIN
    -- Insert required processing steps (simplified: transcribe → embed)
    INSERT INTO video_processing_steps (queue_id, step_name, status)
    VALUES 
        (queue_id_param, 'transcribe', 'pending'),
        (queue_id_param, 'embed', 'pending');
END;
$$ LANGUAGE plpgsql;

-- Function to get next pending step for a queue item
CREATE OR REPLACE FUNCTION get_next_processing_step(queue_id_param bigint)
RETURNS TEXT AS $$
DECLARE
    next_step TEXT;
BEGIN
    SELECT step_name INTO next_step
    FROM video_processing_steps
    WHERE queue_id = queue_id_param 
    AND status = 'pending'
    ORDER BY 
        CASE step_name
            WHEN 'transcribe' THEN 1
            WHEN 'embed' THEN 2
            ELSE 3
        END
    LIMIT 1;
    
    RETURN next_step;
END;
$$ LANGUAGE plpgsql;

-- Function to mark step as completed and update queue status
CREATE OR REPLACE FUNCTION complete_processing_step(
    queue_id_param bigint,
    step_name_param TEXT,
    output_data_param JSONB DEFAULT NULL
)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Function to handle step failure and retry logic
CREATE OR REPLACE FUNCTION handle_step_failure(
    queue_id_param bigint,
    step_name_param TEXT,
    error_message_param TEXT,
    error_details_param JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
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
    
    -- Check if we should retry (increased retries for HuggingFace cold starts)
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
$$ LANGUAGE plpgsql;

-- Function to cancel video processing
CREATE OR REPLACE FUNCTION cancel_video_processing(queue_id_param bigint)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Function to get segment context (previous and next segments)
CREATE OR REPLACE FUNCTION get_segment_context(
  target_segment_id bigint,
  context_window int DEFAULT 1
) RETURNS TABLE (
  segment_id bigint,
  segment_index int,
  start_time float,
  end_time float,
  content_text text,
  segment_position text -- 'before', 'current', 'after'
) LANGUAGE plpgsql AS $$
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
$$;

-- =========================
-- QUIZ SYSTEM FUNCTIONS
-- =========================

-- Function to automatically expire old quiz sessions
CREATE OR REPLACE FUNCTION expire_old_quiz_sessions()
RETURNS void AS $$
BEGIN
  UPDATE community_quiz_attempt_session 
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' 
    AND expires_at IS NOT NULL 
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up abandoned quiz sessions
CREATE OR REPLACE FUNCTION cleanup_abandoned_quiz_sessions()
RETURNS void AS $$
BEGIN
  -- Mark sessions as expired if no activity for more than 2 hours
  UPDATE community_quiz_attempt_session 
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' 
    AND last_activity_at < now() - interval '2 hours';
    
  -- Optionally delete very old expired sessions (older than 30 days)
  DELETE FROM community_quiz_attempt_session 
  WHERE status IN ('expired', 'completed') 
    AND updated_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- =========================
-- NOTIFICATION FUNCTIONS
-- =========================

-- Function to get user notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id bigint)
RETURNS TABLE (
  category_name text,
  category_display_name text,
  push_enabled boolean,
  email_enabled boolean,
  in_app_enabled boolean,
  frequency text
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nc.name,
    nc.display_name,
    COALESCE(unp.push_enabled, nc.default_enabled),
    COALESCE(unp.email_enabled, nc.default_enabled),
    COALESCE(unp.in_app_enabled, true),
    COALESCE(unp.frequency, 'immediate')
  FROM notification_categories nc
  LEFT JOIN user_notification_preferences unp ON nc.id = unp.category_id AND unp.user_id = p_user_id
  WHERE nc.is_deleted = false
  ORDER BY nc.priority ASC, nc.display_name ASC;
END;
$$;

-- =========================
-- EMBEDDING UTILITY FUNCTIONS
-- =========================

-- Function to find embeddings that need dual embedding backfill
CREATE OR REPLACE FUNCTION find_incomplete_dual_embeddings(
  limit_count int DEFAULT 50,
  content_type_filter text DEFAULT NULL,
  priority_missing text DEFAULT 'bge' -- 'e5', 'bge', or 'any'
)
RETURNS TABLE (
  id bigint,
  content_type text,
  content_id bigint,
  content_text text,
  has_e5_embedding boolean,
  has_bge_embedding boolean,
  missing_types text[],
  priority_score int,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content_type,
    e.content_id,
    e.content_text,
    e.has_e5_embedding,
    e.has_bge_embedding,
    CASE 
      WHEN NOT e.has_e5_embedding AND NOT e.has_bge_embedding THEN ARRAY['e5', 'bge']
      WHEN NOT e.has_e5_embedding THEN ARRAY['e5']
      WHEN NOT e.has_bge_embedding THEN ARRAY['bge']
      ELSE ARRAY[]::text[]
    END as missing_types,
    -- Priority score: dual missing = 3, bge missing = 2, e5 missing = 1
    CASE 
      WHEN NOT e.has_e5_embedding AND NOT e.has_bge_embedding THEN 3
      WHEN NOT e.has_bge_embedding THEN 2
      WHEN NOT e.has_e5_embedding THEN 1
      ELSE 0
    END as priority_score,
    e.created_at
  FROM embeddings e
  WHERE 
    e.status = 'completed'
    AND e.is_deleted = false
    AND (content_type_filter IS NULL OR e.content_type = content_type_filter)
    AND (
      CASE priority_missing
        WHEN 'e5' THEN NOT e.has_e5_embedding
        WHEN 'bge' THEN NOT e.has_bge_embedding
        WHEN 'any' THEN (NOT e.has_e5_embedding OR NOT e.has_bge_embedding)
        ELSE (NOT e.has_e5_embedding OR NOT e.has_bge_embedding)
      END
    )
  ORDER BY 
    priority_score DESC,
    e.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Function to update embedding flags after processing
CREATE OR REPLACE FUNCTION update_embedding_flags(
  p_embedding_id bigint,
  p_embedding_type text, -- 'e5' or 'bge'
  p_success boolean
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_embedding_type = 'e5' THEN
    UPDATE embeddings 
    SET 
      has_e5_embedding = p_success,
      embedding_updated_at = now(),
      updated_at = now()
    WHERE id = p_embedding_id;
  ELSIF p_embedding_type = 'bge' THEN
    UPDATE embeddings 
    SET 
      has_bge_embedding = p_success,
      embedding_updated_at = now(),
      updated_at = now()
    WHERE id = p_embedding_id;
  ELSE
    RETURN false;
  END IF;
  
  RETURN FOUND;
END;
$$;

-- =========================
-- CLASSROOM FUNCTIONS
-- =========================

-- Function to generate unique class codes
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code_chars text := 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; -- Exclude O and 0 for clarity
  code_length int := 8;
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := '';
    
    -- Generate random code
    FOR i IN 1..code_length LOOP
      new_code := new_code || substr(code_chars, floor(random() * length(code_chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM classroom WHERE class_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- =========================
-- STATISTICS VIEWS
-- =========================

-- Create a view for easy dual embedding statistics
CREATE OR REPLACE VIEW dual_embedding_stats AS
SELECT 
  COUNT(*) as total_embeddings,
  COUNT(*) FILTER (WHERE has_e5_embedding AND has_bge_embedding) as dual_complete,
  COUNT(*) FILTER (WHERE has_e5_embedding AND NOT has_bge_embedding) as e5_only,
  COUNT(*) FILTER (WHERE NOT has_e5_embedding AND has_bge_embedding) as bge_only,
  COUNT(*) FILTER (WHERE NOT has_e5_embedding AND NOT has_bge_embedding) as no_embeddings,
  ROUND(
    (COUNT(*) FILTER (WHERE has_e5_embedding AND has_bge_embedding)::numeric / 
     NULLIF(COUNT(*), 0)::numeric) * 100, 2
  ) as dual_coverage_percent,
  content_type
FROM embeddings 
WHERE status = 'completed' AND is_deleted = false
GROUP BY content_type
UNION ALL
SELECT 
  COUNT(*) as total_embeddings,
  COUNT(*) FILTER (WHERE has_e5_embedding AND has_bge_embedding) as dual_complete,
  COUNT(*) FILTER (WHERE has_e5_embedding AND NOT has_bge_embedding) as e5_only,
  COUNT(*) FILTER (WHERE NOT has_e5_embedding AND has_bge_embedding) as bge_only,
  COUNT(*) FILTER (WHERE NOT has_e5_embedding AND NOT has_bge_embedding) as no_embeddings,
  ROUND(
    (COUNT(*) FILTER (WHERE has_e5_embedding AND has_bge_embedding)::numeric / 
     NULLIF(COUNT(*), 0)::numeric) * 100, 2
  ) as dual_coverage_percent,
  'TOTAL' as content_type
FROM embeddings 
WHERE status = 'completed' AND is_deleted = false;

-- Video processing queue status view
CREATE OR REPLACE VIEW video_processing_queue_status AS
SELECT 
    q.id,
    q.public_id,
    q.attachment_id,
    q.user_id,
    q.current_step,
    q.status,
    q.progress_percentage,
    q.retry_count,
    q.max_retries,
    q.error_message,
    q.created_at,
    q.updated_at,
    q.started_at,
    q.completed_at,
    q.cancelled_at,
    a.title as attachment_title,
    a.type as attachment_type,
    a.size as attachment_size,
    p.display_name as user_name,
    -- Step details
    (
        SELECT json_agg(
            json_build_object(
                'step_name', s.step_name,
                'status', s.status,
                'started_at', s.started_at,
                'completed_at', s.completed_at,
                'duration_seconds', s.duration_seconds,
                'retry_count', s.retry_count,
                'error_message', s.error_message
            ) ORDER BY 
                CASE s.step_name
                    WHEN 'transcribe' THEN 1
                    WHEN 'embed' THEN 2
                    ELSE 3
                END
        )
        FROM video_processing_steps s
        WHERE s.queue_id = q.id
    ) as steps
FROM video_processing_queue q
LEFT JOIN course_attachments a ON q.attachment_id = a.id
LEFT JOIN profiles p ON q.user_id = p.user_id;
