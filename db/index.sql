-- ============================================================================
-- 基于数据库使用分析的优化索引 (Generated: 2025-10-01)
-- 分析基础: 100/142 表被使用，profiles(238次), course(66次), classroom(61次) 等为高频表
-- 新增索引专注于: 复合查询、WHERE条件、JOIN优化
-- ============================================================================

CREATE UNIQUE INDEX community_quiz_question_pkey ON public.community_quiz_question USING btree (id);

CREATE UNIQUE INDEX community_quiz_question_quiz_id_slug_key ON public.community_quiz_question USING btree (quiz_id, slug);

CREATE INDEX idx_community_quiz_question_search_vector ON public.community_quiz_question USING gin (search_vector);

CREATE INDEX idx_community_quiz_question_quiz_id ON public.community_quiz_question USING btree (quiz_id);

CREATE INDEX idx_community_quiz_question_slug ON public.community_quiz_question USING btree (slug);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id);

CREATE UNIQUE INDEX checkins_pkey ON public.checkins USING btree (id);

CREATE UNIQUE INDEX report_pkey ON public.report USING btree (id);

CREATE UNIQUE INDEX ai_workflow_executions_pkey ON public.ai_workflow_executions USING btree (id);

CREATE UNIQUE INDEX ai_workflow_executions_session_id_key ON public.ai_workflow_executions USING btree (session_id);

CREATE INDEX idx_ai_workflow_executions_session_id ON public.ai_workflow_executions USING btree (session_id);

CREATE INDEX idx_ai_workflow_executions_user_id ON public.ai_workflow_executions USING btree (user_id);

CREATE INDEX idx_ai_workflow_executions_workflow_id ON public.ai_workflow_executions USING btree (workflow_id);

CREATE INDEX idx_ai_workflow_executions_status ON public.ai_workflow_executions USING btree (status);

CREATE INDEX idx_ai_workflow_executions_created_at ON public.ai_workflow_executions USING btree (created_at);

CREATE UNIQUE INDEX ai_agent_pkey ON public.ai_agent USING btree (id);

CREATE INDEX idx_ai_agent_search_vector ON public.ai_agent USING gin (search_vector);

CREATE UNIQUE INDEX ai_run_pkey ON public.ai_run USING btree (id);

CREATE UNIQUE INDEX course_quiz_submission_pkey ON public.course_quiz_submission USING btree (id);

CREATE UNIQUE INDEX course_quiz_submission_user_id_question_id_attempt_number_key ON public.course_quiz_submission USING btree (user_id, question_id, attempt_number);

CREATE UNIQUE INDEX api_error_log_pkey ON public.api_error_log USING btree (id);

CREATE INDEX idx_api_error_log_key_name ON public.api_error_log USING btree (key_name);

CREATE INDEX idx_api_error_log_error_type ON public.api_error_log USING btree (error_type);

CREATE INDEX idx_api_error_log_created_at ON public.api_error_log USING btree (created_at);

CREATE UNIQUE INDEX course_module_pkey ON public.course_module USING btree (id);

CREATE INDEX idx_course_concept_course ON public.course_concept USING btree (course_id) WHERE (is_deleted = false);

CREATE UNIQUE INDEX course_concept_pkey ON public.course_concept USING btree (id);

CREATE UNIQUE INDEX chat_attachments_pkey ON public.chat_attachments USING btree (id);

CREATE INDEX idx_chat_attachments_uploader_id ON public.chat_attachments USING btree (uploader_id);

CREATE INDEX idx_chat_attachments_created_at ON public.chat_attachments USING btree (created_at);

CREATE INDEX idx_chat_attachments_mime_type ON public.chat_attachments USING btree (mime_type);

CREATE UNIQUE INDEX course_lesson_pkey ON public.course_lesson USING btree (id);

CREATE INDEX idx_course_lesson_position ON public.course_lesson USING btree (course_id, "position") WHERE (is_deleted = false);

CREATE INDEX idx_course_lesson_search_vector ON public.course_lesson USING gin (search_vector);

CREATE UNIQUE INDEX course_reviews_pkey ON public.course_reviews USING btree (id);

CREATE UNIQUE INDEX course_reviews_course_id_user_id_key ON public.course_reviews USING btree (course_id, user_id);

CREATE INDEX idx_course_reviews_search_vector ON public.course_reviews USING gin (search_vector);

CREATE UNIQUE INDEX course_enrollment_pkey ON public.course_enrollment USING btree (id);

CREATE UNIQUE INDEX course_enrollment_course_id_user_id_key ON public.course_enrollment USING btree (course_id, user_id);

CREATE UNIQUE INDEX course_concept_link_pkey ON public.course_concept_link USING btree (id);

CREATE UNIQUE INDEX course_concept_link_source_concept_id_target_concept_id_rel_key ON public.course_concept_link USING btree (source_concept_id, target_concept_id, relation_type);

CREATE INDEX idx_ai_workflow_templates_search_vector ON public.ai_workflow_templates USING gin (search_vector);

CREATE UNIQUE INDEX ai_workflow_templates_pkey ON public.ai_workflow_templates USING btree (id);

CREATE INDEX idx_ai_workflow_templates_owner_id ON public.ai_workflow_templates USING btree (owner_id);

CREATE INDEX idx_ai_workflow_templates_visibility ON public.ai_workflow_templates USING btree (visibility);

CREATE INDEX idx_ai_workflow_templates_category ON public.ai_workflow_templates USING btree (category);

CREATE INDEX idx_ai_workflow_templates_tags ON public.ai_workflow_templates USING gin (tags);

CREATE UNIQUE INDEX course_order_pkey ON public.course_order USING btree (id);

CREATE UNIQUE INDEX course_order_item_pkey ON public.course_order_item USING btree (id);

CREATE UNIQUE INDEX course_concept_lesson_pkey ON public.course_concept_lesson USING btree (id);

CREATE UNIQUE INDEX course_concept_lesson_concept_id_lesson_id_key ON public.course_concept_lesson USING btree (concept_id, lesson_id);

CREATE INDEX idx_course_discussion_course ON public.course_discussion USING btree (course_id) WHERE (is_deleted = false);

CREATE UNIQUE INDEX course_discussion_pkey ON public.course_discussion USING btree (id);

