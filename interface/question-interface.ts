export interface Question {
  id: string;
  bank_id?: string;
  stem: string;
  kind: 'mcq' | 'true_false' | 'short' | 'essay' | 'code';
  choices?: any;
  answer?: any;
  difficulty?: number;
}