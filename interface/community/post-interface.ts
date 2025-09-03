export interface Post {
  id: number;
  public_id: string;
  group_id?: number | null;
  author_id: number;
  title?: string | null;
  body?: string | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface Attachment {
  id?: string;
  name: string;
  file?: File;
  type: string;
}