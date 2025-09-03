export interface Group {
  id: number;
  public_id: string;
  name: string;
  description?: string | null;
  slug: string;
  visibility: "public" | "private";
  owner_id: number;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  // Extended fields for UI
  owner?: {
    display_name: string;
    avatar_url?: string;
  };
  member_count?: number;
  post_count?: number;
  user_membership?: {
    role: "owner" | "admin" | "member";
    joined_at: Date;
  } | null;
}