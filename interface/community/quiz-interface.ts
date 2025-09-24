import { Profile } from "../user/profile-interface";
import { Hashtag } from "./post-interface";

export interface CommunityQuiz {
  id: number;
  public_id?: string;
  slug: string; // <- 必须有
  author_id?: string;
  title: string;
  description?: string;
  tags?: (string | Hashtag)[];
  difficulty: number; // 1-5
  max_attempts: number; // 最大尝试次数
  visibility: 'public' | 'private'; // 可见性
  time_limit_minutes?: number | null; // 限时（分钟）
  created_at?: string;
  is_deleted?: boolean;

  // optional aggregated fields
  author?: Partial<Profile>;
  likes?: number;
  comments?: number;
  attempts?: number;
}

export interface CommunityQuizQuestion {
  id: number;
  public_id: string;
  slug: string;
  question_text: string;
  options: string[];
  correct_answers: string[];
  explanation?: string;
  question_type: "single_choice" | "multiple_choice" | "fill_in_blank";
}
