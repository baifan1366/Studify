-- 创建 community_post 和 course 全文搜索函数
-- 使用 tsvector 进行高效的全文搜索

-- ============================================
-- COMMUNITY POST 全文搜索
-- ============================================

-- 确保 search_vector 列存在并有索引
CREATE INDEX IF NOT EXISTS idx_community_post_search_vector 
ON community_post USING gin(search_vector);

-- 创建或替换搜索函数
CREATE OR REPLACE FUNCTION search_community_posts(
  search_query TEXT,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  public_id UUID,
  title TEXT,
  body TEXT,
  slug TEXT,
  created_at TIMESTAMPTZ,
  author_id BIGINT,
  author_name TEXT,
  group_id BIGINT,
  group_slug TEXT,
  group_name TEXT,
  rank REAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.public_id,
    cp.title,
    cp.body,
    cp.slug,
    cp.created_at,
    cp.author_id,
    p.display_name AS author_name,
    cp.group_id,
    cg.slug AS group_slug,
    cg.name AS group_name,
    ts_rank(cp.search_vector, to_tsquery('simple', search_query)) AS rank
  FROM community_post cp
  LEFT JOIN profiles p ON cp.author_id = p.id
  LEFT JOIN community_group cg ON cp.group_id = cg.id
  WHERE 
    cp.is_deleted = false
    AND cp.search_vector @@ to_tsquery('simple', search_query)
  ORDER BY 
    ts_rank(cp.search_vector, to_tsquery('simple', search_query)) DESC,
    cp.created_at DESC
  LIMIT result_limit;
END;
$$;

-- 创建触发器函数来自动更新 search_vector
CREATE OR REPLACE FUNCTION update_community_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.body, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_update_community_post_search_vector ON community_post;

-- 创建触发器
CREATE TRIGGER trigger_update_community_post_search_vector
  BEFORE INSERT OR UPDATE OF title, body
  ON community_post
  FOR EACH ROW
  EXECUTE FUNCTION update_community_post_search_vector();

-- 更新现有记录的 search_vector
UPDATE community_post
SET search_vector = 
  setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(body, '')), 'B')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- ============================================
-- COURSE 全文搜索
-- ============================================

-- 确保 search_vector 列存在并有索引
CREATE INDEX IF NOT EXISTS idx_course_search_vector 
ON course USING gin(search_vector);

-- 创建或替换课程搜索函数
CREATE OR REPLACE FUNCTION search_courses(
  search_query TEXT,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  public_id UUID,
  title TEXT,
  description TEXT,
  slug TEXT,
  level TEXT,
  category TEXT,
  tags TEXT[],
  thumbnail_url TEXT,
  owner_id BIGINT,
  owner_name TEXT,
  total_students INTEGER,
  average_rating NUMERIC,
  price_cents INTEGER,
  currency TEXT,
  is_free BOOLEAN,
  created_at TIMESTAMPTZ,
  rank REAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.public_id,
    c.title,
    c.description,
    c.slug,
    c.level,
    c.category,
    c.tags,
    c.thumbnail_url,
    c.owner_id,
    p.display_name AS owner_name,
    c.total_students,
    c.average_rating,
    c.price_cents,
    c.currency,
    c.is_free,
    c.created_at,
    ts_rank(c.search_vector, to_tsquery('simple', search_query)) AS rank
  FROM course c
  LEFT JOIN profiles p ON c.owner_id = p.id
  WHERE 
    c.is_deleted = false
    AND c.status = 'active'
    AND c.search_vector @@ to_tsquery('simple', search_query)
  ORDER BY 
    ts_rank(c.search_vector, to_tsquery('simple', search_query)) DESC,
    c.total_students DESC,
    c.average_rating DESC
  LIMIT result_limit;
END;
$$;

-- 创建触发器函数来自动更新 course search_vector
CREATE OR REPLACE FUNCTION update_course_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.category, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_update_course_search_vector ON course;

-- 创建触发器
CREATE TRIGGER trigger_update_course_search_vector
  BEFORE INSERT OR UPDATE OF title, description, category, tags
  ON course
  FOR EACH ROW
  EXECUTE FUNCTION update_course_search_vector();

-- 更新现有记录的 search_vector
UPDATE course
SET search_vector = 
  setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(category, '')), 'C') ||
  setweight(to_tsvector('simple', COALESCE(array_to_string(tags, ' '), '')), 'C')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- 添加注释
COMMENT ON FUNCTION search_community_posts IS 'Full-text search for community posts using tsvector with relevance ranking';
COMMENT ON FUNCTION update_community_post_search_vector IS 'Automatically updates search_vector when post title or body changes';
COMMENT ON FUNCTION search_courses IS 'Full-text search for courses using tsvector with relevance ranking';
COMMENT ON FUNCTION update_course_search_vector IS 'Automatically updates search_vector when course title, description, category or tags change';
