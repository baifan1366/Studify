export interface Answer {
  id: number;
  public_id: string;
  attempt_id: number;
  question_id: number;
  response?: Record<string, any> | null;
  is_correct?: boolean | null;
  points_awarded: number;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}