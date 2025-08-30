export interface Module {
  id: number;
  public_id: string;
  course_id: number;
  title: string;
  position: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}