export interface Enrollment {
  id: number;
  public_id: string;
  course_id: number;
  user_id: number;
  role: 'student' | 'tutor' | 'owner' | 'assistant';
  status: 'active' | 'completed' | 'dropped' | 'locked';
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}