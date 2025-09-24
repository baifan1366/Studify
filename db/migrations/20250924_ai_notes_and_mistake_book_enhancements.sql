-- =========================
-- AI笔记和错题本功能增强
-- 扩展现有表以支持AI生成的内容
-- Created: 2025-09-24
-- =========================

-- 1. 扩展course_notes表以支持AI笔记
ALTER TABLE course_notes 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS note_type text DEFAULT 'manual' CHECK (note_type IN ('manual', 'ai_generated', 'video_notes', 'course_summary'));

-- 更新course_notes表的约束，允许lesson_id为空（用于AI笔记）
ALTER TABLE course_notes 
ALTER COLUMN lesson_id DROP NOT NULL;

-- 添加course_id字段到course_notes表（如果还没有的话）
ALTER TABLE course_notes 
ADD COLUMN IF NOT EXISTS course_id bigint REFERENCES course(id) ON DELETE SET NULL;

-- 2. 扩展mistake_book表的source_type枚举
-- 首先检查并更新约束
ALTER TABLE mistake_book 
DROP CONSTRAINT IF EXISTS mistake_book_source_type_check;

ALTER TABLE mistake_book 
ADD CONSTRAINT mistake_book_source_type_check 
CHECK (source_type IN ('quiz','assignment','manual','course_quiz','ai_solve'));

-- 3. 添加索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_course_notes_note_type ON course_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_course_notes_user_type ON course_notes(user_id, note_type);
CREATE INDEX IF NOT EXISTS idx_course_notes_course_id ON course_notes(course_id);

CREATE INDEX IF NOT EXISTS idx_mistake_book_source_type ON mistake_book(source_type);
CREATE INDEX IF NOT EXISTS idx_mistake_book_user_source ON mistake_book(user_id, source_type);

-- 4. 添加注释
COMMENT ON COLUMN course_notes.note_type IS 'AI笔记类型：manual(手动), ai_generated(AI生成), video_notes(视频笔记), course_summary(课程总结)';
COMMENT ON COLUMN course_notes.title IS 'AI笔记标题';
COMMENT ON COLUMN course_notes.course_id IS '关联的课程ID，用于AI笔记';

-- 5. 更新mistake_book的source_type注释
COMMENT ON COLUMN mistake_book.source_type IS '错题来源：quiz(测验), assignment(作业), manual(手动), course_quiz(课程测验), ai_solve(AI解题)';
