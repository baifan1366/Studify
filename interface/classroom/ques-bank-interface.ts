export interface QuestionBank {
  id: number;
  public_id: string;
  owner_id: number;
  title: string;
  topic_tags?: string[];
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}