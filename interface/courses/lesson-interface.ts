export interface Lesson {
  id: number;
  public_id: string;
  course_id: number;
  module_id?: number;
  title: string;
  kind: 'video' | 'live' | 'document' | 'quiz' | 'assignment' | 'whiteboard';
  content_url?: string;
  duration_sec?: number;
  live_session_id?: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}