CREATE UNIQUE INDEX course_discussion_reply_pkey ON public.course_discussion_reply USING btree (id);

CREATE UNIQUE INDEX course_product_pkey ON public.course_product USING btree (id);

CREATE UNIQUE INDEX ai_usage_stats_pkey ON public.ai_usage_stats USING btree (id);

CREATE UNIQUE INDEX ai_usage_stats_date_api_key_name_model_name_key ON public.ai_usage_stats USING btree (date, api_key_name, model_name);

CREATE INDEX idx_ai_usage_stats_date ON public.ai_usage_stats USING btree (date);

CREATE INDEX idx_ai_usage_stats_api_key ON public.ai_usage_stats USING btree (api_key_name);

CREATE INDEX idx_ai_usage_stats_model ON public.ai_usage_stats USING btree (model_name);

CREATE INDEX idx_community_quiz_search_vector ON public.community_quiz USING gin (search_vector);

CREATE UNIQUE INDEX community_quiz_pkey ON public.community_quiz USING btree (id);

CREATE UNIQUE INDEX community_quiz_slug_key ON public.community_quiz USING btree (slug);

CREATE INDEX idx_community_quiz_subject_id ON public.community_quiz USING btree (subject_id);

CREATE INDEX idx_community_quiz_grade_id ON public.community_quiz USING btree (grade_id);

CREATE INDEX idx_community_quiz_search_vector_en ON public.community_quiz USING gin (search_vector_en);

CREATE INDEX idx_community_quiz_search_vector_zh ON public.community_quiz USING gin (search_vector_zh);

CREATE INDEX idx_community_quiz_subject_grade ON public.community_quiz USING btree (subject_id, grade_id);

CREATE INDEX idx_community_quiz_difficulty_subject ON public.community_quiz USING btree (difficulty, subject_id);

CREATE INDEX idx_community_quiz_visibility_subject_grade ON public.community_quiz USING btree (visibility, subject_id, grade_id) WHERE (is_deleted = false);

CREATE UNIQUE INDEX course_progress_pkey ON public.course_progress USING btree (id);

CREATE UNIQUE INDEX course_progress_user_id_lesson_id_key ON public.course_progress USING btree (user_id, lesson_id);

CREATE INDEX idx_course_progress_user_course ON public.course_progress USING btree (user_id, lesson_id);

CREATE INDEX idx_course_progress_continue_watching ON public.course_progress USING btree (user_id, is_continue_watching, last_accessed_at DESC) WHERE ((is_continue_watching = true) AND (is_deleted = false));

CREATE INDEX idx_course_progress_user_lesson ON public.course_progress USING btree (user_id, lesson_id) WHERE (is_deleted = false);

CREATE INDEX classroom_attachments_owner_id_idx ON public.classroom_attachments USING btree (owner_id);

CREATE INDEX classroom_attachments_is_deleted_idx ON public.classroom_attachments USING btree (is_deleted);

CREATE UNIQUE INDEX idx_classroom_attachments_public_id ON public.classroom_attachments USING btree (public_id);

CREATE INDEX idx_classroom_attachments_classroom_id ON public.classroom_attachments USING btree (context_id);

CREATE INDEX idx_classroom_attachments_uploader_id ON public.classroom_attachments USING btree (owner_id);

CREATE UNIQUE INDEX classroom_attachments_pkey ON public.classroom_attachments USING btree (id);

CREATE INDEX classroom_attachments_context_type_context_id_idx ON public.classroom_attachments USING btree (context_type, context_id);

CREATE UNIQUE INDEX course_attachments_pkey ON public.course_attachments USING btree (id);

CREATE UNIQUE INDEX community_user_achievement_pkey ON public.community_user_achievement USING btree (id);

CREATE UNIQUE INDEX unique_user_achievement ON public.community_user_achievement USING btree (user_id, achievement_id);

CREATE UNIQUE INDEX community_quiz_like_pkey ON public.community_quiz_like USING btree (id);

CREATE UNIQUE INDEX community_quiz_like_quiz_id_user_id_key ON public.community_quiz_like USING btree (quiz_id, user_id);

CREATE UNIQUE INDEX community_quiz_attempt_answer_pkey ON public.community_quiz_attempt_answer USING btree (id);

CREATE UNIQUE INDEX action_pkey ON public.action USING btree (id);

CREATE UNIQUE INDEX course_payment_pkey ON public.course_payment USING btree (id);

CREATE UNIQUE INDEX course_certificate_pkey ON public.course_certificate USING btree (id);

CREATE UNIQUE INDEX course_certificate_user_id_course_id_key ON public.course_certificate USING btree (user_id, course_id);

CREATE INDEX idx_course_analytics_user_course ON public.course_analytics USING btree (user_id, course_id, "timestamp");

CREATE UNIQUE INDEX course_analytics_pkey ON public.course_analytics USING btree (id);

CREATE INDEX idx_community_quiz_attempt_user_quiz ON public.community_quiz_attempt USING btree (user_id, quiz_id, created_at DESC);

CREATE UNIQUE INDEX community_quiz_attempt_pkey ON public.community_quiz_attempt USING btree (id);

CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id);

CREATE UNIQUE INDEX role_permission_pkey ON public.role_permission USING btree (id);

CREATE UNIQUE INDEX permissions_pkey ON public.permissions USING btree (id);

CREATE UNIQUE INDEX admin_roles_pkey ON public.admin_roles USING btree (id);

CREATE UNIQUE INDEX community_comment_pkey ON public.community_comment USING btree (id);

CREATE INDEX idx_community_comment_author_post ON public.community_comment USING btree (author_id, post_id, created_at) WHERE (is_deleted = false);

CREATE UNIQUE INDEX community_comment_public_id_key ON public.community_comment USING btree (public_id);

CREATE INDEX idx_community_comment_search_vector ON public.community_comment USING gin (search_vector);

CREATE UNIQUE INDEX video_embeddings_pkey ON public.video_embeddings USING btree (id);

CREATE INDEX idx_video_embeddings_chunk_type_segment ON public.video_embeddings USING btree (chunk_type, attachment_id) WHERE (chunk_type = 'segment'::text);

CREATE INDEX idx_video_embeddings_attachment_segments ON public.video_embeddings USING btree (attachment_id, segment_index) WHERE (segment_index IS NOT NULL);

