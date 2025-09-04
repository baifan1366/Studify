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

  // UI 扩展字段
  author?: {
    id?: number;
    display_name: string;
    avatar_url?: string;
  };

  // 嵌套评论（可选）
  replies?: Comment[];

  // 点赞/表情
  reactions?: Record<string, number>;
}
