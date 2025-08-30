export interface Quiz {
  id: number;
  public_id: string;
  course_id?: number | null;
  title: string;
  settings: Record<string, any>;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}