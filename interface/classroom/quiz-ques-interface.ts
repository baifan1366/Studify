export interface QuizQuestion {
  id: number;
  public_id: string;
  quiz_id: number;
  question_id: number;
  points: number;
  position: number;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}