CREATE INDEX idx_video_embeddings_time_range ON public.video_embeddings USING btree (attachment_id, segment_start_time, segment_end_time) WHERE (segment_start_time IS NOT NULL);

CREATE INDEX idx_video_embeddings_topic_keywords ON public.video_embeddings USING gin (topic_keywords);

CREATE INDEX idx_video_embeddings_e5_small ON public.video_embeddings USING ivfflat (embedding_e5_small vector_cosine_ops);

CREATE INDEX idx_video_embeddings_bge_m3 ON public.video_embeddings USING ivfflat (embedding_bge_m3 vector_cosine_ops);

CREATE INDEX idx_video_embeddings_has_e5 ON public.video_embeddings USING btree (has_e5_embedding) WHERE (has_e5_embedding = true);

CREATE INDEX idx_video_embeddings_has_bge ON public.video_embeddings USING btree (has_bge_embedding) WHERE (has_bge_embedding = true);

CREATE INDEX idx_video_embeddings_content_flags ON public.video_embeddings USING btree (contains_code, contains_math, contains_diagram) WHERE ((contains_code = true) OR (contains_math = true) OR (contains_diagram = true));

CREATE INDEX idx_video_embeddings_rag_query ON public.video_embeddings USING btree (attachment_id, chunk_type, has_e5_embedding, has_bge_embedding, status) WHERE ((status = 'completed'::text) AND (is_deleted = false));

CREATE UNIQUE INDEX community_reaction_pkey ON public.community_reaction USING btree (id);

CREATE UNIQUE INDEX community_reaction_target_type_target_id_user_id_emoji_key ON public.community_reaction USING btree (target_type, target_id, user_id, emoji);

CREATE INDEX idx_community_reaction_user_target ON public.community_reaction USING btree (user_id, target_type, target_id, created_at);

CREATE UNIQUE INDEX community_points_ledger_pkey ON public.community_points_ledger USING btree (id);

CREATE UNIQUE INDEX community_achievement_pkey ON public.community_achievement USING btree (id);

CREATE UNIQUE INDEX community_achievement_code_key ON public.community_achievement USING btree (code);

CREATE UNIQUE INDEX community_quiz_subject_pkey ON public.community_quiz_subject USING btree (id);

CREATE UNIQUE INDEX community_quiz_subject_code_key ON public.community_quiz_subject USING btree (code);

CREATE INDEX idx_community_quiz_subject_code ON public.community_quiz_subject USING btree (code);

CREATE INDEX idx_community_quiz_subject_translations ON public.community_quiz_subject USING gin (translations);

CREATE UNIQUE INDEX tutoring_tutors_pkey ON public.tutoring_tutors USING btree (id);

CREATE INDEX idx_tutoring_tutors_search_vector ON public.tutoring_tutors USING gin (search_vector);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id);

CREATE INDEX idx_profiles_onesignal_player_id ON public.profiles USING btree (onesignal_player_id);

CREATE INDEX idx_profiles_onesignal_external_id ON public.profiles USING btree (onesignal_external_id);

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);

CREATE INDEX idx_profiles_status ON public.profiles USING btree (status);

CREATE INDEX idx_profiles_points ON public.profiles USING btree (points);

CREATE INDEX idx_profiles_created_at ON public.profiles USING btree (created_at);

CREATE INDEX idx_profiles_last_login ON public.profiles USING btree (last_login);

CREATE INDEX idx_profiles_preferences ON public.profiles USING gin (preferences);

CREATE INDEX idx_profiles_notification_settings ON public.profiles USING gin (notification_settings);

CREATE INDEX idx_profiles_privacy_settings ON public.profiles USING gin (privacy_settings);

CREATE INDEX idx_profiles_totp_secret ON public.profiles USING btree (totp_secret) WHERE (totp_secret IS NOT NULL);

CREATE INDEX idx_profiles_two_factor_enabled ON public.profiles USING btree (two_factor_enabled) WHERE (two_factor_enabled = true);

CREATE INDEX idx_profiles_currency ON public.profiles USING btree (currency);

CREATE INDEX idx_profiles_search_vector ON public.profiles USING gin (search_vector);

CREATE UNIQUE INDEX tutoring_students_pkey ON public.tutoring_students USING btree (id);

CREATE UNIQUE INDEX tutoring_availability_pkey ON public.tutoring_availability USING btree (id);

CREATE UNIQUE INDEX tutoring_appointments_pkey ON public.tutoring_appointments USING btree (id);

CREATE INDEX idx_tutoring_note_search_vector ON public.tutoring_note USING gin (search_vector);

CREATE UNIQUE INDEX tutoring_note_pkey ON public.tutoring_note USING btree (id);

CREATE INDEX idx_community_quiz_grade_translations ON public.community_quiz_grade USING gin (translations);

CREATE UNIQUE INDEX community_quiz_grade_pkey ON public.community_quiz_grade USING btree (id);

CREATE UNIQUE INDEX community_quiz_grade_code_key ON public.community_quiz_grade USING btree (code);

CREATE INDEX idx_community_quiz_grade_code ON public.community_quiz_grade USING btree (code);

CREATE UNIQUE INDEX tutoring_file_pkey ON public.tutoring_file USING btree (id);

CREATE UNIQUE INDEX tutoring_share_pkey ON public.tutoring_share USING btree (id);

CREATE UNIQUE INDEX community_post_files_pkey ON public.community_post_files USING btree (id);

CREATE UNIQUE INDEX embedding_queue_pkey ON public.embedding_queue USING btree (id);

CREATE UNIQUE INDEX embedding_queue_content_type_content_id_key ON public.embedding_queue USING btree (content_type, content_id);

CREATE INDEX idx_embedding_queue_status_priority ON public.embedding_queue USING btree (status, priority, scheduled_at);

CREATE INDEX idx_embedding_queue_content ON public.embedding_queue USING btree (content_type, content_id);

CREATE INDEX idx_course_chapter_search_vector ON public.course_chapter USING gin (search_vector);

CREATE UNIQUE INDEX course_chapter_pkey ON public.course_chapter USING btree (id);

CREATE UNIQUE INDEX embedding_searches_pkey ON public.embedding_searches USING btree (id);

CREATE INDEX idx_embedding_searches_user ON public.embedding_searches USING btree (user_id, created_at);

