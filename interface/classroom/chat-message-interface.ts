export interface ChatMessage {
  id: number;
  public_id: string;
  session_id: number;
  sender_id: number;
  message: string;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}