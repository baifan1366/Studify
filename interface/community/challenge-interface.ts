export interface Challenge {
  id: number;
  public_id: string;
  title: string;
  description?: string | null;
  max_score: number;
  passing_score: number;
  metadata?: Record<string, any> | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}