CREATE INDEX idx_embedding_searches_query ON public.embedding_searches USING gin (to_tsvector('english'::regconfig, query_text));

CREATE UNIQUE INDEX community_checkin_pkey ON public.community_checkin USING btree (id);

CREATE UNIQUE INDEX community_checkin_user_id_checkin_date_key ON public.community_checkin USING btree (user_id, checkin_date);

CREATE UNIQUE INDEX classroom_live_session_pkey ON public.classroom_live_session USING btree (id);

CREATE INDEX idx_classroom_live_session_search_vector ON public.classroom_live_session USING gin (search_vector);

CREATE UNIQUE INDEX classroom_pkey ON public.classroom USING btree (id);

CREATE UNIQUE INDEX classroom_slug_key ON public.classroom USING btree (slug);

CREATE UNIQUE INDEX classroom_class_code_key ON public.classroom USING btree (class_code);

CREATE INDEX idx_classroom_search_vector ON public.classroom USING gin (search_vector);

CREATE UNIQUE INDEX notification_categories_pkey ON public.notification_categories USING btree (id);

CREATE UNIQUE INDEX notification_categories_name_key ON public.notification_categories USING btree (name);

CREATE UNIQUE INDEX classroom_member_pkey ON public.classroom_member USING btree (id);

CREATE UNIQUE INDEX classroom_member_classroom_id_user_id_key ON public.classroom_member USING btree (classroom_id, user_id);

CREATE UNIQUE INDEX notification_templates_pkey ON public.notification_templates USING btree (id);

CREATE UNIQUE INDEX notification_templates_name_key ON public.notification_templates USING btree (name);

CREATE UNIQUE INDEX embeddings_pkey ON public.embeddings USING btree (id);

CREATE UNIQUE INDEX embeddings_content_type_content_id_key ON public.embeddings USING btree (content_type, content_id);

CREATE INDEX idx_embeddings_vector ON public.embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');

CREATE INDEX idx_embeddings_content ON public.embeddings USING btree (content_type, content_id);

CREATE INDEX idx_embeddings_status ON public.embeddings USING btree (status);

CREATE INDEX idx_embeddings_hash ON public.embeddings USING btree (content_hash);

CREATE INDEX idx_embeddings_chunk_type ON public.embeddings USING btree (chunk_type) WHERE (chunk_type IS NOT NULL);

CREATE INDEX idx_embeddings_hierarchy ON public.embeddings USING btree (hierarchy_level, chunk_type);

CREATE INDEX idx_embeddings_parent ON public.embeddings USING btree (parent_chunk_id) WHERE (parent_chunk_id IS NOT NULL);

CREATE INDEX idx_embeddings_section ON public.embeddings USING btree (section_title) WHERE (section_title IS NOT NULL);

CREATE INDEX idx_embeddings_semantic_density ON public.embeddings USING btree (semantic_density) WHERE (semantic_density IS NOT NULL);

CREATE INDEX idx_embeddings_language ON public.embeddings USING btree (chunk_language);

CREATE INDEX idx_embeddings_content_features ON public.embeddings USING btree (has_code_block, has_table, has_list);

CREATE INDEX idx_embeddings_content_hierarchy ON public.embeddings USING btree (content_type, content_id, hierarchy_level, chunk_type);

CREATE INDEX idx_embeddings_key_terms ON public.embeddings USING gin (key_terms) WHERE (key_terms IS NOT NULL);

CREATE INDEX idx_classroom_assignment_search_vector ON public.classroom_assignment USING gin (search_vector);

CREATE UNIQUE INDEX classroom_assignment_pkey ON public.classroom_assignment USING btree (id);

CREATE UNIQUE INDEX classroom_submission_pkey ON public.classroom_submission USING btree (id);

CREATE UNIQUE INDEX classroom_submission_assignment_id_student_id_key ON public.classroom_submission USING btree (assignment_id, student_id);

CREATE UNIQUE INDEX plagiarism_report_pkey ON public.plagiarism_report USING btree (id);

CREATE UNIQUE INDEX classroom_attendance_pkey ON public.classroom_attendance USING btree (id);

CREATE UNIQUE INDEX classroom_attendance_session_id_user_id_key ON public.classroom_attendance USING btree (session_id, user_id);

CREATE UNIQUE INDEX classroom_chat_message_attachment_id_key ON public.classroom_chat_message USING btree (attachment_id);

CREATE UNIQUE INDEX classroom_chat_message_pkey ON public.classroom_chat_message USING btree (id);

CREATE UNIQUE INDEX user_notification_preferences_pkey ON public.user_notification_preferences USING btree (id);

CREATE UNIQUE INDEX user_notification_preferences_user_id_category_id_key ON public.user_notification_preferences USING btree (user_id, category_id);

CREATE UNIQUE INDEX classroom_whiteboard_session_pkey ON public.classroom_whiteboard_session USING btree (id);

CREATE UNIQUE INDEX classroom_whiteboard_event_pkey ON public.classroom_whiteboard_event USING btree (id);

CREATE UNIQUE INDEX classroom_recording_pkey ON public.classroom_recording USING btree (id);

CREATE UNIQUE INDEX classroom_question_bank_pkey ON public.classroom_question_bank USING btree (id);

CREATE UNIQUE INDEX classroom_question_pkey ON public.classroom_question USING btree (id);

CREATE UNIQUE INDEX document_hierarchy_pkey ON public.document_hierarchy USING btree (id);

CREATE UNIQUE INDEX document_hierarchy_content_type_content_id_key ON public.document_hierarchy USING btree (content_type, content_id);

CREATE INDEX idx_document_hierarchy_content ON public.document_hierarchy USING btree (content_type, content_id);

CREATE INDEX idx_document_hierarchy_summary ON public.document_hierarchy USING btree (summary_embedding_id) WHERE (summary_embedding_id IS NOT NULL);

CREATE UNIQUE INDEX course_point_price_pkey ON public.course_point_price USING btree (id);

CREATE UNIQUE INDEX course_point_price_course_id_key ON public.course_point_price USING btree (course_id);

CREATE INDEX idx_course_point_price_course_id ON public.course_point_price USING btree (course_id) WHERE (is_active = true);

CREATE UNIQUE INDEX classroom_quiz_question_pkey ON public.classroom_quiz_question USING btree (id);

