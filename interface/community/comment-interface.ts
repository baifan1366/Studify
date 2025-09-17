export interface Comment {
  id: number;
  public_id: string;
  post_id: number;
  author_id: number;
  parent_id?: number | null;
  body: string;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  depth?: number;

  // UI 扩展字段
  author?: {
    id?: number;
    display_name: string;
    avatar_url?: string;
  };

  // 嵌套评论（可选）
  replies?: Comment[];

  // 附件（可选）
  files?: {
    id: string;
    comment_id: number;
    url: string;
    file_name?: string;
    mime_type?: string;
  }[];

  // 点赞/表情
  reactions?: Record<string, number>;
}
