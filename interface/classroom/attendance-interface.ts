export interface Attendance {
  id: number;
  public_id: string;
  session_id: number;
  user_id: number;
  join_at?: Date | null;
  leave_at?: Date | null;
  attention_score?: number | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}