CREATE UNIQUE INDEX classroom_quiz_question_quiz_id_question_id_key ON public.classroom_quiz_question USING btree (quiz_id, question_id);

CREATE UNIQUE INDEX classroom_attempt_pkey ON public.classroom_attempt USING btree (id);

CREATE UNIQUE INDEX classroom_quiz_pkey ON public.classroom_quiz USING btree (id);

CREATE UNIQUE INDEX classroom_answer_pkey ON public.classroom_answer USING btree (id);

CREATE UNIQUE INDEX classroom_answer_attempt_id_question_id_key ON public.classroom_answer USING btree (attempt_id, question_id);

CREATE UNIQUE INDEX classroom_grade_pkey ON public.classroom_grade USING btree (id);

CREATE UNIQUE INDEX classroom_grade_assignment_id_user_id_key ON public.classroom_grade USING btree (assignment_id, user_id);

CREATE UNIQUE INDEX point_redemption_pkey ON public.point_redemption USING btree (id);

CREATE INDEX idx_point_redemption_user_id ON public.point_redemption USING btree (user_id);

CREATE INDEX idx_classroom_posts_search_vector ON public.classroom_posts USING gin (search_vector);

CREATE UNIQUE INDEX classroom_posts_pkey ON public.classroom_posts USING btree (id);

CREATE INDEX idx_mistake_book_search_vector ON public.mistake_book USING gin (search_vector);

CREATE UNIQUE INDEX mistake_book_pkey ON public.mistake_book USING btree (id);

CREATE INDEX idx_mistake_book_source_type ON public.mistake_book USING btree (source_type);

CREATE INDEX idx_mistake_book_user_source ON public.mistake_book USING btree (user_id, source_type);

CREATE UNIQUE INDEX community_comment_files_pkey ON public.community_comment_files USING btree (id);

CREATE UNIQUE INDEX hashtags_pkey ON public.hashtags USING btree (id);

CREATE UNIQUE INDEX hashtags_name_key ON public.hashtags USING btree (name);

CREATE INDEX idx_hashtags_search ON public.hashtags USING gin (search_vector);

CREATE UNIQUE INDEX learning_path_pkey ON public.learning_path USING btree (id);

CREATE UNIQUE INDEX milestone_pkey ON public.milestone USING btree (id);

CREATE UNIQUE INDEX post_hashtags_pkey ON public.post_hashtags USING btree (post_id, hashtag_id);

CREATE UNIQUE INDEX study_session_pkey ON public.study_session USING btree (id);

CREATE INDEX idx_study_session_user_date ON public.study_session USING btree (user_id, session_start);

CREATE INDEX idx_learning_goal_search_vector ON public.learning_goal USING gin (search_vector);

CREATE UNIQUE INDEX learning_goal_pkey ON public.learning_goal USING btree (id);

CREATE INDEX idx_learning_goal_user_status ON public.learning_goal USING btree (user_id, status);

CREATE UNIQUE INDEX classroom_post_comments_pkey ON public.classroom_post_comments USING btree (id);

CREATE UNIQUE INDEX classroom_post_reactions_pkey ON public.classroom_post_reactions USING btree (id);

CREATE UNIQUE INDEX classroom_post_reactions_post_id_user_id_reaction_type_key ON public.classroom_post_reactions USING btree (post_id, user_id, reaction_type);

CREATE UNIQUE INDEX classroom_engagement_report_pkey ON public.classroom_engagement_report USING btree (id);

CREATE UNIQUE INDEX learning_statistics_pkey ON public.learning_statistics USING btree (id);

CREATE UNIQUE INDEX learning_statistics_user_id_stat_date_key ON public.learning_statistics USING btree (user_id, stat_date);

CREATE INDEX idx_learning_statistics_user_date ON public.learning_statistics USING btree (user_id, stat_date);

CREATE UNIQUE INDEX video_processing_queue_pkey ON public.video_processing_queue USING btree (id);

CREATE INDEX idx_video_processing_queue_attachment_id ON public.video_processing_queue USING btree (attachment_id);

CREATE INDEX idx_video_processing_queue_user_id ON public.video_processing_queue USING btree (user_id);

CREATE INDEX idx_video_processing_queue_status ON public.video_processing_queue USING btree (status);

CREATE INDEX idx_video_processing_queue_current_step ON public.video_processing_queue USING btree (current_step);

CREATE INDEX idx_video_processing_queue_created_at ON public.video_processing_queue USING btree (created_at);

CREATE INDEX idx_video_processing_queue_qstash_message_id ON public.video_processing_queue USING btree (qstash_message_id);

CREATE UNIQUE INDEX video_processing_steps_pkey ON public.video_processing_steps USING btree (id);

CREATE INDEX idx_video_processing_steps_queue_id ON public.video_processing_steps USING btree (queue_id);

CREATE INDEX idx_video_processing_steps_step_name ON public.video_processing_steps USING btree (step_name);

CREATE INDEX idx_video_processing_steps_status ON public.video_processing_steps USING btree (status);

CREATE UNIQUE INDEX video_danmaku_pkey ON public.video_danmaku USING btree (id);

CREATE INDEX idx_video_danmaku_lesson_time ON public.video_danmaku USING btree (lesson_id, video_time_sec) WHERE (is_deleted = false);

CREATE INDEX idx_video_danmaku_user ON public.video_danmaku USING btree (user_id) WHERE (is_deleted = false);

CREATE UNIQUE INDEX video_likes_pkey ON public.video_likes USING btree (id);

CREATE UNIQUE INDEX video_likes_user_id_lesson_id_key ON public.video_likes USING btree (user_id, lesson_id);

CREATE INDEX idx_video_likes_user_lesson ON public.video_likes USING btree (user_id, lesson_id);

CREATE INDEX idx_video_likes_lesson ON public.video_likes USING btree (lesson_id) WHERE (is_deleted = false);

CREATE UNIQUE INDEX video_views_pkey ON public.video_views USING btree (id);

CREATE UNIQUE INDEX video_views_user_id_lesson_id_session_start_time_key ON public.video_views USING btree (user_id, lesson_id, session_start_time);

CREATE INDEX idx_video_views_user_lesson ON public.video_views USING btree (user_id, lesson_id);

