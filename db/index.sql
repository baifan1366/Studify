

-- =========================
-- Indexes and Full-Text Search
-- =========================

-- Profiles
create index if not exists idx_profiles_user_id on profiles (user_id);
create index if not exists idx_profiles_role on profiles (role);
create index if not exists idx_profiles_status on profiles (status);
create index if not exists idx_profiles_created_at on profiles (created_at);
alter table if exists profiles
  add column if not exists search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(display_name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(bio,'')), 'B')
  ) stored;
create index if not exists gin_profiles_search on profiles using gin (search_tsv);

-- Notifications
create index if not exists idx_notifications_user_id on notifications (user_id);
create index if not exists idx_notifications_is_read on notifications (is_read);
create index if not exists idx_notifications_created_at on notifications (created_at);

-- Audit log
create index if not exists idx_audit_log_actor_id on audit_log (actor_id);
create index if not exists idx_audit_log_subject on audit_log (subject_type, subject_id);
create index if not exists idx_audit_log_created_at on audit_log (created_at);

-- Checkins
create index if not exists idx_checkins_user_id on checkins (user_id);
create index if not exists idx_checkins_created_at on checkins (created_at);

-- Report/Action/Ban
create index if not exists idx_report_reporter_id on report (reporter_id);
create index if not exists idx_report_subject on report (subject_type, subject_id);
create index if not exists idx_report_status on report (status);
create index if not exists idx_action_report_id on action (report_id);
create index if not exists idx_action_actor_id on action (actor_id);
create index if not exists idx_ban_user_id on ban (user_id);
create index if not exists idx_ban_expires_at on ban (expires_at);

-- AI
create index if not exists idx_ai_agent_owner_id on ai_agent (owner_id);
alter table if exists ai_agent
  add column if not exists search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(purpose,'')), 'B')
  ) stored;
create index if not exists gin_ai_agent_search on ai_agent using gin (search_tsv);

create index if not exists idx_ai_run_agent_id on ai_run (agent_id);
create index if not exists idx_ai_run_requester_id on ai_run (requester_id);
create index if not exists idx_ai_run_status on ai_run (status);
create index if not exists idx_ai_run_created_at on ai_run (created_at);

-- Courses domain
create index if not exists idx_course_owner_id on course (owner_id);
create index if not exists idx_course_created_at on course (created_at);
alter table if exists course
  add column if not exists search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(tags,' '),'')), 'C')
  ) stored;
create index if not exists gin_course_search on course using gin (search_tsv);
-- Optional trigram for fast ILIKE on title
create index if not exists trgm_course_title on course using gin (title gin_trgm_ops);

create index if not exists idx_classroom_live_session_course_id on classroom_live_session (course_id);
create index if not exists idx_classroom_live_session_host_id on classroom_live_session (host_id);
create index if not exists idx_classroom_live_session_starts_at on classroom_live_session (starts_at);

create index if not exists idx_course_module_course_id on course_module (course_id);
alter table if exists course_module
  add column if not exists search_tsv tsvector generated always as (
    to_tsvector('simple', coalesce(title,''))
  ) stored;
create index if not exists gin_course_module_search on course_module using gin (search_tsv);

create index if not exists idx_course_lesson_course_id on course_lesson (course_id);
create index if not exists idx_course_lesson_module_id on course_lesson (module_id);
create index if not exists idx_course_lesson_live_session_id on course_lesson (live_session_id);
alter table if exists course_lesson
  add column if not exists search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A')
  ) stored;
create index if not exists gin_course_lesson_search on course_lesson using gin (search_tsv);

create index if not exists idx_course_enrollment_course_id on course_enrollment (course_id);
create index if not exists idx_course_enrollment_user_id on course_enrollment (user_id);
create index if not exists idx_course_enrollment_status on course_enrollment (status);

create index if not exists idx_course_progress_user_id on course_progress (user_id);
create index if not exists idx_course_progress_lesson_id on course_progress (lesson_id);
create index if not exists idx_course_progress_state on course_progress (state);

create index if not exists idx_course_reviews_course_id on course_reviews (course_id);
create index if not exists idx_course_reviews_user_id on course_reviews (user_id);
alter table if exists course_reviews
  add column if not exists search_tsv tsvector generated always as (
    to_tsvector('simple', coalesce(comment,''))
  ) stored;
