export interface Post {
  id: number;
  public_id: string;
  group_id?: number | null;
  author_id: number;
  title?: string | null;
  body?: string | null;
  slug: string;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  // Extended fields for UI
  author?: {
    display_name: string;
    avatar_url?: string;
  };
  group?: {
    name: string;
    slug: string;
    visibility: "public" | "private";
  };
  comments_count?: number;
  reactions?: Record<string, number>;
}

export interface Attachment {
  id?: string;
  name: string;
  file?: File;
  type: string;
}