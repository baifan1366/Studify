export interface Submission {
  id: number;
  public_id: string;
  assignment_id: number;
  user_id: number;
  content_url?: string | null;
  text_content?: string | null;
  plagiarism_score?: number | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}