-- Community Recommendations Database Functions
-- 社区推荐系统数据库函数

-- Function to get frequently interacted authors for a user
-- 获取用户经常互动的作者
CREATE OR REPLACE FUNCTION get_frequent_authors(
  user_profile_id bigint,
  min_interactions int DEFAULT 2
)
RETURNS TABLE (
  author_id bigint,
  interaction_count bigint,
  last_interaction_at timestamptz
) AS $$
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
$$ LANGUAGE plpgsql;

-- Function to get post interaction statistics
-- 获取帖子互动统计
CREATE OR REPLACE FUNCTION get_post_interaction_stats(
  post_ids bigint[]
)
RETURNS TABLE (
  post_id bigint,
  comments_count bigint,
  reactions_count bigint,
  unique_reactors_count bigint,
  last_activity_at timestamptz
) AS $$
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
$$ LANGUAGE plpgsql;

-- Function to get user's hashtag preferences
-- 获取用户的标签偏好
CREATE OR REPLACE FUNCTION get_user_hashtag_preferences(
  user_profile_id bigint,
  limit_count int DEFAULT 20
)
RETURNS TABLE (
  hashtag_name text,
  usage_count bigint,
  last_used_at timestamptz
) AS $$
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
$$ LANGUAGE plpgsql;

-- Function to get trending posts
-- 获取热门帖子
CREATE OR REPLACE FUNCTION get_trending_posts(
  user_profile_id bigint,
  days_back int DEFAULT 7,
  limit_count int DEFAULT 20
)
RETURNS TABLE (
  post_id bigint,
  trending_score numeric,
  comments_count bigint,
  reactions_count bigint,
  age_hours numeric
) AS $$
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
$$ LANGUAGE plpgsql;

-- Function to get posts from user's groups
-- 获取用户群组中的帖子
CREATE OR REPLACE FUNCTION get_group_posts_for_user(
  user_profile_id bigint,
  days_back int DEFAULT 30,
  limit_count int DEFAULT 50
)
RETURNS TABLE (
  post_id bigint,
  group_id bigint,
  group_name text,
  author_id bigint,
  created_at timestamptz,
  interaction_score numeric
) AS $$
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
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
-- 创建索引以提升性能
CREATE INDEX IF NOT EXISTS idx_community_reaction_user_target 
ON community_reaction(user_id, target_type, target_id, created_at);

CREATE INDEX IF NOT EXISTS idx_community_comment_author_post 
ON community_comment(author_id, post_id, created_at) 
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_community_post_author_created 
ON community_post(author_id, created_at) 
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_community_post_group_created 
ON community_post(group_id, created_at) 
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_community_group_member_user_group 
ON community_group_member(user_id, group_id) 
WHERE is_deleted = false;

-- Grant permissions (adjust as needed)
-- GRANT EXECUTE ON FUNCTION get_frequent_authors(bigint, int) TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_post_interaction_stats(bigint[]) TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_user_hashtag_preferences(bigint, int) TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_trending_posts(bigint, int, int) TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_group_posts_for_user(bigint, int, int) TO authenticated;
