-- Migration: Video Processing Queue System
-- Created: 2025-09-16
-- Purpose: Implement QStash-based video processing pipeline with retry mechanism

-- Video processing queue table
CREATE TABLE IF NOT EXISTS video_processing_queue (
    id bigserial PRIMARY KEY,
    public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    attachment_id bigint NOT NULL REFERENCES course_attachments(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Processing step information
    current_step VARCHAR(50) NOT NULL CHECK (current_step IN ('upload', 'compress', 'audio_convert', 'transcribe', 'embed', 'completed', 'failed', 'cancelled')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying', 'cancelled')) DEFAULT 'pending',
    
    -- QStash integration
    qstash_message_id TEXT,
    qstash_schedule_id TEXT, -- For delayed retries
    
    -- Retry configuration
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    retry_delay_minutes INT DEFAULT 1,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    last_error_at TIMESTAMPTZ,
    
    -- Step data storage
    step_data JSONB DEFAULT '{}', -- Store outputs from each step
    processing_metadata JSONB DEFAULT '{}', -- Store processing info (file sizes, durations, etc.)
    
    -- Progress tracking
    progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_completion_time TIMESTAMPTZ,
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Video processing steps tracking table
CREATE TABLE IF NOT EXISTS video_processing_steps (
    id bigserial PRIMARY KEY,
    queue_id bigint NOT NULL REFERENCES video_processing_queue(id) ON DELETE CASCADE,
    step_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
    
    -- Step execution details
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INT,
    
    -- Step-specific data
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    
    -- QStash tracking
    qstash_message_id TEXT,
    retry_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_attachment_id ON video_processing_queue(attachment_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_user_id ON video_processing_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_status ON video_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_current_step ON video_processing_queue(current_step);
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_created_at ON video_processing_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_qstash_message_id ON video_processing_queue(qstash_message_id);

CREATE INDEX IF NOT EXISTS idx_video_processing_steps_queue_id ON video_processing_steps(queue_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_steps_step_name ON video_processing_steps(step_name);
CREATE INDEX IF NOT EXISTS idx_video_processing_steps_status ON video_processing_steps(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_processing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER video_processing_queue_updated_at
    BEFORE UPDATE ON video_processing_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_video_processing_updated_at();

CREATE TRIGGER video_processing_steps_updated_at
    BEFORE UPDATE ON video_processing_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_video_processing_updated_at();

-- Function to calculate progress percentage based on completed steps
CREATE OR REPLACE FUNCTION calculate_video_processing_progress(queue_id_param bigint)
RETURNS INT AS $$
DECLARE
    total_steps INT;
    completed_steps INT;
    progress INT;
BEGIN
    -- Count total and completed steps
    SELECT COUNT(*) INTO total_steps
    FROM video_processing_steps
    WHERE queue_id = queue_id_param;
    
    SELECT COUNT(*) INTO completed_steps
    FROM video_processing_steps
    WHERE queue_id = queue_id_param AND status = 'completed';
    
    -- Calculate progress percentage
    IF total_steps = 0 THEN
        progress := 0;
    ELSE
        progress := ROUND((completed_steps::FLOAT / total_steps::FLOAT) * 100);
    END IF;
    
    -- Update the queue record
    UPDATE video_processing_queue
    SET progress_percentage = progress,
        updated_at = now()
    WHERE id = queue_id_param;
    
    RETURN progress;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize processing steps for a new queue item
CREATE OR REPLACE FUNCTION initialize_video_processing_steps(queue_id_param bigint)
RETURNS VOID AS $$
BEGIN
    -- Insert all required processing steps
    INSERT INTO video_processing_steps (queue_id, step_name, status)
    VALUES 
        (queue_id_param, 'compress', 'pending'),
        (queue_id_param, 'audio_convert', 'pending'),
        (queue_id_param, 'transcribe', 'pending'),
        (queue_id_param, 'embed', 'pending');
END;
$$ LANGUAGE plpgsql;

-- Function to get next pending step for a queue item
CREATE OR REPLACE FUNCTION get_next_processing_step(queue_id_param bigint)
RETURNS TEXT AS $$
DECLARE
    next_step TEXT;
BEGIN
    SELECT step_name INTO next_step
    FROM video_processing_steps
    WHERE queue_id = queue_id_param 
    AND status = 'pending'
    ORDER BY 
        CASE step_name
            WHEN 'compress' THEN 1
            WHEN 'audio_convert' THEN 2
            WHEN 'transcribe' THEN 3
            WHEN 'embed' THEN 4
            ELSE 5
        END
    LIMIT 1;
    
    RETURN next_step;
END;
$$ LANGUAGE plpgsql;

-- Function to mark step as completed and update queue status
CREATE OR REPLACE FUNCTION complete_processing_step(
    queue_id_param bigint,
    step_name_param TEXT,
    output_data_param JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    next_step TEXT;
    current_progress INT;
BEGIN
    -- Update the step as completed
    UPDATE video_processing_steps
    SET 
        status = 'completed',
        completed_at = now(),
        duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::INT,
        output_data = COALESCE(output_data_param, output_data),
        updated_at = now()
    WHERE queue_id = queue_id_param AND step_name = step_name_param;
    
    -- Calculate and update progress
    current_progress := calculate_video_processing_progress(queue_id_param);
    
    -- Get next step
    next_step := get_next_processing_step(queue_id_param);
    
    -- Update queue status
    IF next_step IS NULL THEN
        -- All steps completed
        UPDATE video_processing_queue
        SET 
            current_step = 'completed',
            status = 'completed',
            completed_at = now(),
            progress_percentage = 100,
            updated_at = now()
        WHERE id = queue_id_param;
    ELSE
        -- Move to next step
        UPDATE video_processing_queue
        SET 
            current_step = next_step,
            status = 'pending',
            updated_at = now()
        WHERE id = queue_id_param;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to handle step failure and retry logic
CREATE OR REPLACE FUNCTION handle_step_failure(
    queue_id_param bigint,
    step_name_param TEXT,
    error_message_param TEXT,
    error_details_param JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_retry_count INT;
    max_retries_allowed INT;
    should_retry BOOLEAN := FALSE;
BEGIN
    -- Get current retry count and max retries
    SELECT retry_count, max_retries INTO current_retry_count, max_retries_allowed
    FROM video_processing_queue
    WHERE id = queue_id_param;
    
    -- Update step as failed
    UPDATE video_processing_steps
    SET 
        status = 'failed',
        error_message = error_message_param,
        updated_at = now()
    WHERE queue_id = queue_id_param AND step_name = step_name_param;
    
    -- Check if we should retry
    IF current_retry_count < max_retries_allowed THEN
        should_retry := TRUE;
        
        -- Update queue for retry
        UPDATE video_processing_queue
        SET 
            status = 'retrying',
            retry_count = retry_count + 1,
            error_message = error_message_param,
            error_details = error_details_param,
            last_error_at = now(),
            updated_at = now()
        WHERE id = queue_id_param;
        
        -- Reset step to pending for retry
        UPDATE video_processing_steps
        SET 
            status = 'pending',
            retry_count = retry_count + 1,
            error_message = NULL,
            updated_at = now()
        WHERE queue_id = queue_id_param AND step_name = step_name_param;
        
    ELSE
        -- Max retries exceeded, mark as failed
        UPDATE video_processing_queue
        SET 
            current_step = 'failed',
            status = 'failed',
            error_message = error_message_param,
            error_details = error_details_param,
            last_error_at = now(),
            updated_at = now()
        WHERE id = queue_id_param;
    END IF;
    
    RETURN should_retry;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel video processing
CREATE OR REPLACE FUNCTION cancel_video_processing(queue_id_param bigint)
RETURNS VOID AS $$
BEGIN
    -- Update queue as cancelled
    UPDATE video_processing_queue
    SET 
        current_step = 'cancelled',
        status = 'cancelled',
        cancelled_at = now(),
        updated_at = now()
    WHERE id = queue_id_param;
    
    -- Cancel all pending steps
    UPDATE video_processing_steps
    SET 
        status = 'skipped',
        updated_at = now()
    WHERE queue_id = queue_id_param AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- View for easy queue monitoring
CREATE OR REPLACE VIEW video_processing_queue_status AS
SELECT 
    q.id,
    q.public_id,
    q.attachment_id,
    q.user_id,
    q.current_step,
    q.status,
    q.progress_percentage,
    q.retry_count,
    q.max_retries,
    q.error_message,
    q.created_at,
    q.updated_at,
    q.started_at,
    q.completed_at,
    q.cancelled_at,
    a.title as attachment_title,
    a.type as attachment_type,
    a.size as attachment_size,
    p.display_name as user_name,
    -- Step details
    (
        SELECT json_agg(
            json_build_object(
                'step_name', s.step_name,
                'status', s.status,
                'started_at', s.started_at,
                'completed_at', s.completed_at,
                'duration_seconds', s.duration_seconds,
                'retry_count', s.retry_count,
                'error_message', s.error_message
            ) ORDER BY 
                CASE s.step_name
                    WHEN 'compress' THEN 1
                    WHEN 'audio_convert' THEN 2
                    WHEN 'transcribe' THEN 3
                    WHEN 'embed' THEN 4
                    ELSE 5
                END
        )
        FROM video_processing_steps s
        WHERE s.queue_id = q.id
    ) as steps
FROM video_processing_queue q
LEFT JOIN course_attachments a ON q.attachment_id = a.id
LEFT JOIN profiles p ON q.user_id = p.user_id;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON video_processing_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON video_processing_steps TO authenticated;
GRANT SELECT ON video_processing_queue_status TO authenticated;
GRANT USAGE ON SEQUENCE video_processing_queue_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE video_processing_steps_id_seq TO authenticated;
