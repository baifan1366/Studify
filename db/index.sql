-- =========================
-- CONSOLIDATED DATABASE INDEXES
-- =========================

-- =========================
-- BASIC INDEXES
-- =========================

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_kind ON notifications(kind);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Course system indexes
CREATE INDEX IF NOT EXISTS idx_course_owner_id ON course(owner_id);
CREATE INDEX IF NOT EXISTS idx_course_slug ON course(slug);
CREATE INDEX IF NOT EXISTS idx_course_visibility ON course(visibility);
CREATE INDEX IF NOT EXISTS idx_course_status ON course(status);
CREATE INDEX IF NOT EXISTS idx_course_tags ON course USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_course_enrollment_course_id ON course_enrollment(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollment_user_id ON course_enrollment(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollment_role ON course_enrollment(role);

CREATE INDEX IF NOT EXISTS idx_course_lesson_course_id ON course_lesson(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lesson_module_id ON course_lesson(module_id);
CREATE INDEX IF NOT EXISTS idx_course_lesson_position ON course_lesson(course_id, position);

CREATE INDEX IF NOT EXISTS idx_course_progress_user_id ON course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_lesson_id ON course_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_state ON course_progress(state);

-- =========================
-- EMBEDDING SYSTEM INDEXES
-- =========================

-- Main embeddings table indexes
CREATE INDEX IF NOT EXISTS idx_embeddings_content_type_id ON embeddings(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_status ON embeddings(status);
CREATE INDEX IF NOT EXISTS idx_embeddings_content_hash ON embeddings(content_hash);

-- Vector indexes for similarity search (E5-Small 384d)
CREATE INDEX IF NOT EXISTS idx_embeddings_e5_small 
ON embeddings USING ivfflat (embedding_e5_small vector_cosine_ops) WITH (lists = 100)
WHERE embedding_e5_small IS NOT NULL;

-- Vector indexes for BGE-M3 (1024d)
CREATE INDEX IF NOT EXISTS idx_embeddings_bge_m3 
ON embeddings USING ivfflat (embedding_bge_m3 vector_cosine_ops) WITH (lists = 100)
WHERE embedding_bge_m3 IS NOT NULL;

-- Legacy embedding index
CREATE INDEX IF NOT EXISTS idx_embeddings_vector
ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
WHERE embedding IS NOT NULL;

-- Embedding availability flags
CREATE INDEX IF NOT EXISTS idx_embeddings_has_e5 ON embeddings (has_e5_embedding) WHERE has_e5_embedding = true;
CREATE INDEX IF NOT EXISTS idx_embeddings_has_bge ON embeddings (has_bge_embedding) WHERE has_bge_embedding = true;

-- Composite index for dual embedding queries
CREATE INDEX IF NOT EXISTS idx_embeddings_dual_flags ON embeddings (has_e5_embedding, has_bge_embedding, status, content_type);

-- Embedding queue indexes
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON embedding_queue(status);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_priority ON embedding_queue(priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_content ON embedding_queue(content_type, content_id);

-- Embedding searches indexes
CREATE INDEX IF NOT EXISTS idx_embedding_searches_user_id ON embedding_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_embedding_searches_created_at ON embedding_searches(created_at DESC);

-- Vector index for E5 query embeddings
CREATE INDEX IF NOT EXISTS idx_embedding_searches_e5
ON embedding_searches USING ivfflat (query_embedding vector_cosine_ops) WITH (lists = 50)
WHERE query_embedding IS NOT NULL;

-- Vector index for BGE query embeddings
CREATE INDEX IF NOT EXISTS idx_embedding_searches_bge 
ON embedding_searches USING ivfflat (query_embedding_bge vector_cosine_ops) WITH (lists = 50)
WHERE query_embedding_bge IS NOT NULL;

-- =========================
-- VIDEO PROCESSING INDEXES
-- =========================

-- Video embeddings indexes
CREATE INDEX IF NOT EXISTS idx_video_embeddings_attachment_id ON video_embeddings(attachment_id);
CREATE INDEX IF NOT EXISTS idx_video_embeddings_content_type ON video_embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_video_embeddings_status ON video_embeddings(status);

-- Video segment specific indexes
CREATE INDEX IF NOT EXISTS idx_video_embeddings_attachment_segments 
ON video_embeddings (attachment_id, segment_index) 
WHERE segment_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_video_embeddings_time_range 
ON video_embeddings (attachment_id, segment_start_time, segment_end_time) 
WHERE segment_start_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_video_embeddings_chunk_type_segment 
ON video_embeddings (chunk_type, attachment_id) 
WHERE chunk_type = 'segment';

-- Video embeddings dual vector indexes
CREATE INDEX IF NOT EXISTS idx_video_embeddings_e5_small 
ON video_embeddings USING ivfflat (embedding_e5_small vector_cosine_ops) WITH (lists = 100)
WHERE embedding_e5_small IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_video_embeddings_bge_m3 
ON video_embeddings USING ivfflat (embedding_bge_m3 vector_cosine_ops) WITH (lists = 100)
WHERE embedding_bge_m3 IS NOT NULL;

-- Topic and content type filtering
CREATE INDEX IF NOT EXISTS idx_video_embeddings_topic_keywords 
ON video_embeddings USING GIN (topic_keywords);

CREATE INDEX IF NOT EXISTS idx_video_embeddings_content_flags 
ON video_embeddings (contains_code, contains_math, contains_diagram) 
WHERE contains_code = true OR contains_math = true OR contains_diagram = true;

-- Video processing queue indexes
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_attachment_id ON video_processing_queue(attachment_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_user_id ON video_processing_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_status ON video_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_current_step ON video_processing_queue(current_step);
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_created_at ON video_processing_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_video_processing_steps_queue_id ON video_processing_steps(queue_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_steps_step_name ON video_processing_steps(step_name);
CREATE INDEX IF NOT EXISTS idx_video_processing_steps_status ON video_processing_steps(status);

-- =========================
-- CLASSROOM SYSTEM INDEXES
-- =========================

CREATE INDEX IF NOT EXISTS idx_classroom_owner_id ON classroom(owner_id);
CREATE INDEX IF NOT EXISTS idx_classroom_class_code ON classroom(class_code);
CREATE INDEX IF NOT EXISTS idx_classroom_status ON classroom(status);

CREATE INDEX IF NOT EXISTS idx_classroom_member_classroom_id ON classroom_member(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_member_user_id ON classroom_member(user_id);
CREATE INDEX IF NOT EXISTS idx_classroom_member_role ON classroom_member(role);

CREATE INDEX IF NOT EXISTS idx_classroom_live_session_classroom_id ON classroom_live_session(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_live_session_status ON classroom_live_session(status);
CREATE INDEX IF NOT EXISTS idx_classroom_live_session_scheduled_start ON classroom_live_session(scheduled_start);

CREATE INDEX IF NOT EXISTS idx_classroom_attendance_session_id ON classroom_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_classroom_attendance_user_id ON classroom_attendance(user_id);

-- =========================
-- COMMUNITY SYSTEM INDEXES
-- =========================

CREATE INDEX IF NOT EXISTS idx_community_group_slug ON community_group(slug);
CREATE INDEX IF NOT EXISTS idx_community_group_owner_id ON community_group(owner_id);
CREATE INDEX IF NOT EXISTS idx_community_group_visibility ON community_group(visibility);

CREATE INDEX IF NOT EXISTS idx_community_group_member_group_id ON community_group_member(group_id);
CREATE INDEX IF NOT EXISTS idx_community_group_member_user_id ON community_group_member(user_id);

CREATE INDEX IF NOT EXISTS idx_community_post_group_id ON community_post(group_id);
CREATE INDEX IF NOT EXISTS idx_community_post_author_id ON community_post(author_id);
CREATE INDEX IF NOT EXISTS idx_community_post_created_at ON community_post(created_at DESC);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_community_post_search ON community_post USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_hashtags_search ON hashtags USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_community_comment_post_id ON community_comment(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comment_author_id ON community_comment(author_id);
CREATE INDEX IF NOT EXISTS idx_community_comment_parent_id ON community_comment(parent_id);

CREATE INDEX IF NOT EXISTS idx_community_reaction_target ON community_reaction(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_community_reaction_user_id ON community_reaction(user_id);

-- =========================
-- QUIZ SYSTEM INDEXES
-- =========================

-- Community quiz indexes
CREATE INDEX IF NOT EXISTS idx_community_quiz_author_id ON community_quiz(author_id);
CREATE INDEX IF NOT EXISTS idx_community_quiz_slug ON community_quiz(slug);
CREATE INDEX IF NOT EXISTS idx_community_quiz_visibility ON community_quiz(visibility);
CREATE INDEX IF NOT EXISTS idx_community_quiz_tags ON community_quiz USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_community_quiz_attempt_quiz_id ON community_quiz_attempt(quiz_id);
CREATE INDEX IF NOT EXISTS idx_community_quiz_attempt_user_id ON community_quiz_attempt(user_id);
CREATE INDEX IF NOT EXISTS idx_community_quiz_attempt_status ON community_quiz_attempt(status);

-- Quiz session indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_session_user_active
ON community_quiz_attempt_session(user_id, quiz_id)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_quiz_session_status ON community_quiz_attempt_session(status);
CREATE INDEX IF NOT EXISTS idx_quiz_session_expires ON community_quiz_attempt_session(expires_at) 
WHERE expires_at IS NOT NULL;

-- Course quiz indexes
CREATE INDEX IF NOT EXISTS idx_course_quiz_question_lesson_id ON course_quiz_question(lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_quiz_submission_user_id ON course_quiz_submission(user_id);
CREATE INDEX IF NOT EXISTS idx_course_quiz_submission_lesson_id ON course_quiz_submission(lesson_id);

-- =========================
-- NOTIFICATION SYSTEM INDEXES
-- =========================

CREATE INDEX IF NOT EXISTS idx_notification_categories_name ON notification_categories(name);
CREATE INDEX IF NOT EXISTS idx_notification_templates_category_id ON notification_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_key ON notification_templates(template_key);

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_category_id ON user_notification_preferences(category_id);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_notification_id ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_method ON notification_delivery_log(delivery_method);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_status ON notification_delivery_log(status);

-- =========================
-- AUDIT AND REPORTING INDEXES
-- =========================

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_reporter_id ON report(reporter_id);
CREATE INDEX IF NOT EXISTS idx_report_subject ON report(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_report_status ON report(status);

CREATE INDEX IF NOT EXISTS idx_ban_user_id ON ban(user_id);
CREATE INDEX IF NOT EXISTS idx_ban_expires_at ON ban(expires_at);

-- =========================
-- PERFORMANCE INDEXES
-- =========================

-- Common composite indexes for frequently joined tables
CREATE INDEX IF NOT EXISTS idx_course_enrollment_course_user ON course_enrollment(course_id, user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_user_lesson ON course_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- Timestamps for pagination and sorting
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_created_at ON course(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_post_created_at_desc ON community_post(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comment_created_at ON community_comment(created_at DESC);
