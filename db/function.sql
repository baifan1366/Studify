-- =========================
-- QStash Integration Functions
-- =========================

-- Function to queue content for embedding via QStash
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
  response text;
BEGIN
  -- Validate content type for embedding
  IF p_content_type NOT IN ('profile', 'course', 'post', 'lesson') THEN
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
$$;

-- =========================
-- Course System Functions and Triggers
-- =========================

-- Create triggers for automatic slug generation
create or replace function generate_course_slug()
returns trigger as $$
begin
  if new.slug is null then
    new.slug := lower(regexp_replace(new.title, '[^a-zA-Z0-9\s]', '', 'g'));
    new.slug := regexp_replace(new.slug, '\s+', '-', 'g');
    new.slug := new.slug || '-' || substring(new.public_id::text from 1 for 8);
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function generate_lesson_slug()
returns trigger as $$
begin
  if new.slug is null then
    new.slug := lower(regexp_replace(new.title, '[^a-zA-Z0-9\s]', '', 'g'));
    new.slug := regexp_replace(new.slug, '\s+', '-', 'g');
    new.slug := new.slug || '-' || substring(new.public_id::text from 1 for 8);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists course_slug_trigger on course;
create trigger course_slug_trigger
  before insert or update on course
  for each row execute function generate_course_slug();

drop trigger if exists lesson_slug_trigger on course_lesson;
create trigger lesson_slug_trigger
  before insert or update on course_lesson
  for each row execute function generate_lesson_slug();

-- Function to automatically create classroom and community group when course is purchased
create or replace function create_course_resources()
returns trigger as $$
declare
  classroom_id bigint;
  community_group_id bigint;
  course_record record;
begin
  -- Get course details
  select * into course_record from course where id = new.course_id;
  
  -- Create classroom if auto_create_classroom is true
  if course_record.auto_create_classroom then
    insert into classroom (
      slug, name, description, class_code, visibility, owner_id
    ) values (
      course_record.slug || '-classroom',
      course_record.title || ' - Classroom',
      'Auto-generated classroom for ' || course_record.title,
      upper(substring(md5(random()::text) from 1 for 8)),
      'private',
      new.user_id
    ) returning id into classroom_id;
    
    -- Add user as classroom member
    insert into classroom_member (classroom_id, user_id, role)
    values (classroom_id, new.user_id, 'student');
  end if;
  
  -- Create community group if auto_create_community is true
  if course_record.auto_create_community then
    insert into community_group (
      name, description, slug, visibility, owner_id
    ) values (
      course_record.title || ' - Community',
      'Auto-generated community for ' || course_record.title,
      course_record.slug || '-community',
      'private',
      course_record.owner_id
    ) returning id into community_group_id;
    
    -- Add user as community member
    insert into community_group_member (group_id, user_id, role)
    values (community_group_id, new.user_id, 'member');
  end if;
  
  return new;
end;
$$ language plpgsql;

drop trigger if exists course_enrollment_resources_trigger on course_enrollment;
create trigger course_enrollment_resources_trigger
  after insert on course_enrollment
  for each row execute function create_course_resources();

-- Function to update mistake_book when quiz is failed
create or replace function handle_quiz_mistake()
returns trigger as $$
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
end;
$$ language plpgsql;

drop trigger if exists quiz_mistake_trigger on course_quiz_submission;
create trigger quiz_mistake_trigger
  after insert on course_quiz_submission
  for each row execute function handle_quiz_mistake();

-- =========================
-- Embedding System Functions
-- =========================

-- Function to extract searchable text from different content types
CREATE OR REPLACE FUNCTION extract_content_text(content_type text, content_id bigint)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result_text text := '';
  profile_record profiles%ROWTYPE;
  course_record course%ROWTYPE;
  post_record community_post%ROWTYPE;
  comment_record community_comment%ROWTYPE;
  lesson_record course_lesson%ROWTYPE;
  auth_record auth.users%ROWTYPE;
