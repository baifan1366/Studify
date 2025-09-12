-- Add Cloudinary caching fields to course_attachments table
-- This enables caching of processed video URLs to avoid reprocessing

ALTER TABLE course_attachments 
ADD COLUMN IF NOT EXISTS cloudinary_hls_url text,
ADD COLUMN IF NOT EXISTS cloudinary_processed_at timestamptz,
ADD COLUMN IF NOT EXISTS cloudinary_public_id text;