export interface GroupMember {
  id: number;
  public_id: string;
  group_id: number;
  user_id: number;
  role: "owner" | "admin" | "member";
  joined_at: Date;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}