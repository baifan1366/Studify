-- =========================
-- CONSOLIDATED DATABASE PERMISSIONS & COMMENTS
-- =========================

-- =========================
-- PERMISSIONS GRANTS
-- =========================

-- Core table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON action TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ban TO authenticated;

-- AI system permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_agent TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_run TO authenticated;

-- Course system permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON course_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_module TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_lesson TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_enrollment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_chapter TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_product TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_order TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_order_item TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_payment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_quiz_question TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_quiz_submission TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_quiz_session TO authenticated;

-- Classroom system permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON classroom TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classroom_member TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classroom_live_session TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classroom_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classroom_assignment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classroom_assignment_submission TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classroom_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classroom_post_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classroom_post_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classroom_engagement_report TO authenticated;

-- Learning system permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON mistake_book TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON learning_path TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON milestone TO authenticated;

-- Community system permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON community_group TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_group_member TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_post TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_post_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_comment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_comment_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_reaction TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_points_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_achievement TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_user_achievement TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_checkin TO authenticated;

-- Quiz system permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON community_quiz TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_quiz_question TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_quiz_attempt TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_quiz_attempt_answer TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_quiz_attempt_session TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_quiz_permission TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_quiz_invite_token TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_quiz_like TO authenticated;

-- Notification system permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_delivery_log TO authenticated;

-- Embedding system permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON embeddings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON embedding_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON embedding_searches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_hierarchy TO authenticated;

-- Video processing permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON video_embeddings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON video_processing_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON video_processing_steps TO authenticated;

-- Tutoring system permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tutoring_tutors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tutoring_students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tutoring_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tutoring_appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tutoring_file TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tutoring_note TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tutoring_share TO authenticated;

-- Search and utility permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hashtags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON post_hashtags TO authenticated;

-- System tables permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON currencies TO authenticated;

-- Views permissions
GRANT SELECT ON dual_embedding_stats TO authenticated;
GRANT SELECT ON video_processing_queue_status TO authenticated;

-- Sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =========================
-- TABLE COMMENTS
-- =========================

-- Core system tables
COMMENT ON TABLE profiles IS 'User profiles with enhanced settings, preferences, and completion tracking';
COMMENT ON TABLE notifications IS 'System notifications with categorization and delivery tracking';
COMMENT ON TABLE audit_log IS 'Audit trail for system actions and changes';

-- Course system tables
COMMENT ON TABLE course IS 'Main course table with metadata, pricing, and auto-creation flags';
COMMENT ON TABLE course_lesson IS 'Course lessons supporting multiple content types (video, quiz, live, etc.)';
COMMENT ON TABLE course_progress IS 'Student progress tracking with AI recommendations';
COMMENT ON TABLE course_notes IS 'Student notes with timestamp and AI summarization support';

-- Classroom system tables
COMMENT ON TABLE classroom IS 'Virtual classrooms with unique class codes and timezone support';
COMMENT ON TABLE classroom_live_session IS 'Live session scheduling with LiveKit integration';
COMMENT ON TABLE classroom_attendance IS 'Attendance tracking with duration calculation';

-- Community system tables
COMMENT ON TABLE community_group IS 'Community groups with public/private visibility';
COMMENT ON TABLE community_post IS 'Community posts with full-text search support';
COMMENT ON TABLE community_reaction IS 'Polymorphic reactions supporting posts and comments';

-- Embedding system tables
COMMENT ON TABLE embeddings IS 'Dual embedding storage (E5-Small 384d + BGE-M3 1024d) with metadata';
COMMENT ON TABLE embedding_queue IS 'Batch processing queue for embedding generation';
COMMENT ON TABLE embedding_searches IS 'Search analytics and performance tracking';

-- Video processing tables
COMMENT ON TABLE video_processing_queue IS 'QStash-based video processing pipeline (simplified: transcribe → embed)';
COMMENT ON TABLE video_embeddings IS 'Video segment embeddings with time-based indexing and dual vector support';

-- Quiz system tables
COMMENT ON TABLE community_quiz_attempt_session IS 'Active quiz sessions with time tracking and progress persistence';

-- =========================
-- COLUMN COMMENTS
-- =========================

-- Profiles table
COMMENT ON COLUMN profiles.profile_completion IS 'Calculated completion percentage (0-100) based on filled profile fields';
COMMENT ON COLUMN profiles.preferences IS 'JSONB field storing user preferences including onboarding choices and interests';
COMMENT ON COLUMN profiles.notification_settings IS 'Comprehensive notification preferences with granular controls';
COMMENT ON COLUMN profiles.onesignal_player_id IS 'OneSignal player ID for push notifications';

-- Course system
COMMENT ON COLUMN course.auto_create_classroom IS 'Automatically create classroom when course is purchased';
COMMENT ON COLUMN course.auto_create_community IS 'Automatically create community group when course is purchased';
COMMENT ON COLUMN course.learning_objectives IS 'Array of learning objectives for the course';
COMMENT ON COLUMN course.requirements IS 'Array of prerequisites for the course';

