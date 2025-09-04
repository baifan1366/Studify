export interface MistakeBook {
  id: number;
  public_id: string;
  user_id: number;
  assignment_id?: number;
  submission_id?: number;
  question_id?: number;
  mistake_content: string;
  analysis?: string;
  source_type: 'quiz' | 'assignment' | 'manual';
  knowledge_points: string[];
  recommended_exercises?: any;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface MistakeBookWithDetails extends MistakeBook {
  assignment_title?: string;
  question_stem?: string;
  user_name?: string;
  user_email?: string;
}

export interface CreateMistakeBookRequest {
  assignment_id?: number;
  submission_id?: number;
  question_id?: number;
  mistake_content: string;
  analysis?: string;
  source_type: 'quiz' | 'assignment' | 'manual';
  knowledge_points: string[];
  recommended_exercises?: any;
}

export interface UpdateMistakeBookRequest {
  mistake_content?: string;
  analysis?: string;
  knowledge_points?: string[];
  recommended_exercises?: any;
}
