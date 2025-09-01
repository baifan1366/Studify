export interface Profile {
  id: number;
  public_id: string;
  user_id: string;
  display_name: string | null;
  role: "admin" | "student" | "tutor";
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  status: "active" | "banned";
  banned_reason: string | null;
  banned_at: string | null;
  points: number;
  onboarded: boolean;
  onboard_step: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  deleted_at: string | null;
}
