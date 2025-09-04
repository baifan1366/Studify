-- Fix community_reaction polymorphic relationship issues
-- This migration adds proper foreign key constraints and indexes for the polymorphic relationship

-- Add foreign key constraints for the polymorphic relationship
-- We need to handle this carefully since we can't have a direct FK to multiple tables

-- First, let's add indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_reaction_post_target 
ON community_reaction (target_id) 
WHERE target_type = 'post';

CREATE INDEX IF NOT EXISTS idx_community_reaction_comment_target 
ON community_reaction (target_id) 
WHERE target_type = 'comment';

-- Add a function to validate the polymorphic relationship
CREATE OR REPLACE FUNCTION validate_community_reaction_target()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that the target exists based on target_type
  IF NEW.target_type = 'post' THEN
    IF NOT EXISTS (SELECT 1 FROM community_post WHERE id = NEW.target_id AND is_deleted = false) THEN
      RAISE EXCEPTION 'Referenced post does not exist or is deleted';
    END IF;
  ELSIF NEW.target_type = 'comment' THEN
    IF NOT EXISTS (SELECT 1 FROM community_comment WHERE id = NEW.target_id AND is_deleted = false) THEN
      RAISE EXCEPTION 'Referenced comment does not exist or is deleted';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate the polymorphic relationship
DROP TRIGGER IF EXISTS validate_community_reaction_target_trigger ON community_reaction;
CREATE TRIGGER validate_community_reaction_target_trigger
  BEFORE INSERT OR UPDATE ON community_reaction
  FOR EACH ROW
  EXECUTE FUNCTION validate_community_reaction_target();

-- Add a view to make querying reactions easier
CREATE OR REPLACE VIEW community_post_reactions AS
SELECT 
  r.*,
  p.title as post_title,
  p.group_id,
  u.display_name as user_display_name
FROM community_reaction r
JOIN community_post p ON r.target_id = p.id
JOIN profiles u ON r.user_id = u.id
WHERE r.target_type = 'post' AND r.created_at IS NOT NULL;

CREATE OR REPLACE VIEW community_comment_reactions AS
SELECT 
  r.*,
  c.body as comment_body,
  c.post_id,
  u.display_name as user_display_name
FROM community_reaction r
JOIN community_comment c ON r.target_id = c.id
JOIN profiles u ON r.user_id = u.id
WHERE r.target_type = 'comment' AND r.created_at IS NOT NULL;
