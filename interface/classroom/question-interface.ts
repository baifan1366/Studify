export interface Question {
  id: number;
  public_id: string;
  bank_id?: number | null;
  stem: string;
  kind: "mcq" | "true_false" | "short" | "essay" | "code";
  choices?: Record<string, any> | null;
  answer?: Record<string, any> | null;
  difficulty?: number | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}