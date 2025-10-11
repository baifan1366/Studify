import { Profile } from "../user/profile-interface";
import { Hashtag } from "./post-interface";

// Translation object for multilingual support
export interface Translation {
  [locale: string]: string;
}

// Quiz Subject interface
export interface CommunityQuizSubject {
  id: number;
  code: string;
  translations: Translation;
  created_at: string;
  updated_at: string;
}

// Quiz Grade interface
export interface CommunityQuizGrade {
  id: number;
  code: string;
  translations: Translation;
  created_at: string;
  updated_at: string;
}

export interface CommunityQuiz {
  id: number;
  public_id?: string;
  slug: string; // <- 必须有
  author_id?: string;
  title: string;
  description?: string;
  difficulty: number; // 1-5
  max_attempts: number; // 最大尝试次数
  visibility: 'public' | 'private'; // 可见性
  time_limit_minutes?: number | null; // 限时（分钟）
  subject_id?: number | null; // 学科ID
  grade_id?: number | null; // 年级ID
  created_at?: string;
  is_deleted?: boolean;

  // Full-text search vectors (not typically used in frontend)
  search_vector_en?: string;
  search_vector_zh?: string;
  search_vector_ms?: string;

  // optional aggregated fields
  author?: Partial<Profile>;
  subject?: CommunityQuizSubject;
  grade?: CommunityQuizGrade;
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