CREATE INDEX idx_video_views_lesson ON public.video_views USING btree (lesson_id) WHERE (is_deleted = false);

CREATE INDEX idx_course_quiz_lesson ON public.course_quiz_question USING btree (lesson_id) WHERE (is_deleted = false);

CREATE UNIQUE INDEX course_quiz_question_pkey ON public.course_quiz_question USING btree (id);

CREATE INDEX idx_course_quiz_question_search_vector ON public.course_quiz_question USING gin (search_vector);

CREATE UNIQUE INDEX community_quiz_permission_pkey ON public.community_quiz_permission USING btree (id);

CREATE UNIQUE INDEX uq_cqp_quiz_user ON public.community_quiz_permission USING btree (quiz_id, user_id);

CREATE UNIQUE INDEX community_quiz_invite_token_pkey ON public.community_quiz_invite_token USING btree (id);

CREATE UNIQUE INDEX community_quiz_invite_token_token_key ON public.community_quiz_invite_token USING btree (token);

CREATE UNIQUE INDEX currencies_pkey ON public.currencies USING btree (id);

CREATE UNIQUE INDEX currencies_code_key ON public.currencies USING btree (code);

CREATE UNIQUE INDEX community_quiz_attempt_session_pkey ON public.community_quiz_attempt_session USING btree (id);

CREATE UNIQUE INDEX community_quiz_attempt_session_session_token_key ON public.community_quiz_attempt_session USING btree (session_token);

CREATE UNIQUE INDEX community_quiz_attempt_session_attempt_id_key ON public.community_quiz_attempt_session USING btree (attempt_id);

CREATE UNIQUE INDEX learning_paths_pkey ON public.learning_paths USING btree (id);

CREATE INDEX idx_learning_paths_user_id ON public.learning_paths USING btree (user_id);

CREATE INDEX idx_learning_paths_active ON public.learning_paths USING btree (user_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_learning_paths_created_at ON public.learning_paths USING btree (created_at DESC);

CREATE UNIQUE INDEX password_reset_tokens_pkey ON public.password_reset_tokens USING btree (id);

CREATE UNIQUE INDEX password_reset_tokens_token_hash_key ON public.password_reset_tokens USING btree (token_hash);

CREATE INDEX idx_password_reset_tokens_hash ON public.password_reset_tokens USING btree (token_hash);

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);

CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens USING btree (expires_at);

CREATE UNIQUE INDEX message_read_status_pkey ON public.message_read_status USING btree (id);

CREATE UNIQUE INDEX unique_read_status ON public.message_read_status USING btree (message_id, user_id);

CREATE INDEX idx_message_read_status_message_id ON public.message_read_status USING btree (message_id);

CREATE INDEX idx_message_read_status_user_id ON public.message_read_status USING btree (user_id);

CREATE UNIQUE INDEX mfa_attempts_pkey ON public.mfa_attempts USING btree (id);

CREATE INDEX idx_mfa_attempts_user_id_created_at ON public.mfa_attempts USING btree (user_id, created_at);

CREATE INDEX idx_mfa_attempts_ip_created_at ON public.mfa_attempts USING btree (ip_address, created_at);

CREATE UNIQUE INDEX direct_conversations_pkey ON public.direct_conversations USING btree (id);

CREATE UNIQUE INDEX unique_conversation ON public.direct_conversations USING btree (participant1_id, participant2_id);

CREATE INDEX idx_direct_conversations_participants ON public.direct_conversations USING btree (participant1_id, participant2_id);

CREATE INDEX idx_direct_conversations_updated_at ON public.direct_conversations USING btree (updated_at DESC);

CREATE UNIQUE INDEX tutor_stripe_accounts_pkey ON public.tutor_stripe_accounts USING btree (id);

CREATE UNIQUE INDEX tutor_stripe_accounts_stripe_account_id_key ON public.tutor_stripe_accounts USING btree (stripe_account_id);

CREATE INDEX idx_tutor_stripe_accounts_tutor_id ON public.tutor_stripe_accounts USING btree (tutor_id) WHERE (is_deleted = false);

CREATE INDEX idx_tutor_stripe_accounts_stripe_id ON public.tutor_stripe_accounts USING btree (stripe_account_id) WHERE (is_deleted = false);

CREATE UNIQUE INDEX tutor_earnings_pkey ON public.tutor_earnings USING btree (id);

CREATE INDEX idx_tutor_earnings_tutor_id ON public.tutor_earnings USING btree (tutor_id) WHERE (is_deleted = false);

CREATE INDEX idx_tutor_earnings_status ON public.tutor_earnings USING btree (status) WHERE (is_deleted = false);

CREATE INDEX idx_tutor_earnings_source ON public.tutor_earnings USING btree (source_type, source_id) WHERE (is_deleted = false);

CREATE INDEX idx_tutor_earnings_release_date ON public.tutor_earnings USING btree (release_date) WHERE (is_deleted = false);

CREATE UNIQUE INDEX tutor_payouts_pkey ON public.tutor_payouts USING btree (id);

CREATE UNIQUE INDEX tutor_payouts_stripe_payout_id_key ON public.tutor_payouts USING btree (stripe_payout_id);

CREATE INDEX idx_tutor_payouts_tutor_id ON public.tutor_payouts USING btree (tutor_id) WHERE (is_deleted = false);

CREATE INDEX idx_tutor_payouts_status ON public.tutor_payouts USING btree (status) WHERE (is_deleted = false);

CREATE UNIQUE INDEX tutor_earnings_summary_pkey ON public.tutor_earnings_summary USING btree (id);

CREATE UNIQUE INDEX tutor_earnings_summary_tutor_id_key ON public.tutor_earnings_summary USING btree (tutor_id);

CREATE INDEX idx_course_notes_user_lesson ON public.course_notes USING btree (user_id, lesson_id) WHERE (is_deleted = false);

CREATE UNIQUE INDEX course_notes_pkey ON public.course_notes USING btree (id);

CREATE INDEX idx_course_notes_note_type ON public.course_notes USING btree (note_type);

CREATE INDEX idx_course_notes_user_type ON public.course_notes USING btree (user_id, note_type);

CREATE INDEX idx_course_notes_course_id ON public.course_notes USING btree (course_id);

