export interface Achievement {
  id: number;
  public_id: string;
  code: string;
  name: string;
  description?: string | null;
  rule?: Record<string, any> | null;
  unlocked?: boolean; // 针对用户
  unlocked_at?: string; // 成就解锁时间
  is_deleted?: boolean;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}
