export interface WhiteboardSession {
  id: number;
  public_id: string;
  session_id?: number | null;
  title?: string | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}