export interface Notification {
  id: string;
  user_id: string;
  kind: string;
  payload: any;
  is_read: boolean;
}