export interface Enrollment {
  course_id: string;
  user_id: string;
  enrolled_at: string;
  progress_pct: number;
  completed_at?: string;
}