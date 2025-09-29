|CREATE TABLE public.action (
    id bigint DEFAULT nextval('action_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    report_id bigint,
    actor_id bigint,
    action text NOT NULL,
    notes text,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.admin_roles (
    id bigint DEFAULT nextval('admin_roles_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    role_permission_id bigint NOT NULL,
    user_id bigint NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.ai_agent (
    id bigint DEFAULT nextval('ai_agent_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    owner_id bigint,
    purpose text,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    search_vector tsvector
);


CREATE TABLE public.ai_run (
    id bigint DEFAULT nextval('ai_run_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    agent_id bigint NOT NULL,
    requester_id bigint,
    input jsonb NOT NULL,
    output jsonb,
    status text DEFAULT 'queued'::text NOT NULL,
    reviewed_by bigint,
    reviewed_at timestamp with time zone,
    review_note text,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.ai_usage_stats (
    id bigint DEFAULT nextval('ai_usage_stats_id_seq'::regclass) NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    api_key_name text NOT NULL,
    model_name text NOT NULL,
    total_requests integer DEFAULT 0,
    successful_requests integer DEFAULT 0,
    failed_requests integer DEFAULT 0,
    total_tokens integer DEFAULT 0,
    avg_response_time_ms integer DEFAULT 0,
    min_response_time_ms integer DEFAULT 0,
    max_response_time_ms integer DEFAULT 0,
    estimated_cost_usd numeric(10,4) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.ai_workflow_executions (
    id bigint DEFAULT nextval('ai_workflow_executions_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    session_id text NOT NULL,
    workflow_id text NOT NULL,
    user_id bigint,
    status text DEFAULT 'running'::text NOT NULL,
    current_step text,
    completed_steps integer DEFAULT 0,
    total_steps integer NOT NULL,
    step_results jsonb DEFAULT '{}'::jsonb,
    final_result jsonb,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    input_data jsonb NOT NULL,
    execution_time_ms integer,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    deleted_at timestamp with time zone
);


CREATE TABLE public.ai_workflow_templates (
    id bigint DEFAULT nextval('ai_workflow_templates_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    workflow_definition jsonb NOT NULL,
    owner_id bigint,
    visibility text DEFAULT 'private'::text NOT NULL,
    category text,
    tags text[] DEFAULT '{}'::text[],
    usage_count integer DEFAULT 0,
    average_rating numeric(3,2) DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    search_vector tsvector
);


CREATE TABLE public.announcements (
    id bigint DEFAULT nextval('announcements_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    created_by bigint NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    image_url text,
    deep_link text,
    status character varying(20) DEFAULT 'draft'::character varying,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    onesignal_id text,
    onesignal_response jsonb,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    search_vector tsvector
);


CREATE TABLE public.api_error_log (
    id bigint DEFAULT nextval('api_error_log_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    key_name text NOT NULL,
    error_message text NOT NULL,
    error_type text NOT NULL,
    request_data jsonb,
    response_data jsonb,
    http_status integer,
    user_agent text,
    ip_address inet,
    workflow_session_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.audit_log (
    id bigint DEFAULT nextval('audit_log_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    actor_id bigint,
    action text NOT NULL,
    subject_type text,
    subject_id text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.ban (
    id bigint DEFAULT nextval('ban_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    target_id bigint NOT NULL,
    reason text,
    expires_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    target_type text DEFAULT 'user'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL
);


CREATE TABLE public.chat_attachments (
    id bigint DEFAULT nextval('chat_attachments_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    uploader_id bigint NOT NULL,
    file_name text NOT NULL,
    original_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    file_url text NOT NULL,
    storage_path text NOT NULL,
    custom_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.checkins (
    id bigint DEFAULT nextval('checkins_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    checkin_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.classroom (
    id bigint DEFAULT nextval('classroom_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    slug text,
    name text NOT NULL,
    description text,
    class_code text NOT NULL,
    visibility text DEFAULT 'public'::text,
    owner_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    color text,
    search_vector tsvector
);


CREATE TABLE public.classroom_answer (
    id bigint DEFAULT nextval('classroom_answer_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    attempt_id bigint NOT NULL,
    question_id bigint NOT NULL,
    response jsonb,
    is_correct boolean,
    points_awarded numeric(6,2) DEFAULT 0 NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.classroom_assignment (
    id bigint DEFAULT nextval('classroom_assignment_id_seq'::regclass) NOT NULL,
    classroom_id bigint NOT NULL,
    author_id bigint NOT NULL,
    title text NOT NULL,
    description text,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    slug text,
    search_vector tsvector
);


CREATE TABLE public.classroom_attachments (
    id bigint DEFAULT nextval('classroom_attachments_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    owner_id bigint NOT NULL,
    context_type text NOT NULL,
    context_id bigint NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    storage_path text DEFAULT ''::text NOT NULL,
    extension text DEFAULT regexp_replace(file_name, '^.*\\.'::text, ''::text),
    visibility text DEFAULT 'private'::text NOT NULL,
    bucket text NOT NULL,
    path text NOT NULL,
    custom_message text
);


CREATE TABLE public.classroom_attempt (
    id bigint DEFAULT nextval('classroom_attempt_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    quiz_id bigint NOT NULL,
    user_id bigint NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    score numeric(8,2) DEFAULT 0 NOT NULL,
    proctoring_data jsonb,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.classroom_attendance (
    id bigint DEFAULT nextval('classroom_attendance_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    session_id bigint NOT NULL,
    user_id bigint NOT NULL,
    join_at timestamp with time zone,
    leave_at timestamp with time zone,
    status text DEFAULT 'present'::text,
    signed_at timestamp with time zone,
    attention_score numeric(5,2),
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.classroom_chat_message (
    id bigint DEFAULT nextval('classroom_chat_message_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    session_id bigint NOT NULL,
    sender_id bigint NOT NULL,
    message text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    attachment_id bigint
);


CREATE TABLE public.classroom_engagement_report (
    id bigint DEFAULT nextval('classroom_engagement_report_id_seq'::regclass) NOT NULL,
    user_id bigint NOT NULL,
    course_id bigint NOT NULL,
    participation_score numeric(5,2),
    report jsonb,
    generated_at timestamp with time zone DEFAULT now()
);


CREATE TABLE public.classroom_grade (
    id bigint DEFAULT nextval('classroom_grade_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    assignment_id bigint NOT NULL,
    user_id bigint NOT NULL,
    grader_id bigint,
    score numeric(8,2) NOT NULL,
    feedback text,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.classroom_live_session (
    id bigint DEFAULT nextval('classroom_live_session_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    classroom_id bigint NOT NULL,
    title text,
    host_id bigint NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone,
    status text DEFAULT 'scheduled'::text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    slug text,
    search_vector tsvector
);


CREATE TABLE public.classroom_member (
    id bigint DEFAULT nextval('classroom_member_id_seq'::regclass) NOT NULL,
    classroom_id bigint NOT NULL,
    user_id bigint NOT NULL,
    role text DEFAULT 'student'::text,
    permissions jsonb DEFAULT '{}'::jsonb,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    slug text
);


CREATE TABLE public.classroom_post_comments (
    id bigint DEFAULT nextval('classroom_post_comments_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    content text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.classroom_post_reactions (
    id bigint DEFAULT nextval('classroom_post_reactions_id_seq'::regclass) NOT NULL,
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    reaction_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


CREATE TABLE public.classroom_posts (
    id bigint DEFAULT nextval('classroom_posts_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    session_id bigint NOT NULL,
    user_id bigint NOT NULL,
    content text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    search_vector tsvector
);


CREATE TABLE public.classroom_question (
    id bigint DEFAULT nextval('classroom_question_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    bank_id bigint,
    stem text NOT NULL,
    kind text NOT NULL,
    choices jsonb,
    answer jsonb,
    difficulty integer,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.classroom_question_bank (
    id bigint DEFAULT nextval('classroom_question_bank_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    owner_id bigint NOT NULL,
    title text NOT NULL,
    topic_tags text[] DEFAULT '{}'::text[],
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.classroom_quiz (
    id bigint DEFAULT nextval('classroom_quiz_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    classroom_id bigint NOT NULL,
    title text NOT NULL,
    settings jsonb DEFAULT '{"shuffle": true, "time_limit": null}'::jsonb NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    slug text
);


CREATE TABLE public.classroom_quiz_question (
    id bigint DEFAULT nextval('classroom_quiz_question_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    quiz_id bigint NOT NULL,
    question_id bigint NOT NULL,
    points numeric(6,2) DEFAULT 1 NOT NULL,
    position integer DEFAULT 1 NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.classroom_recording (
    id bigint DEFAULT nextval('classroom_recording_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    session_id bigint NOT NULL,
    url text NOT NULL,
    duration_sec integer,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.classroom_submission (
    id bigint DEFAULT nextval('classroom_submission_id_seq'::regclass) NOT NULL,
    assignment_id bigint NOT NULL,
    student_id bigint NOT NULL,
    content text,
    submitted_at timestamp with time zone DEFAULT now(),
    grade numeric,
    feedback text,
    attachments_id bigint
);


CREATE TABLE public.classroom_whiteboard_event (
    id bigint DEFAULT nextval('classroom_whiteboard_event_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    wb_id bigint NOT NULL,
    actor_id bigint,
    kind text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.classroom_whiteboard_session (
    id bigint DEFAULT nextval('classroom_whiteboard_session_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    session_id bigint,
    title text,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.coach_notifications (
    id bigint DEFAULT nextval('coach_notifications_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    notification_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    sent_at timestamp with time zone,
    onesignal_id text,
    related_plan_id bigint,
    related_task_id bigint,
    related_retro_id bigint,
    status text DEFAULT 'scheduled'::text NOT NULL,
    delivery_status text,
    error_message text,
    clicked boolean DEFAULT false,
    clicked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.coach_settings (
    id bigint DEFAULT nextval('coach_settings_id_seq'::regclass) NOT NULL,
    user_id bigint NOT NULL,
    daily_plan_time time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    evening_retro_time time without time zone DEFAULT '20:00:00'::time without time zone NOT NULL,
    preferred_difficulty text DEFAULT 'medium'::text,
    target_daily_minutes integer DEFAULT 60,
    max_daily_tasks integer DEFAULT 8,
    enable_daily_plan boolean DEFAULT true,
    enable_task_reminders boolean DEFAULT true,
    enable_evening_retro boolean DEFAULT true,
    enable_motivation_messages boolean DEFAULT true,
    enable_achievement_celebrations boolean DEFAULT true,
    enable_streak_reminders boolean DEFAULT true,
    coaching_style text DEFAULT 'balanced'::text,
    motivation_type text DEFAULT 'mixed'::text,
    preferred_session_length integer DEFAULT 25,
    break_reminder_interval integer DEFAULT 50,
    timezone text DEFAULT 'Asia/Kuala_Lumpur'::text,
    language text DEFAULT 'en'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.community_achievement (
    id bigint DEFAULT nextval('community_achievement_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    rule jsonb,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.community_checkin (
    id bigint DEFAULT nextval('community_checkin_id_seq'::regclass) NOT NULL,
    user_id bigint NOT NULL,
    checkin_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.community_comment (
    id bigint DEFAULT nextval('community_comment_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    post_id bigint NOT NULL,
    author_id bigint NOT NULL,
    parent_id bigint,
    body text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    search_vector tsvector
);


CREATE TABLE public.community_comment_files (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    comment_id uuid,
    url text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL
);


CREATE TABLE public.community_group (
    id bigint DEFAULT nextval('community_group_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    slug text NOT NULL,
    visibility text DEFAULT 'public'::text,
    owner_id bigint NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    search_vector tsvector
);


CREATE TABLE public.community_group_member (
    id bigint DEFAULT nextval('community_group_member_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    group_id bigint NOT NULL,
    user_id bigint NOT NULL,
    role text DEFAULT 'member'::text,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.community_points_ledger (
    id bigint DEFAULT nextval('community_points_ledger_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    points integer NOT NULL,
    reason text,
    ref jsonb,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.community_post (
    id bigint DEFAULT nextval('community_post_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    group_id bigint,
    author_id bigint NOT NULL,
    title text,
    body text,
    slug text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    search_vector tsvector
);


CREATE TABLE public.community_post_files (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    post_id uuid,
    url text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL
);


CREATE TABLE public.community_quiz (
    id bigint DEFAULT nextval('community_quiz_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    slug text NOT NULL,
    author_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    tags text[],
    difficulty integer,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    max_attempts integer DEFAULT 1 NOT NULL,
    visibility text DEFAULT 'public'::text,
    time_limit_minutes integer,
    subject_id bigint,
    grade_id bigint,
    search_vector_en tsvector,
    search_vector_zh tsvector,
    search_vector tsvector
);


CREATE TABLE public.community_quiz_attempt (
    id bigint DEFAULT nextval('community_quiz_attempt_id_seq'::regclass) NOT NULL,
    quiz_id bigint NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'not_started'::character varying NOT NULL,
    score integer DEFAULT 0 NOT NULL
);


CREATE TABLE public.community_quiz_attempt_answer (
    id bigint DEFAULT nextval('community_quiz_attempt_answer_id_seq'::regclass) NOT NULL,
    attempt_id bigint NOT NULL,
    question_id bigint NOT NULL,
    user_answer text[],
    is_correct boolean
);


CREATE TABLE public.community_quiz_attempt_session (
    id bigint DEFAULT nextval('community_quiz_attempt_session_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    attempt_id bigint NOT NULL,
    quiz_id bigint NOT NULL,
    user_id uuid NOT NULL,
    session_token character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    time_limit_minutes integer,
    time_spent_seconds integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    current_question_index integer DEFAULT 0 NOT NULL,
    total_questions integer NOT NULL,
    browser_info jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.community_quiz_grade (
    id bigint DEFAULT nextval('community_quiz_grade_id_seq'::regclass) NOT NULL,
    code text NOT NULL,
    translations jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.community_quiz_invite_token (
    id bigint DEFAULT nextval('community_quiz_invite_token_id_seq'::regclass) NOT NULL,
    token text NOT NULL,
    quiz_id bigint NOT NULL,
    permission_type text NOT NULL,
    created_by uuid NOT NULL,
    expires_at timestamp with time zone,
    max_uses integer,
    current_uses integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.community_quiz_like (
    id bigint DEFAULT nextval('community_quiz_like_id_seq'::regclass) NOT NULL,
    quiz_id bigint NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.community_quiz_permission (
    id bigint DEFAULT nextval('community_quiz_permission_id_seq'::regclass) NOT NULL,
    quiz_id bigint NOT NULL,
    user_id uuid NOT NULL,
    permission_type text NOT NULL,
    granted_by uuid NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.community_quiz_question (
    id bigint DEFAULT nextval('community_quiz_question_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    quiz_id bigint NOT NULL,
    slug text NOT NULL,
    question_text text NOT NULL,
    options text[],
    correct_answers text[],
    explanation text,
    question_type text DEFAULT 'single_choice'::text NOT NULL,
    search_vector tsvector
);


CREATE TABLE public.community_quiz_subject (
    id bigint DEFAULT nextval('community_quiz_subject_id_seq'::regclass) NOT NULL,
    code text NOT NULL,
    translations jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.community_reaction (
    id bigint DEFAULT nextval('community_reaction_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    target_type text NOT NULL,
    target_id bigint NOT NULL,
    user_id bigint NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.community_user_achievement (
    id bigint DEFAULT nextval('community_user_achievement_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    achievement_id bigint NOT NULL,
    current_value integer DEFAULT 0 NOT NULL,
    unlocked boolean DEFAULT false NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.conversation_settings (
    id bigint DEFAULT nextval('conversation_settings_id_seq'::regclass) NOT NULL,
    conversation_id bigint NOT NULL,
    user_id bigint NOT NULL,
    is_muted boolean DEFAULT false NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    last_read_message_id bigint,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.course (
    id bigint DEFAULT nextval('course_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    owner_id bigint NOT NULL,
    title text NOT NULL,
    description text,
    visibility text DEFAULT 'private'::text NOT NULL,
    price_cents integer DEFAULT 0,
    currency text DEFAULT 'MYR'::text,
    tags text[] DEFAULT '{}'::text[],
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    thumbnail_url text,
    level text DEFAULT 'beginner'::text,
    total_lessons integer DEFAULT 0,
    total_duration_minutes integer DEFAULT 0,
    average_rating numeric(3,2) DEFAULT 0,
    total_students integer DEFAULT 0,
    is_free boolean DEFAULT false NOT NULL,
    slug text,
    video_intro_url text,
    requirements text[],
    learning_objectives text[],
    category text,
    language text DEFAULT 'en'::text,
    certificate_template text,
    auto_create_classroom boolean DEFAULT true,
    auto_create_community boolean DEFAULT true,
    status text DEFAULT 'inactive'::text,
    community_group_public_id uuid,
    search_vector tsvector
);


CREATE TABLE public.course_analytics (
    id bigint DEFAULT nextval('course_analytics_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    course_id bigint NOT NULL,
    lesson_id bigint,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb,
    session_id uuid,
    timestamp timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.course_attachments (
    id bigint DEFAULT nextval('course_attachments_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    owner_id bigint NOT NULL,
    title text NOT NULL,
    size integer,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    url text NOT NULL,
    cloudinary_hls_url text,
    cloudinary_processed_at timestamp with time zone,
    cloudinary_public_id text,
    type text DEFAULT 'other'::text,
    cloudinary_mp3 text
);


CREATE TABLE public.course_certificate (
    id bigint DEFAULT nextval('course_certificate_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    course_id bigint NOT NULL,
    certificate_url text,
    completion_percentage numeric(5,2) NOT NULL,
    final_score numeric(5,2),
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.course_chapter (
    id bigint DEFAULT nextval('course_chapter_id_seq'::regclass) NOT NULL,
    lesson_id bigint NOT NULL,
    title text NOT NULL,
    description text,
    start_time_sec integer,
    end_time_sec integer,
    order_index integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    search_vector tsvector
);


CREATE TABLE public.course_concept (
    id bigint DEFAULT nextval('course_concept_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    course_id bigint NOT NULL,
    name text NOT NULL,
    description text,
    embedding vector(1536),
    difficulty_level integer DEFAULT 1,
    estimated_time_minutes integer DEFAULT 30,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.course_concept_lesson (
    id bigint DEFAULT nextval('course_concept_lesson_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    concept_id bigint NOT NULL,
    lesson_id bigint NOT NULL,
    relevance_score numeric(3,2) DEFAULT 1.0,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.course_concept_link (
    id bigint DEFAULT nextval('course_concept_link_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    source_concept_id bigint NOT NULL,
    target_concept_id bigint NOT NULL,
    relation_type text NOT NULL,
    strength numeric(3,2) DEFAULT 1.0,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.course_discussion (
    id bigint DEFAULT nextval('course_discussion_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    course_id bigint NOT NULL,
    lesson_id bigint,
    author_id bigint NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    is_pinned boolean DEFAULT false,
    is_resolved boolean DEFAULT false,
    view_count integer DEFAULT 0,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.course_discussion_reply (
    id bigint DEFAULT nextval('course_discussion_reply_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    discussion_id bigint NOT NULL,
    author_id bigint NOT NULL,
    parent_reply_id bigint,
    content text NOT NULL,
    is_solution boolean DEFAULT false,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.course_enrollment (
    id bigint DEFAULT nextval('course_enrollment_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    course_id bigint NOT NULL,
    user_id bigint NOT NULL,
    role text DEFAULT 'student'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.course_lesson (
    id bigint DEFAULT nextval('course_lesson_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    course_id bigint NOT NULL,
    module_id bigint,
    title text NOT NULL,
    kind text NOT NULL,
    content_url text,
    duration_sec integer,
    live_session_id bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    slug text,
    position integer DEFAULT 1,
    description text,
    is_preview boolean DEFAULT false,
    transcript text,
    attachments jsonb DEFAULT '[]'::jsonb,
    search_vector tsvector
);


CREATE TABLE public.course_module (
    id bigint DEFAULT nextval('course_module_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    course_id bigint NOT NULL,
    title text NOT NULL,
    position integer DEFAULT 1 NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.course_notes (
    id bigint DEFAULT nextval('course_notes_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    lesson_id bigint,
    timestamp_sec integer,
    content text NOT NULL,
    ai_summary text,
    tags text[] DEFAULT '{}'::text[],
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    title text,
    note_type text DEFAULT 'manual'::text,
    course_id bigint,
    search_vector tsvector
);


CREATE TABLE public.course_order (
    id bigint DEFAULT nextval('course_order_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    buyer_id bigint NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    total_cents integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'MYR'::text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.course_order_item (
    id bigint DEFAULT nextval('course_order_item_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    order_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price_cents integer NOT NULL,
    subtotal_cents integer NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.course_payment (
    id bigint DEFAULT nextval('course_payment_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    order_id bigint NOT NULL,
    provider text NOT NULL,
    provider_ref text,
    amount_cents integer NOT NULL,
    status text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.course_point_price (
    id bigint DEFAULT nextval('course_point_price_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    course_id bigint NOT NULL,
    point_price integer NOT NULL,
    discount_pct numeric(5,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.course_product (
    id bigint DEFAULT nextval('course_product_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    kind text NOT NULL,
    ref_id bigint,
    title text NOT NULL,
    price_cents integer NOT NULL,
    currency text DEFAULT 'MYR'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb
);


CREATE TABLE public.course_progress (
    id bigint DEFAULT nextval('course_progress_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    lesson_id bigint NOT NULL,
    state text DEFAULT 'not_started'::text NOT NULL,
    progress_pct numeric(5,2) DEFAULT 0 NOT NULL,
    last_seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ai_recommendation jsonb DEFAULT '{}'::jsonb,
    time_spent_sec integer DEFAULT 0,
    completion_date timestamp with time zone,
    video_position_sec integer DEFAULT 0,
    video_duration_sec integer DEFAULT 0,
    last_accessed_at timestamp with time zone DEFAULT now(),
    lesson_kind text DEFAULT 'video'::text,
    is_continue_watching boolean DEFAULT false,
    is_deleted boolean DEFAULT false NOT NULL
);


CREATE TABLE public.course_quiz_question (
    id bigint DEFAULT nextval('course_quiz_question_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    lesson_id bigint NOT NULL,
    question_text text NOT NULL,
    question_type text NOT NULL,
    options jsonb,
    correct_answer jsonb NOT NULL,
    explanation text,
    points integer DEFAULT 1,
    difficulty integer DEFAULT 1,
    position integer DEFAULT 1,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    user_id bigint NOT NULL,
    search_vector tsvector
);


CREATE TABLE public.course_quiz_submission (
    id bigint DEFAULT nextval('course_quiz_submission_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    question_id bigint NOT NULL,
    lesson_id bigint NOT NULL,
    user_answer jsonb NOT NULL,
    is_correct boolean NOT NULL,
    points_earned integer DEFAULT 0,
    time_taken_sec integer,
    attempt_number integer DEFAULT 1,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.course_reviews (
    id bigint DEFAULT nextval('course_reviews_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    course_id bigint NOT NULL,
    user_id bigint NOT NULL,
    rating integer NOT NULL,
    comment text,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    search_vector tsvector
);


CREATE TABLE public.currencies (
    id bigint DEFAULT nextval('currencies_id_seq'::regclass) NOT NULL,
    code character(3) NOT NULL,
    name character varying(100),
    country character varying(100),
    symbol character varying(10),
    rate_to_usd numeric(15,6),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.daily_learning_plans (
    id bigint DEFAULT nextval('daily_learning_plans_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    plan_date date NOT NULL,
    plan_title text NOT NULL,
    plan_description text,
    ai_insights text,
    motivation_message text,
    total_tasks integer DEFAULT 0 NOT NULL,
    completed_tasks integer DEFAULT 0 NOT NULL,
    total_points integer DEFAULT 0 NOT NULL,
    earned_points integer DEFAULT 0 NOT NULL,
    estimated_duration_minutes integer DEFAULT 0 NOT NULL,
    actual_duration_minutes integer DEFAULT 0,
    status text DEFAULT 'active'::text NOT NULL,
    completion_rate numeric(5,2) DEFAULT 0.00,
    ai_model_version text,
    generation_context jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


CREATE TABLE public.daily_plan_tasks (
    id bigint DEFAULT nextval('daily_plan_tasks_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    plan_id bigint NOT NULL,
    task_title text NOT NULL,
    task_description text,
    task_type text NOT NULL,
    related_course_id bigint,
    related_lesson_id bigint,
    related_content_type text,
    related_content_id text,
    priority text DEFAULT 'medium'::text NOT NULL,
    difficulty text DEFAULT 'medium'::text NOT NULL,
    estimated_minutes integer DEFAULT 15 NOT NULL,
    actual_minutes integer DEFAULT 0,
    points_reward integer DEFAULT 5 NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    completion_progress numeric(5,2) DEFAULT 0.00,
    completed_at timestamp with time zone,
    position integer DEFAULT 0 NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.direct_conversations (
    id bigint DEFAULT nextval('direct_conversations_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    participant1_id bigint NOT NULL,
    participant2_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.direct_messages (
    id bigint DEFAULT nextval('direct_messages_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    conversation_id bigint NOT NULL,
    sender_id bigint NOT NULL,
    content text NOT NULL,
    message_type text DEFAULT 'text'::text NOT NULL,
    attachment_id bigint,
    reply_to_id bigint,
    is_edited boolean DEFAULT false NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    delivered_at timestamp with time zone
);


CREATE TABLE public.document_hierarchy (
    id bigint DEFAULT nextval('document_hierarchy_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    content_type text NOT NULL,
    content_id bigint NOT NULL,
    document_title text,
    document_structure jsonb,
    summary_embedding_id bigint,
    total_chunks integer DEFAULT 0,
    estimated_reading_time integer DEFAULT 0,
    has_table_of_contents boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.embedding_queue (
    id bigint DEFAULT nextval('embedding_queue_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    content_type text NOT NULL,
    content_id bigint NOT NULL,
    content_text text NOT NULL,
    content_hash text NOT NULL,
    priority integer DEFAULT 5,
    scheduled_at timestamp with time zone DEFAULT now(),
    processing_started_at timestamp with time zone,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    status text DEFAULT 'queued'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.embedding_searches (
    id bigint DEFAULT nextval('embedding_searches_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint,
    query_text text NOT NULL,
    query_embedding vector(384),
    content_types text[] DEFAULT '{}'::text[],
    similarity_threshold numeric(3,2) DEFAULT 0.7,
    max_results integer DEFAULT 10,
    results_count integer DEFAULT 0,
    results_data jsonb DEFAULT '[]'::jsonb,
    processing_time_ms integer,
    embedding_time_ms integer,
    search_time_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.embeddings (
    id bigint DEFAULT nextval('embeddings_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    content_type text NOT NULL,
    content_id bigint NOT NULL,
    content_hash text NOT NULL,
    embedding vector(384),
    content_text text NOT NULL,
    embedding_model text DEFAULT 'intfloat/e5-small'::text,
    language text DEFAULT 'en'::text,
    token_count integer,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    retry_count integer DEFAULT 0,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    chunk_type text,
    hierarchy_level integer DEFAULT 0,
    parent_chunk_id bigint,
    section_title text,
    semantic_density double precision,
    key_terms text[],
    sentence_count integer DEFAULT 0,
    word_count integer DEFAULT 0,
    has_code_block boolean DEFAULT false,
    has_table boolean DEFAULT false,
    has_list boolean DEFAULT false,
    chunk_language text DEFAULT 'en'::text
);


CREATE TABLE public.group_conversations (
    id bigint DEFAULT nextval('group_conversations_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    description text,
    avatar_url text,
    created_by bigint NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.group_members (
    id bigint DEFAULT nextval('group_members_id_seq'::regclass) NOT NULL,
    conversation_id bigint NOT NULL,
    user_id bigint NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    left_at timestamp with time zone
);


CREATE TABLE public.group_message_read_status (
    id bigint DEFAULT nextval('group_message_read_status_id_seq'::regclass) NOT NULL,
    message_id bigint NOT NULL,
    user_id bigint NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.group_messages (
    id bigint DEFAULT nextval('group_messages_id_seq'::regclass) NOT NULL,
    conversation_id bigint NOT NULL,
    sender_id bigint NOT NULL,
    content text NOT NULL,
    attachment_id bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    message_type text DEFAULT 'text'::text NOT NULL,
    reply_to_id bigint,
    is_edited boolean DEFAULT false NOT NULL
);


CREATE TABLE public.hashtags (
    id bigint DEFAULT nextval('hashtags_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    search_vector tsvector
);


CREATE TABLE public.learning_goal (
    id bigint DEFAULT nextval('learning_goal_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    goal_type text NOT NULL,
    target_value integer NOT NULL,
    current_value integer DEFAULT 0,
    target_date date,
    reward_type text,
    reward_value integer DEFAULT 0,
    status text DEFAULT 'active'::text NOT NULL,
    completion_date timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    search_vector tsvector
);


CREATE TABLE public.learning_path (
    id bigint DEFAULT nextval('learning_path_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    goal text NOT NULL,
    duration integer NOT NULL,
    progress numeric(5,2) DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.learning_paths (
    id bigint DEFAULT nextval('learning_paths_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    title text NOT NULL,
    description text,
    learning_goal text NOT NULL,
    current_level text,
    time_constraint text,
    mermaid_diagram text,
    roadmap jsonb DEFAULT '[]'::jsonb,
    recommended_courses jsonb DEFAULT '[]'::jsonb,
    quiz_suggestions jsonb DEFAULT '[]'::jsonb,
    study_tips jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    progress_pct numeric(5,2) DEFAULT 0,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.learning_retrospectives (
    id bigint DEFAULT nextval('learning_retrospectives_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    plan_id bigint,
    retro_date date NOT NULL,
    retro_type text DEFAULT 'daily'::text NOT NULL,
    self_rating integer,
    mood_rating text,
    energy_level integer,
    focus_quality integer,
    achievements_today text,
    challenges_faced text,
    lessons_learned text,
    improvements_needed text,
    tomorrow_goals text,
    ai_analysis text,
    ai_suggestions text,
    ai_next_focus text,
    strengths_identified text,
    weaknesses_identified text,
    learning_patterns text,
    study_time_minutes integer DEFAULT 0,
    tasks_completed integer DEFAULT 0,
    points_earned integer DEFAULT 0,
    courses_progressed integer DEFAULT 0,
    achievements_unlocked integer DEFAULT 0,
    ai_model_version text,
    analysis_context jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.learning_statistics (
    id bigint DEFAULT nextval('learning_statistics_id_seq'::regclass) NOT NULL,
    user_id bigint NOT NULL,
    stat_date date DEFAULT CURRENT_DATE NOT NULL,
    total_study_minutes integer DEFAULT 0,
    courses_completed integer DEFAULT 0,
    lessons_completed integer DEFAULT 0,
    quizzes_taken integer DEFAULT 0,
    points_earned integer DEFAULT 0,
    achievements_unlocked integer DEFAULT 0,
    study_streak_days integer DEFAULT 0,
    avg_engagement_score numeric(3,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.message_read_status (
    id bigint DEFAULT nextval('message_read_status_id_seq'::regclass) NOT NULL,
    message_id bigint NOT NULL,
    user_id bigint NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.mfa_attempts (
    id bigint DEFAULT nextval('mfa_attempts_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    attempt_type text NOT NULL,
    success boolean DEFAULT false NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.milestone (
    id bigint DEFAULT nextval('milestone_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    path_id bigint NOT NULL,
    title text NOT NULL,
    description text,
    order_index integer NOT NULL,
    status text DEFAULT 'locked'::text NOT NULL,
    resource_type text,
    resource_id bigint,
    prerequisites jsonb,
    reward jsonb,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.mistake_book (
    id bigint DEFAULT nextval('mistake_book_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    assignment_id bigint,
    submission_id bigint,
    question_id bigint,
    mistake_content text NOT NULL,
    analysis text,
    source_type text DEFAULT 'manual'::text,
    knowledge_points text[],
    recommended_exercises jsonb,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    course_question_id bigint,
    course_id bigint,
    lesson_id bigint,
    search_vector tsvector
);


CREATE TABLE public.notification_categories (
    id bigint DEFAULT nextval('notification_categories_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    description text,
    default_enabled boolean DEFAULT true NOT NULL,
    icon text,
    color text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.notification_delivery_log (
    id bigint DEFAULT nextval('notification_delivery_log_id_seq'::regclass) NOT NULL,
    notification_id bigint NOT NULL,
    delivery_method text NOT NULL,
    onesignal_notification_id text,
    delivery_status text DEFAULT 'pending'::text NOT NULL,
    delivery_response jsonb,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    delivered_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.notification_templates (
    id bigint DEFAULT nextval('notification_templates_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    category_id bigint NOT NULL,
    title_template text NOT NULL,
    message_template text NOT NULL,
    action_url_template text,
    icon_url text,
    default_channels text[] DEFAULT ARRAY['push'::text, 'in_app'::text],
    variables jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.notifications (
    id bigint DEFAULT nextval('notifications_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    kind text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    category_id bigint
);


CREATE TABLE public.password_reset_tokens (
    id bigint DEFAULT nextval('password_reset_tokens_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    user_agent text
);


CREATE TABLE public.permissions (
    id bigint DEFAULT nextval('permissions_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.plagiarism_report (
    id bigint DEFAULT nextval('plagiarism_report_id_seq'::regclass) NOT NULL,
    submission_id bigint NOT NULL,
    similarity_score numeric,
    report jsonb,
    created_at timestamp with time zone DEFAULT now()
);


CREATE TABLE public.point_redemption (
    id bigint DEFAULT nextval('point_redemption_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    course_id bigint NOT NULL,
    points_spent integer NOT NULL,
    original_price_cents integer,
    discount_applied numeric(5,2) DEFAULT 0,
    status text DEFAULT 'pending'::text NOT NULL,
    redemption_date timestamp with time zone DEFAULT now() NOT NULL,
    completion_date timestamp with time zone,
    failure_reason text,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.post_hashtags (
    post_id uuid NOT NULL,
    hashtag_id bigint NOT NULL
);


CREATE TABLE public.profiles (
    id bigint DEFAULT nextval('profiles_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    role text NOT NULL,
    avatar_url text,
    bio text,
    timezone text DEFAULT 'Asia/Kuala_Lumpur'::text,
    status text DEFAULT 'active'::text NOT NULL,
    banned_reason text,
    banned_at timestamp with time zone,
    points integer DEFAULT 0 NOT NULL,
    onboarded boolean DEFAULT false NOT NULL,
    onboarded_step integer DEFAULT 0,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login timestamp with time zone,
    deleted_at timestamp with time zone,
    email text,
    full_name text,
    preferences jsonb DEFAULT '{}'::jsonb,
    theme text DEFAULT 'system'::text,
    language text DEFAULT 'en'::text,
    notification_settings jsonb DEFAULT '{"course_updates": true, "marketing_emails": false, "community_updates": false, "push_notifications": true, "email_notifications": true}'::jsonb,
    privacy_settings jsonb DEFAULT '{"show_email": false, "show_progress": true, "data_collection": true, "profile_visibility": "public"}'::jsonb,
    two_factor_enabled boolean DEFAULT false,
    email_verified boolean DEFAULT false,
    profile_completion integer DEFAULT 0,
    onesignal_player_id text,
    onesignal_external_id text,
    push_subscription_status text DEFAULT 'unknown'::text,
    totp_secret text,
    totp_backup_codes jsonb DEFAULT '[]'::jsonb,
    totp_enabled_at timestamp with time zone,
    last_password_change timestamp with time zone DEFAULT now(),
    currency text DEFAULT 'MYR'::text,
    search_vector tsvector
);


CREATE TABLE public.report (
    id bigint DEFAULT nextval('report_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    reporter_id bigint,
    subject_type text NOT NULL,
    subject_id text NOT NULL,
    reason text,
    status text DEFAULT 'open'::text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.role_permission (
    id bigint DEFAULT nextval('role_permission_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    role_id bigint NOT NULL,
    permission_id bigint NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.roles (
    id bigint DEFAULT nextval('roles_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.study_session (
    id bigint DEFAULT nextval('study_session_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    lesson_id bigint,
    course_id bigint,
    session_start timestamp with time zone DEFAULT now() NOT NULL,
    session_end timestamp with time zone,
    duration_minutes integer DEFAULT 0,
    activity_type text DEFAULT 'video_watching'::text,
    engagement_score numeric(3,2),
    progress_made numeric(5,2) DEFAULT 0,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.tutor_earnings (
    id bigint DEFAULT nextval('tutor_earnings_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    tutor_id bigint NOT NULL,
    source_type text NOT NULL,
    source_id bigint,
    gross_amount_cents integer NOT NULL,
    platform_fee_cents integer NOT NULL,
    tutor_amount_cents integer NOT NULL,
    currency text DEFAULT 'MYR'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    release_date timestamp with time zone,
    payout_id bigint,
    payment_intent_id text,
    stripe_transfer_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.tutor_earnings_summary (
    id bigint DEFAULT nextval('tutor_earnings_summary_id_seq'::regclass) NOT NULL,
    tutor_id bigint NOT NULL,
    total_earnings_cents integer DEFAULT 0,
    pending_earnings_cents integer DEFAULT 0,
    released_earnings_cents integer DEFAULT 0,
    paid_out_earnings_cents integer DEFAULT 0,
    current_month_earnings_cents integer DEFAULT 0,
    previous_month_earnings_cents integer DEFAULT 0,
    total_sales_count integer DEFAULT 0,
    students_taught_count integer DEFAULT 0,
    courses_sold_count integer DEFAULT 0,
    last_payout_at timestamp with time zone,
    next_payout_date timestamp with time zone,
    currency text DEFAULT 'MYR'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.tutor_payouts (
    id bigint DEFAULT nextval('tutor_payouts_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    tutor_id bigint NOT NULL,
    stripe_payout_id text,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'MYR'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payout_method text DEFAULT 'standard'::text,
    estimated_arrival timestamp with time zone,
    actual_arrival timestamp with time zone,
    failure_code text,
    failure_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.tutor_stripe_accounts (
    id bigint DEFAULT nextval('tutor_stripe_accounts_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    tutor_id bigint NOT NULL,
    stripe_account_id text NOT NULL,
    account_status text DEFAULT 'pending'::text NOT NULL,
    charges_enabled boolean DEFAULT false,
    payouts_enabled boolean DEFAULT false,
    country text DEFAULT 'MY'::text NOT NULL,
    currency text DEFAULT 'MYR'::text NOT NULL,
    account_type text DEFAULT 'express'::text,
    onboarding_completed boolean DEFAULT false,
    onboarding_url text,
    requirements jsonb DEFAULT '{}'::jsonb,
    capabilities jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.tutoring_appointments (
    id bigint DEFAULT nextval('tutoring_appointments_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    tutor_id bigint NOT NULL,
    student_id bigint NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    duration_min integer NOT NULL,
    status text DEFAULT 'requested'::text NOT NULL,
    notes text,
    created_by bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.tutoring_availability (
    id bigint DEFAULT nextval('tutoring_availability_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    tutor_id bigint NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    rrule text,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.tutoring_file (
    id bigint DEFAULT nextval('tutoring_file_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    owner_id bigint NOT NULL,
    path text NOT NULL,
    mime_type text,
    size_bytes bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.tutoring_note (
    id bigint DEFAULT nextval('tutoring_note_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    owner_id bigint NOT NULL,
    title text,
    body text,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    search_vector tsvector
);


CREATE TABLE public.tutoring_share (
    id bigint DEFAULT nextval('tutoring_share_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    resource_kind text NOT NULL,
    resource_id bigint NOT NULL,
    shared_with bigint,
    access text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.tutoring_students (
    id bigint DEFAULT nextval('tutoring_students_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    school text,
    grade text,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE public.tutoring_tutors (
    id bigint DEFAULT nextval('tutoring_tutors_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    headline text,
    subjects text[] DEFAULT '{}'::text[] NOT NULL,
    hourly_rate numeric(10,2),
    qualifications text,
    rating_avg numeric(3,2) DEFAULT 0,
    rating_count integer DEFAULT 0,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    search_vector tsvector
);


CREATE TABLE public.user_notification_preferences (
    id bigint DEFAULT nextval('user_notification_preferences_id_seq'::regclass) NOT NULL,
    user_id bigint NOT NULL,
    category_id bigint NOT NULL,
    push_enabled boolean DEFAULT true NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    in_app_enabled boolean DEFAULT true NOT NULL,
    sms_enabled boolean DEFAULT false NOT NULL,
    quiet_hours_start time without time zone,
    quiet_hours_end time without time zone,
    timezone text DEFAULT 'UTC'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.video_comment_likes (
    id bigint DEFAULT nextval('video_comment_likes_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    comment_id bigint NOT NULL,
    is_liked boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.video_comments (
    id bigint DEFAULT nextval('video_comments_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    lesson_id bigint NOT NULL,
    attachment_id bigint,
    parent_id bigint,
    reply_to_user_id bigint,
    content text NOT NULL,
    content_type text DEFAULT 'text'::text NOT NULL,
    video_time_sec double precision,
    likes_count integer DEFAULT 0 NOT NULL,
    replies_count integer DEFAULT 0 NOT NULL,
    is_approved boolean DEFAULT true,
    is_pinned boolean DEFAULT false,
    is_blocked boolean DEFAULT false,
    blocked_reason text,
    blocked_by bigint,
    blocked_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.video_danmaku (
    id bigint DEFAULT nextval('video_danmaku_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    lesson_id bigint NOT NULL,
    attachment_id bigint,
    content text NOT NULL,
    color text DEFAULT '#FFFFFF'::text NOT NULL,
    size text DEFAULT 'medium'::text NOT NULL,
    video_time_sec double precision NOT NULL,
    display_type text DEFAULT 'scroll'::text NOT NULL,
    font_family text DEFAULT 'Arial'::text,
    is_approved boolean DEFAULT true,
    is_blocked boolean DEFAULT false,
    blocked_reason text,
    blocked_by bigint,
    blocked_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.video_embeddings (
    id bigint DEFAULT nextval('video_embeddings_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    attachment_id bigint NOT NULL,
    content_type text NOT NULL,
    embedding_e5_small vector(384),
    content_text text NOT NULL,
    chunk_type text,
    hierarchy_level integer DEFAULT 0,
    parent_chunk_id bigint,
    section_title text,
    semantic_density double precision,
    key_terms text[],
    sentence_count integer DEFAULT 0,
    word_count integer DEFAULT 0,
    has_code_block boolean DEFAULT false,
    has_table boolean DEFAULT false,
    has_list boolean DEFAULT false,
    chunk_language text DEFAULT 'en'::text,
    embedding_model text,
    language text DEFAULT 'en'::text,
    token_count integer,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    retry_count integer DEFAULT 0,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    embedding_bge_m3 vector(1024),
    has_e5_embedding boolean DEFAULT false,
    has_bge_embedding boolean DEFAULT false,
    segment_start_time double precision,
    segment_end_time double precision,
    segment_index integer,
    total_segments integer,
    segment_duration double precision DEFAULT 
CASE
    WHEN ((segment_start_time IS NOT NULL) AND (segment_end_time IS NOT NULL)) THEN (segment_end_time - segment_start_time)
    ELSE NULL::double precision
END,
    prev_segment_id bigint,
    next_segment_id bigint,
    segment_overlap_start double precision,
    segment_overlap_end double precision,
    contains_code boolean DEFAULT false,
    contains_math boolean DEFAULT false,
    contains_diagram boolean DEFAULT false,
    topic_keywords text[] DEFAULT '{}'::text[],
    confidence_score double precision DEFAULT 1.0
);


CREATE TABLE public.video_likes (
    id bigint DEFAULT nextval('video_likes_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    lesson_id bigint NOT NULL,
    attachment_id bigint,
    is_liked boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.video_processing_queue (
    id bigint DEFAULT nextval('video_processing_queue_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    attachment_id bigint NOT NULL,
    user_id uuid NOT NULL,
    current_step character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    qstash_message_id text,
    qstash_schedule_id text,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    retry_delay_minutes integer DEFAULT 1,
    error_message text,
    error_details jsonb,
    last_error_at timestamp with time zone,
    step_data jsonb DEFAULT '{}'::jsonb,
    processing_metadata jsonb DEFAULT '{}'::jsonb,
    progress_percentage integer DEFAULT 0,
    estimated_completion_time timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


CREATE TABLE public.video_processing_steps (
    id bigint DEFAULT nextval('video_processing_steps_id_seq'::regclass) NOT NULL,
    queue_id bigint NOT NULL,
    step_name character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_seconds integer,
    input_data jsonb,
    output_data jsonb,
    error_message text,
    qstash_message_id text,
    retry_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


CREATE TABLE public.video_qa_history (
    id bigint DEFAULT nextval('video_qa_history_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    lesson_id bigint NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    video_time numeric NOT NULL,
    context_segments jsonb,
    is_helpful boolean,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);


CREATE TABLE public.video_segments (
    id bigint DEFAULT nextval('video_segments_id_seq'::regclass) NOT NULL,
    lesson_id bigint NOT NULL,
    start_time numeric NOT NULL,
    end_time numeric NOT NULL,
    text text NOT NULL,
    confidence numeric,
    speaker_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.video_terms_cache (
    id bigint DEFAULT nextval('video_terms_cache_id_seq'::regclass) NOT NULL,
    lesson_id bigint NOT NULL,
    time_window_start numeric NOT NULL,
    time_window_end numeric NOT NULL,
    terms jsonb NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '01:00:00'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.video_views (
    id bigint DEFAULT nextval('video_views_id_seq'::regclass) NOT NULL,
    public_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    lesson_id bigint NOT NULL,
    attachment_id bigint,
    watch_duration_sec integer DEFAULT 0 NOT NULL,
    total_duration_sec integer,
    watch_percentage double precision DEFAULT 
CASE
    WHEN (total_duration_sec > 0) THEN (((watch_duration_sec)::double precision / (total_duration_sec)::double precision) * (100)::double precision)
    ELSE (0)::double precision
END,
    session_start_time timestamp with time zone DEFAULT now() NOT NULL,
    session_end_time timestamp with time zone,
    last_position_sec integer DEFAULT 0,
    device_info jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
 |