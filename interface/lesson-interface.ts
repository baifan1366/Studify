export interface Lesson {
  id: string;
  course_id: string;
  module_id?: string;
  title: string;
  kind: 'video' | 'live' | 'document' | 'quiz' | 'assignment' | 'whiteboard';
  content_url?: string;
  duration_sec?: number;
  live_session_id?: string;
  updated_at: string;
}