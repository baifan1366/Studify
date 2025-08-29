export interface Profile {
  user_id: string;
  display_name?: string;
  role: 'admin' | 'student' | 'tutor' | 'parent';
  avatar_url?: string;
  bio?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}