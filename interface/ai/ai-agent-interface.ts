export interface AiAgent {
  id: number;
  public_id: string; // uuid
  name: string;
  owner_id?: number | null;
  purpose?: string | null;
  config: Record<string, any>;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}