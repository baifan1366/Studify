export interface Grade {
  id: number;
  public_id: string;
  assignment_id: number;
  user_id: number;
  grader_id?: number | null;
  score: number;
  feedback?: string | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}