BEGIN
  CASE content_type
    WHEN 'profile' THEN
      SELECT * INTO profile_record FROM profiles WHERE id = content_id AND is_deleted = false;
      IF FOUND THEN
        result_text := COALESCE(profile_record.display_name, '') || ' ' || 
                      COALESCE(profile_record.full_name, '') || ' ' || 
                      COALESCE(profile_record.bio, '') || ' ' || 
                      COALESCE(profile_record.role, '');
      END IF;
      
    WHEN 'course' THEN
      SELECT * INTO course_record FROM course WHERE id = content_id AND is_deleted = false;
      IF FOUND THEN
        result_text := COALESCE(course_record.title, '') || ' ' || 
                      COALESCE(course_record.description, '') || ' ' || 
                      COALESCE(course_record.category, '') || ' ' ||
                      COALESCE(array_to_string(course_record.tags, ' '), '') || ' ' ||
                      COALESCE(array_to_string(course_record.requirements, ' '), '') || ' ' ||
                      COALESCE(array_to_string(course_record.learning_objectives, ' '), '');
      END IF;
      
    WHEN 'post' THEN
      SELECT * INTO post_record FROM community_post WHERE id = content_id AND is_deleted = false;
      IF FOUND THEN
        result_text := COALESCE(post_record.title, '') || ' ' || 
                      COALESCE(post_record.body, '');
      END IF;
      
    WHEN 'comment' THEN
      SELECT * INTO comment_record FROM community_comment WHERE id = content_id AND is_deleted = false;
      IF FOUND THEN
        result_text := COALESCE(comment_record.body, '');
      END IF;
      
    WHEN 'lesson' THEN
      SELECT * INTO lesson_record FROM course_lesson WHERE id = content_id AND is_deleted = false;
      IF FOUND THEN
        result_text := COALESCE(lesson_record.title, '') || ' ' || 
                      COALESCE(lesson_record.description, '') || ' ' ||
                      COALESCE(lesson_record.transcript, '');
      END IF;
      
    WHEN 'auth_user' THEN
      SELECT * INTO auth_record FROM auth.users WHERE id::text = content_id::text;
      IF FOUND THEN
        result_text := COALESCE(auth_record.email, '') || ' ' || 
                      COALESCE(auth_record.raw_user_meta_data->>'full_name', '') || ' ' ||
                      COALESCE(auth_record.raw_user_meta_data->>'display_name', '');
      END IF;
      
    ELSE
      RAISE EXCEPTION 'Unknown content_type: %', content_type;
  END CASE;
  
  result_text := TRIM(regexp_replace(result_text, '\s+', ' ', 'g'));
  
  IF result_text IS NULL OR result_text = '' THEN
    result_text := '';
  END IF;
  
  RETURN result_text;
END;
$$;

-- Function to generate content hash
CREATE OR REPLACE FUNCTION generate_content_hash(content_text text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(digest(content_text, 'sha256'), 'hex');
END;
$$;

-- Function to queue content for embedding
CREATE OR REPLACE FUNCTION queue_for_embedding(
  p_content_type text,
  p_content_id bigint,
  p_priority int DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
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
$$;

-- Function to get next batch for processing
CREATE OR REPLACE FUNCTION get_embedding_batch(batch_size int DEFAULT 10)
RETURNS TABLE(
  id bigint,
  content_type text,
  content_id bigint,
  content_text text,
  content_hash text
)
LANGUAGE plpgsql
AS $$
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
$$;

-- Function to complete embedding processing
CREATE OR REPLACE FUNCTION complete_embedding(
  p_queue_id bigint,
  p_embedding vector(384),
  p_token_count int DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
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
$$;

-- Function to handle embedding failures
CREATE OR REPLACE FUNCTION fail_embedding(
  p_queue_id bigint,
  p_error_message text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
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
$$;

-- Function for semantic search
CREATE OR REPLACE FUNCTION semantic_search(
  p_query_embedding vector(384),
  p_content_types text[] DEFAULT NULL,
  p_similarity_threshold numeric(3,2) DEFAULT 0.7,
  p_max_results int DEFAULT 10,
  p_user_id bigint DEFAULT NULL
)
RETURNS TABLE(
  content_type text,
  content_id bigint,
  content_text text,
  similarity numeric,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
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
$$;

-- Function to update embedding metadata statistics
CREATE OR REPLACE FUNCTION update_embedding_stats()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- =========================
-- Embedding System Triggers
-- =========================

-- Trigger for automatic metadata updates
DROP TRIGGER IF EXISTS trigger_update_embedding_stats ON embeddings;
CREATE TRIGGER trigger_update_embedding_stats
  BEFORE INSERT OR UPDATE ON embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_stats();

-- Trigger function for profiles
CREATE OR REPLACE FUNCTION trigger_profile_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.display_name IS DISTINCT FROM NEW.display_name OR
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.bio IS DISTINCT FROM NEW.bio OR
    OLD.role IS DISTINCT FROM NEW.role
  )) THEN
    PERFORM queue_for_embedding_qstash('profile', NEW.id, 3);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for courses
CREATE OR REPLACE FUNCTION trigger_course_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.category IS DISTINCT FROM NEW.category OR
    OLD.tags IS DISTINCT FROM NEW.tags OR
    OLD.requirements IS DISTINCT FROM NEW.requirements OR
    OLD.learning_objectives IS DISTINCT FROM NEW.learning_objectives
  )) THEN
    PERFORM queue_for_embedding_qstash('course', NEW.id, 2);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for community posts
CREATE OR REPLACE FUNCTION trigger_post_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.body IS DISTINCT FROM NEW.body
  )) THEN
    PERFORM queue_for_embedding_qstash('post', NEW.id, 4);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for community comments
