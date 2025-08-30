export interface Group {
  id: number;
  public_id: string;
  name: string;
  description?: string | null;
  visibility: "public" | "private";
  owner_id: number;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}