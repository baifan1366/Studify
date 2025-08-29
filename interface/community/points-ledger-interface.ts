export interface PointsLedger {
  id: number;
  public_id: string;
  user_id: number;
  points: number;
  reason?: string | null;
  ref?: Json | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}