create index if not exists gin_course_reviews_search on course_reviews using gin (search_tsv);

create index if not exists idx_course_product_kind on course_product (kind);
create index if not exists idx_course_product_ref_id on course_product (ref_id);
create index if not exists idx_course_product_is_active on course_product (is_active);

create index if not exists idx_course_order_buyer_id on course_order (buyer_id);
create index if not exists idx_course_order_status on course_order (status);
create index if not exists idx_course_order_created_at on course_order (created_at);

create index if not exists idx_course_order_item_order_id on course_order_item (order_id);
create index if not exists idx_course_order_item_product_id on course_order_item (product_id);

create index if not exists idx_course_payment_order_id on course_payment (order_id);
create index if not exists idx_course_payment_status on course_payment (status);

-- Classroom
create index if not exists idx_classroom_attendance_session_id on classroom_attendance (session_id);
create index if not exists idx_classroom_attendance_user_id on classroom_attendance (user_id);

create index if not exists idx_classroom_chat_message_session_id on classroom_chat_message (session_id);
create index if not exists idx_classroom_chat_message_sender_id on classroom_chat_message (sender_id);
alter table if exists classroom_chat_message
  add column if not exists search_tsv tsvector generated always as (
    to_tsvector('simple', coalesce(message,''))
  ) stored;
create index if not exists gin_classroom_chat_message_search on classroom_chat_message using gin (search_tsv);

create index if not exists idx_classroom_whiteboard_session_session_id on classroom_whiteboard_session (session_id);
create index if not exists idx_classroom_whiteboard_event_wb_id on classroom_whiteboard_event (wb_id);
create index if not exists idx_classroom_whiteboard_event_actor_id on classroom_whiteboard_event (actor_id);

create index if not exists idx_classroom_recording_session_id on classroom_recording (session_id);

create index if not exists idx_classroom_question_bank_owner_id on classroom_question_bank (owner_id);
alter table if exists classroom_question_bank
  add column if not exists search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(topic_tags,' '),'')), 'B')
  ) stored;
create index if not exists gin_classroom_question_bank_search on classroom_question_bank using gin (search_tsv);

create index if not exists idx_classroom_question_bank_id on classroom_question (bank_id);
alter table if exists classroom_question
  add column if not exists search_tsv tsvector generated always as (
    to_tsvector('simple', coalesce(stem,''))
  ) stored;
create index if not exists gin_classroom_question_search on classroom_question using gin (search_tsv);

create index if not exists idx_classroom_quiz_course_id on classroom_quiz (course_id);
alter table if exists classroom_quiz
  add column if not exists search_tsv tsvector generated always as (
    to_tsvector('simple', coalesce(title,''))
  ) stored;
create index if not exists gin_classroom_quiz_search on classroom_quiz using gin (search_tsv);

create index if not exists idx_classroom_quiz_question_quiz_id on classroom_quiz_question (quiz_id);
create index if not exists idx_classroom_quiz_question_question_id on classroom_quiz_question (question_id);

create index if not exists idx_classroom_attempt_quiz_id on classroom_attempt (quiz_id);
create index if not exists idx_classroom_attempt_user_id on classroom_attempt (user_id);

create index if not exists idx_classroom_answer_attempt_id on classroom_answer (attempt_id);
create index if not exists idx_classroom_answer_question_id on classroom_answer (question_id);

create index if not exists idx_classroom_assignment_course_id on classroom_assignment (course_id);
alter table if exists classroom_assignment
  add column if not exists search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description,'')), 'B')
  ) stored;
create index if not exists gin_classroom_assignment_search on classroom_assignment using gin (search_tsv);

create index if not exists idx_classroom_submission_assignment_id on classroom_submission (assignment_id);
create index if not exists idx_classroom_submission_user_id on classroom_submission (user_id);
alter table if exists classroom_submission
  add column if not exists search_tsv tsvector generated always as (
    to_tsvector('simple', coalesce(text_content,''))
  ) stored;
create index if not exists gin_classroom_submission_search on classroom_submission using gin (search_tsv);

create index if not exists idx_classroom_grade_assignment_id on classroom_grade (assignment_id);
create index if not exists idx_classroom_grade_user_id on classroom_grade (user_id);
create index if not exists idx_classroom_grade_grader_id on classroom_grade (grader_id);

