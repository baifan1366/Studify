// interface/community/post-interface.ts
import { Comment } from "./comment-interface";

export interface PostFile {
  id: string; // UUID
  post_id: string; // UUID
  url: string;
  file_name: string;
  mime_type: string;
}

export interface Hashtag {
  id: number;
  name: string;
}

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
    id?: number;
    display_name: string;
    avatar_url?: string;
  };

  group?: {
    id?: number;
    name: string;
    slug: string;
    visibility: "public" | "private";
  };

  // 评论（详情页会用到）
  comments?: Comment[];

  // 评论数量（列表页更常用）
  comments_count?: number;

  // 表情/点赞数据（key: emoji, value: count）
  reactions?: Record<string, number>;

  // 附件（图片/文件等）
  files?: PostFile[];

  // 标签
  hashtags?: Hashtag[];
}

export interface Attachment {
  id?: string;
  name: string;
  file?: File;
  url?: string; // 上传后返回的 URL
  type: string; // e.g. "image", "video", "pdf"
}
