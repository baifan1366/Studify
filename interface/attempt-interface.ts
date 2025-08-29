export interface Attempt {
  id: string;
  quiz_id: string;
  user_id: string;
  started_at: string;
  submitted_at?: string;
  score: number;
}
