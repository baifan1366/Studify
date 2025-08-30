export interface Profile {
  id: number;
  public_id: string;
  user_id: string;
  display_name?: string;
  role: 'admin' | 'student' | 'tutor';
  avatar_url?: string;
  bio?: string;
  timezone?: string;
  status: 'active' | 'banned';
  banned_reason?: string;
  banned_at?: string;
  points: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  deleted_at?: string;
}