-- Community
alter table if exists community_group
  add column if not exists search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description,'')), 'B')
  ) stored;
create index if not exists gin_community_group_search on community_group using gin (search_tsv);

create index if not exists idx_community_group_member_group_id on community_group_member (group_id);
create index if not exists idx_community_group_member_user_id on community_group_member (user_id);

create index if not exists idx_community_post_group_id on community_post (group_id);
create index if not exists idx_community_post_author_id on community_post (author_id);
alter table if exists community_post
  add column if not exists search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(body,'')), 'B')
  ) stored;
create index if not exists gin_community_post_search on community_post using gin (search_tsv);
-- Also trigram on title for ILIKE
create index if not exists trgm_community_post_title on community_post using gin (title gin_trgm_ops);

create index if not exists idx_community_comment_post_id on community_comment (post_id);
create index if not exists idx_community_comment_author_id on community_comment (author_id);
alter table if exists community_comment
  add column if not exists search_tsv tsvector generated always as (
    to_tsvector('simple', coalesce(body,''))
  ) stored;
create index if not exists gin_community_comment_search on community_comment using gin (search_tsv);

create index if not exists idx_community_reaction_post_id on community_reaction (post_id);
create index if not exists idx_community_reaction_user_id on community_reaction (user_id);

create index if not exists idx_community_points_user_id on community_points_ledger (user_id);

create index if not exists idx_community_user_achievement_user_id on community_user_achievement (user_id);
create index if not exists idx_community_user_achievement_ach_id on community_user_achievement (achievement_id);

create index if not exists idx_community_challenge_results_user_id on community_challenge_results (user_id);
create index if not exists idx_community_challenge_results_challenge_id on community_challenge_results (challenge_id);

-- Tutoring
create index if not exists idx_tutoring_tutors_user_id on tutoring_tutors (user_id);
alter table if exists tutoring_tutors
  add column if not exists search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(headline,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(qualifications,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(subjects,' '),'')), 'B')
  ) stored;
create index if not exists gin_tutoring_tutors_search on tutoring_tutors using gin (search_tsv);

create index if not exists idx_tutoring_students_user_id on tutoring_students (user_id);

create index if not exists idx_tutoring_availability_tutor_id on tutoring_availability (tutor_id);
create index if not exists idx_tutoring_availability_start_at on tutoring_availability (start_at);

create index if not exists idx_tutoring_appointments_tutor_id on tutoring_appointments (tutor_id);
create index if not exists idx_tutoring_appointments_student_id on tutoring_appointments (student_id);
create index if not exists idx_tutoring_appointments_scheduled_at on tutoring_appointments (scheduled_at);

create index if not exists idx_tutoring_file_owner_id on tutoring_file (owner_id);
alter table if exists tutoring_file
  add column if not exists search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(path,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(mime_type,'')), 'C')
  ) stored;
create index if not exists gin_tutoring_file_search on tutoring_file using gin (search_tsv);

create index if not exists idx_tutoring_note_owner_id on tutoring_note (owner_id);
alter table if exists tutoring_note
  add column if not exists search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(body,'')), 'B')
  ) stored;
create index if not exists gin_tutoring_note_search on tutoring_note using gin (search_tsv);

create index if not exists idx_tutoring_share_shared_with on tutoring_share (shared_with);

-- Helpful ILIKE support for names
create index if not exists trgm_profiles_display_name on profiles using gin (display_name gin_trgm_ops);



-- 为帖子评论表添加索引
CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS post_comments_user_id_idx ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS post_comments_created_at_idx ON post_comments(created_at);
-- 为帖子表添加索引
CREATE INDEX IF NOT EXISTS posts_classroom_id_idx ON posts(classroom_id);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at);
-- 为消息表添加索引
CREATE INDEX IF NOT EXISTS messages_classroom_id_idx ON messages(classroom_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);

create index if not exists idx_milestone_path on classroom.milestone(path_id);
create index if not exists idx_milestone_order on classroom.milestone(path_id, order_index);

create index if not exists idx_learning_path_user on classroom.learning_path(user_id);

create index if not exists idx_mistake_user on classroom.mistake_book(user_id);
create index if not exists idx_mistake_assignment on classroom.mistake_book(assignment_id);