-- Embedding system
COMMENT ON COLUMN embeddings.embedding_e5_small IS 'E5-Small embedding vector (384 dimensions)';
COMMENT ON COLUMN embeddings.embedding_bge_m3 IS 'BGE-M3 embedding vector (1024 dimensions)';
COMMENT ON COLUMN embeddings.has_e5_embedding IS 'Flag indicating E5-Small embedding availability';
COMMENT ON COLUMN embeddings.has_bge_embedding IS 'Flag indicating BGE-M3 embedding availability';

-- Video processing
COMMENT ON COLUMN video_processing_queue.current_step IS 'Current processing step (upload → transcribe → embed)';
COMMENT ON COLUMN video_processing_queue.max_retries IS 'Increased to 5 for HuggingFace cold start handling';

-- Video embeddings
COMMENT ON COLUMN video_embeddings.segment_start_time IS 'Start time of video segment in seconds';
COMMENT ON COLUMN video_embeddings.segment_end_time IS 'End time of video segment in seconds';
COMMENT ON COLUMN video_embeddings.topic_keywords IS 'Keywords extracted from video segment content';
COMMENT ON COLUMN video_embeddings.confidence_score IS 'Quality confidence score (0-1) for segment';

-- Quiz system
COMMENT ON COLUMN community_quiz_attempt_session.session_token IS 'Unique token for session validation and security';
COMMENT ON COLUMN community_quiz_attempt_session.time_spent_seconds IS 'Total time spent in session (accumulated)';
COMMENT ON COLUMN community_quiz.time_limit_minutes IS 'Quiz time limit in minutes, null means unlimited';

-- Notification system
COMMENT ON COLUMN notification_delivery_log.delivery_method IS 'Delivery method: push, email, sms, in_app';
COMMENT ON COLUMN notification_delivery_log.external_id IS 'External service ID (OneSignal notification ID, etc.)';
COMMENT ON COLUMN user_notification_preferences.frequency IS 'Notification frequency: immediate, hourly, daily, weekly, never';

-- =========================
-- FUNCTION COMMENTS
-- =========================

COMMENT ON FUNCTION generate_slug(text) IS 'Generates URL-friendly slugs from text input';
COMMENT ON FUNCTION calculate_profile_completion(profiles) IS 'Calculates profile completion percentage based on filled fields';
COMMENT ON FUNCTION queue_for_embedding_qstash(text, bigint, int) IS 'Queues content for embedding using QStash with fallback to database queue';
COMMENT ON FUNCTION extract_content_text(text, bigint) IS 'Extracts searchable text content from various content types including preferences';
COMMENT ON FUNCTION search_embeddings_hybrid(vector, vector, text[], float, int, float, float, bigint) IS 'Advanced hybrid search combining E5 and BGE embeddings with configurable weights';
COMMENT ON FUNCTION search_video_segments_with_time(vector, vector, bigint[], float, float, float, int, boolean) IS 'Time-based video segment search with context retrieval';
COMMENT ON FUNCTION get_dual_embedding_statistics() IS 'Comprehensive statistics about dual embedding coverage and model information';
COMMENT ON FUNCTION generate_class_code() IS 'Generates unique 8-character alphanumeric classroom codes';

-- =========================
-- VIEW COMMENTS
-- =========================

COMMENT ON VIEW dual_embedding_stats IS 'Statistics view showing dual embedding coverage by content type with totals';
COMMENT ON VIEW video_processing_queue_status IS 'Comprehensive view of video processing queue with step details and user information';

-- =========================
-- SECURITY NOTES
-- =========================

/*
SECURITY CONSIDERATIONS:
1. All tables use Row Level Security (RLS) policies defined separately
2. UUID public_id fields prevent enumeration attacks
3. Soft deletion with is_deleted flags for data recovery
4. Audit logging for administrative actions
5. Role-based access control via profiles.role field
6. OneSignal integration uses secure player ID mapping
7. QStash integration uses secure webhook validation
8. Embedding system isolates content processing
9. Video processing uses secure token-based queue system
10. Quiz sessions use unique tokens for security

PERFORMANCE CONSIDERATIONS:
1. Comprehensive indexing on frequently queried columns
2. Vector indexes for embedding similarity search
3. Composite indexes for common query patterns
4. Partial indexes for filtered queries
5. GIN indexes for array and JSONB columns
6. Text search indexes for full-text search
7. Foreign key indexes for join performance

MAINTENANCE NOTES:
1. Use cleanup functions for old sessions and logs
2. Monitor embedding queue processing
3. Track dual embedding coverage statistics
4. Regular vacuum and analyze for vector indexes
5. Monitor video processing queue performance
6. Archive old audit logs and delivery logs
*/
