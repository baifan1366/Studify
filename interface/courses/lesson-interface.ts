export interface Lesson {
  id: number;
  public_id: string;
  course_id: number;
  module_id?: number;
  title: string;
  kind: 'video' | 'document' | 'assignment';
  content_url?: string;
  attachments?: number[]; // Array of attachment IDs
  duration_sec?: number;
  live_session_id?: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}