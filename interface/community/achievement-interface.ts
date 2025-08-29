export interface Achievement {
  id: number;
  public_id: string;
  code: string;
  name: string;
  description?: string | null;
  rule?: Record<string, any> | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}