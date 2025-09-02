export type QuestionType = 'text' | 'single-choice' | 'multiple-choice';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  dependsOn?: string; // ID of the question this question depends on
  dependsOnValue?: string; // The value of the answer that triggers this question
}
