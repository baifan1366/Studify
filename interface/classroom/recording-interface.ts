export interface Recording {
  id: number;
  public_id: string;
  session_id: number;
  url: string;
  duration_sec?: number | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}