CREATE OR REPLACE FUNCTION trigger_comment_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.body IS DISTINCT FROM NEW.body
  )) THEN
    PERFORM queue_for_embedding_qstash('comment', NEW.id, 5);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for course lessons
CREATE OR REPLACE FUNCTION trigger_lesson_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.transcript IS DISTINCT FROM NEW.transcript
  )) THEN
    PERFORM queue_for_embedding_qstash('lesson', NEW.id, 3);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create embedding triggers
DROP TRIGGER IF EXISTS profile_embedding_trigger ON profiles;
CREATE TRIGGER profile_embedding_trigger
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_profile_embedding();

DROP TRIGGER IF EXISTS course_embedding_trigger ON course;
CREATE TRIGGER course_embedding_trigger
  AFTER INSERT OR UPDATE ON course
  FOR EACH ROW EXECUTE FUNCTION trigger_course_embedding();

DROP TRIGGER IF EXISTS post_embedding_trigger ON community_post;
CREATE TRIGGER post_embedding_trigger
  AFTER INSERT OR UPDATE ON community_post
  FOR EACH ROW EXECUTE FUNCTION trigger_post_embedding();

DROP TRIGGER IF EXISTS comment_embedding_trigger ON community_comment;
CREATE TRIGGER comment_embedding_trigger
  AFTER INSERT OR UPDATE ON community_comment
  FOR EACH ROW EXECUTE FUNCTION trigger_comment_embedding();

DROP TRIGGER IF EXISTS lesson_embedding_trigger ON course_lesson;
CREATE TRIGGER lesson_embedding_trigger
  AFTER INSERT OR UPDATE ON course_lesson
  FOR EACH ROW EXECUTE FUNCTION trigger_lesson_embedding();

--Post tsvector update function
create or replace function community_post_tsvector_update() returns trigger as $$
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
end;
$$ language plpgsql;

-- Hashtag tsvector update function
create or replace function hashtags_tsvector_update() returns trigger as $$
begin
  new.search_vector := to_tsvector('english', coalesce(new.name, ''));
  return new;
end;
$$ language plpgsql;

-- Function to update posts when hashtag name changes
create or replace function update_posts_on_hashtag_change() returns trigger as $$
begin
  update community_post
  set updated_at = now()  -- 触发 post trigger 更新 search_vector
  where public_id in (
    select ph.post_id
    from post_hashtags ph
    where ph.hashtag_id = new.id
  );
  return new;
end;
$$ language plpgsql;

-- Function to update post when its hashtag associations change
create or replace function update_post_on_hashtag_assoc_change() returns trigger as $$
begin
  update community_post
  set updated_at = now()  -- 触发 post trigger 更新 search_vector
  where public_id = new.post_id;
  return new;
end;
$$ language plpgsql;

-- Drop old triggers
drop trigger if exists trg_update_post_tsvector on community_post;
drop trigger if exists trg_update_hashtag_tsvector on hashtags;
drop trigger if exists trg_update_posts_on_hashtag_change on hashtags;
drop trigger if exists trg_update_post_on_hashtag_assoc_insert on post_hashtags;
drop trigger if exists trg_update_post_on_hashtag_assoc_delete on post_hashtags;

-- Post trigger
create trigger trg_update_post_tsvector
before insert or update
on community_post
for each row
execute procedure community_post_tsvector_update();

-- Hashtag triggers
create trigger trg_update_hashtag_tsvector
before insert or update
on hashtags
for each row
execute procedure hashtags_tsvector_update();

create trigger trg_update_posts_on_hashtag_change
after update
on hashtags
for each row
execute procedure update_posts_on_hashtag_change();

-- post_hashtags triggers
create trigger trg_update_post_on_hashtag_assoc_insert
after insert
on post_hashtags
for each row
execute procedure update_post_on_hashtag_assoc_change();

create trigger trg_update_post_on_hashtag_assoc_delete
after delete
on post_hashtags
for each row
execute procedure update_post_on_hashtag_assoc_change();