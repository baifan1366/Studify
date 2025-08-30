export interface Notification {
  id: number;
  public_id: string;
  user_id: number;
  kind: string;
  payload: Record<string, any>;
  is_read: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}