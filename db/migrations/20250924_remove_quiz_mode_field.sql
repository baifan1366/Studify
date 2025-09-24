-- Migration: Remove quiz_mode field from community_quiz table
-- Date: 2025-09-24
-- Description: Completely remove quiz_mode field and related constraints

-- Step 1: Drop the CHECK constraint for quiz_mode
ALTER TABLE community_quiz DROP CONSTRAINT IF EXISTS community_quiz_quiz_mode_check;

-- Step 2: Drop the quiz_mode column
ALTER TABLE community_quiz DROP COLUMN IF EXISTS quiz_mode;

-- Step 3: Update the tsvector search functions to remove quiz_mode references
-- This will be handled in the tsvector search function files separately

-- Step 4: Verify the column has been removed
-- You can run this to check: \d community_quiz

-- Note: This migration is irreversible. Make sure to backup data if needed.
-- The quiz_mode field will be completely removed from the system.
