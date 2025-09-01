export interface Comment {
  id: number;
  public_id: string;
  post_id: number;
  author_id: number;
  body: string;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}