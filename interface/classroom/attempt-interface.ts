export interface Attempt {
  id: number;
  public_id: string;
  quiz_id: number;
  user_id: number;
  started_at: Date;
  submitted_at?: Date | null;
  score: number;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}
