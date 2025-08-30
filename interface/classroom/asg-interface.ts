export interface Assignment {
  id: number;
  public_id: string;
  course_id: number;
  title: string;
  description?: string | null;
  due_at?: Date | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}