CREATE INDEX idx_course_notes_search_vector ON public.course_notes USING gin (search_vector);

CREATE UNIQUE INDEX community_group_member_pkey ON public.community_group_member USING btree (id);

CREATE UNIQUE INDEX community_group_member_group_id_user_id_key ON public.community_group_member USING btree (group_id, user_id);

CREATE INDEX idx_community_group_member_user_group ON public.community_group_member USING btree (user_id, group_id) WHERE (is_deleted = false);

CREATE UNIQUE INDEX community_post_pkey ON public.community_post USING btree (id);

CREATE UNIQUE INDEX post_slug_unique ON public.community_post USING btree (group_id, slug);

CREATE INDEX idx_community_post_author_created ON public.community_post USING btree (author_id, created_at) WHERE (is_deleted = false);

CREATE UNIQUE INDEX community_post_public_id_unique ON public.community_post USING btree (public_id);

CREATE INDEX idx_community_post_search ON public.community_post USING gin (search_vector);

CREATE INDEX idx_community_post_group_created ON public.community_post USING btree (group_id, created_at) WHERE (is_deleted = false);

CREATE UNIQUE INDEX notification_delivery_log_pkey ON public.notification_delivery_log USING btree (id);

CREATE INDEX idx_notification_delivery_log_notification_id ON public.notification_delivery_log USING btree (notification_id);

CREATE INDEX idx_notification_delivery_log_status ON public.notification_delivery_log USING btree (delivery_status);

CREATE INDEX idx_notification_delivery_log_onesignal_id ON public.notification_delivery_log USING btree (onesignal_notification_id);

CREATE UNIQUE INDEX ban_pkey ON public.ban USING btree (id);

CREATE UNIQUE INDEX group_conversations_pkey ON public.group_conversations USING btree (id);

CREATE INDEX idx_group_conversations_created_by ON public.group_conversations USING btree (created_by);

CREATE INDEX idx_group_conversations_created_at ON public.group_conversations USING btree (created_at DESC);

CREATE INDEX idx_group_conversations_is_deleted ON public.group_conversations USING btree (is_deleted) WHERE (is_deleted = false);

CREATE UNIQUE INDEX group_message_read_status_pkey ON public.group_message_read_status USING btree (id);

CREATE UNIQUE INDEX group_message_read_status_message_id_user_id_key ON public.group_message_read_status USING btree (message_id, user_id);

CREATE INDEX idx_group_message_read_status_message_id ON public.group_message_read_status USING btree (message_id);

CREATE INDEX idx_group_message_read_status_user_id ON public.group_message_read_status USING btree (user_id);

CREATE UNIQUE INDEX conversation_settings_pkey ON public.conversation_settings USING btree (id);

CREATE UNIQUE INDEX unique_conversation_settings ON public.conversation_settings USING btree (conversation_id, user_id);

CREATE INDEX idx_conversation_settings_user_id ON public.conversation_settings USING btree (user_id);

CREATE INDEX idx_conversation_settings_conversation_id ON public.conversation_settings USING btree (conversation_id);

CREATE UNIQUE INDEX group_members_pkey ON public.group_members USING btree (id);

CREATE UNIQUE INDEX group_members_conversation_id_user_id_key ON public.group_members USING btree (conversation_id, user_id);

CREATE INDEX idx_group_members_conversation_id ON public.group_members USING btree (conversation_id);

CREATE INDEX idx_group_members_user_id ON public.group_members USING btree (user_id);

CREATE INDEX idx_group_members_active ON public.group_members USING btree (conversation_id, user_id) WHERE (left_at IS NULL);

CREATE UNIQUE INDEX community_group_pkey ON public.community_group USING btree (id);

CREATE UNIQUE INDEX community_group_slug_key ON public.community_group USING btree (slug);

CREATE UNIQUE INDEX community_group_public_id_key ON public.community_group USING btree (public_id);

CREATE INDEX idx_community_group_search_vector ON public.community_group USING gin (search_vector);

CREATE UNIQUE INDEX direct_messages_pkey ON public.direct_messages USING btree (id);

CREATE INDEX idx_direct_messages_conversation_id ON public.direct_messages USING btree (conversation_id);

CREATE INDEX idx_direct_messages_sender_id ON public.direct_messages USING btree (sender_id);

CREATE INDEX idx_direct_messages_created_at ON public.direct_messages USING btree (created_at DESC);

CREATE INDEX idx_direct_messages_conversation_created ON public.direct_messages USING btree (conversation_id, created_at DESC);

CREATE UNIQUE INDEX group_messages_pkey ON public.group_messages USING btree (id);

CREATE INDEX idx_group_messages_conversation_id ON public.group_messages USING btree (conversation_id);

CREATE INDEX idx_group_messages_sender_id ON public.group_messages USING btree (sender_id);

CREATE INDEX idx_group_messages_created_at ON public.group_messages USING btree (conversation_id, created_at DESC);

CREATE INDEX idx_group_messages_not_deleted ON public.group_messages USING btree (conversation_id, created_at DESC) WHERE (is_deleted = false);

CREATE UNIQUE INDEX video_comment_likes_pkey ON public.video_comment_likes USING btree (id);

CREATE UNIQUE INDEX video_comment_likes_user_id_comment_id_key ON public.video_comment_likes USING btree (user_id, comment_id);

CREATE INDEX idx_video_comment_likes_comment ON public.video_comment_likes USING btree (comment_id);

CREATE INDEX idx_video_comment_likes_user ON public.video_comment_likes USING btree (user_id);

CREATE UNIQUE INDEX video_comments_pkey ON public.video_comments USING btree (id);

CREATE INDEX idx_video_comments_parent ON public.video_comments USING btree (parent_id) WHERE (parent_id IS NOT NULL);

CREATE INDEX idx_video_comments_lesson ON public.video_comments USING btree (lesson_id) WHERE (is_deleted = false);

CREATE INDEX idx_video_comments_user ON public.video_comments USING btree (user_id) WHERE (is_deleted = false);

CREATE INDEX idx_video_comments_created ON public.video_comments USING btree (created_at DESC) WHERE (is_deleted = false);

CREATE UNIQUE INDEX learning_retrospectives_pkey ON public.learning_retrospectives USING btree (id);

CREATE INDEX idx_learning_retros_user_date ON public.learning_retrospectives USING btree (user_id, retro_date DESC);

