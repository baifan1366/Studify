export interface ChallengeResult {
  id: number;
  public_id: string;
  user_id: number;
  challenge_id: number;
  score: number;
  max_score: number;
  passed: boolean;
  attempted_at: Date;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}