CREATE UNIQUE INDEX coach_notifications_pkey ON public.coach_notifications USING btree (id);

CREATE INDEX idx_coach_notifications_user_scheduled ON public.coach_notifications USING btree (user_id, scheduled_at);

CREATE INDEX idx_coach_notifications_status ON public.coach_notifications USING btree (status, scheduled_at);

CREATE UNIQUE INDEX coach_settings_pkey ON public.coach_settings USING btree (id);

CREATE UNIQUE INDEX coach_settings_user_id_key ON public.coach_settings USING btree (user_id);

CREATE UNIQUE INDEX daily_learning_plans_pkey ON public.daily_learning_plans USING btree (id);

CREATE UNIQUE INDEX daily_learning_plans_user_id_plan_date_key ON public.daily_learning_plans USING btree (user_id, plan_date);

CREATE INDEX idx_daily_plans_user_date ON public.daily_learning_plans USING btree (user_id, plan_date DESC);

CREATE INDEX idx_daily_plans_status ON public.daily_learning_plans USING btree (status);

CREATE UNIQUE INDEX daily_plan_tasks_pkey ON public.daily_plan_tasks USING btree (id);

CREATE INDEX idx_daily_plan_tasks_plan_id ON public.daily_plan_tasks USING btree (plan_id);

CREATE INDEX idx_daily_plan_tasks_completion ON public.daily_plan_tasks USING btree (is_completed, "position");

CREATE UNIQUE INDEX video_qa_history_pkey ON public.video_qa_history USING btree (id);

CREATE INDEX idx_video_qa_history_user_lesson ON public.video_qa_history USING btree (user_id, lesson_id) WHERE (is_deleted = false);

CREATE INDEX idx_video_qa_history_created_at ON public.video_qa_history USING btree (created_at DESC) WHERE (is_deleted = false);

CREATE UNIQUE INDEX video_segments_pkey ON public.video_segments USING btree (id);

CREATE INDEX idx_video_segments_lesson_time ON public.video_segments USING btree (lesson_id, start_time, end_time);

CREATE INDEX idx_video_segments_time_range ON public.video_segments USING gist (numrange(start_time, end_time));

CREATE UNIQUE INDEX video_terms_cache_pkey ON public.video_terms_cache USING btree (id);

CREATE INDEX idx_video_terms_cache_lesson_time ON public.video_terms_cache USING btree (lesson_id, time_window_start, time_window_end);

CREATE INDEX idx_video_terms_cache_expires ON public.video_terms_cache USING btree (expires_at);

CREATE UNIQUE INDEX announcements_pkey ON public.announcements USING btree (id);

CREATE INDEX idx_announcements_search_vector ON public.announcements USING gin (search_vector);

CREATE UNIQUE INDEX course_pkey ON public.course USING btree (id);

CREATE INDEX idx_course_visibility_not_deleted ON public.course USING btree (visibility) WHERE (is_deleted = false);

CREATE INDEX idx_course_public_id ON public.course USING btree (public_id);

CREATE UNIQUE INDEX course_slug_key ON public.course USING btree (slug);

CREATE INDEX idx_course_slug ON public.course USING btree (slug) WHERE (is_deleted = false);

CREATE INDEX idx_course_search_vector ON public.course USING gin (search_vector);
-- ============================================================================
-- 新增优化索引 - 基于使用频率分析
-- ============================================================================

-- profiles 表优化 (238次使用 - 最高频)
CREATE INDEX IF NOT EXISTS idx_profiles_user_role_status ON public.profiles USING btree (user_id, role, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON public.profiles USING btree (email) WHERE email_verified = true;

-- course 表优化 (66次使用)
CREATE INDEX IF NOT EXISTS idx_course_owner_status ON public.course USING btree (owner_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_course_visibility_status ON public.course USING btree (visibility, status) WHERE is_deleted = false;

-- classroom 表优化 (61次使用)
CREATE INDEX IF NOT EXISTS idx_classroom_owner_visibility ON public.classroom USING btree (owner_id, visibility);
CREATE INDEX IF NOT EXISTS idx_classroom_created_at ON public.classroom USING btree (created_at DESC);

-- community_post 表优化 (55次使用)
CREATE INDEX IF NOT EXISTS idx_community_post_author_group ON public.community_post USING btree (author_id, group_id) WHERE is_deleted = false;

-- video_processing_queue 表优化 (43次使用)
CREATE INDEX IF NOT EXISTS idx_video_queue_status_created ON public.video_processing_queue USING btree (status, created_at);
CREATE INDEX IF NOT EXISTS idx_video_queue_attachment_status ON public.video_processing_queue USING btree (attachment_id, status);

-- classroom_member 表优化 (41次使用)
CREATE INDEX IF NOT EXISTS idx_classroom_member_user_role ON public.classroom_member USING btree (user_id, role);

-- course_enrollment 表优化 (33次使用)
CREATE INDEX IF NOT EXISTS idx_course_enrollment_user_status ON public.course_enrollment USING btree (user_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_enrollment_course_role ON public.course_enrollment USING btree (course_id, role) WHERE status = 'active';

-- community_reaction 表优化 (24次使用)
CREATE INDEX IF NOT EXISTS idx_reaction_target ON public.community_reaction USING btree (target_type, target_id, created_at DESC);

-- classroom_live_session 表优化 (23次使用)
CREATE INDEX IF NOT EXISTS idx_classroom_live_status ON public.classroom_live_session USING btree (classroom_id, status, starts_at DESC) WHERE is_deleted = false;

-- Optimize status-based queries with time filtering
CREATE INDEX IF NOT EXISTS idx_live_session_status_time_precise 
ON classroom_live_session(status, starts_at, ends_at) 
WHERE is_deleted = FALSE;

-- Optimize queries for sessions about to start (within next hour)
CREATE INDEX IF NOT EXISTS idx_live_session_upcoming 
ON classroom_live_session(starts_at) 
WHERE status = 'scheduled' AND is_deleted = FALSE;

-- Optimize queries for active sessions that might end soon
CREATE INDEX IF NOT EXISTS idx_live_session_active_ending 
ON classroom_live_session(ends_at) 
WHERE status = 'active' AND ends_at IS NOT NULL AND is_deleted = FALSE;
