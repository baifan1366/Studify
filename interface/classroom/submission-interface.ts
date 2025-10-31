// Classroom Submission Interface - Polymorphic Design

export type SubmittableType = 'assignment' | 'quiz';

export interface ClassroomSubmission {
  id: number;
  
  // Polymorphic Association
  submittable_type: SubmittableType;
  submittable_id: number;
  
  // Student Information
  student_id: number;
  
  // Submission Content
  content?: string;  // For assignments
  answers?: Record<number, any>;  // For quizzes: { questionIndex: answer }
  attachments_id?: number;  // For assignments
  
  // Grading
  grade?: number;  // Legacy field
  score?: number;  // Points earned
  max_score?: number;  // Maximum possible points
  feedback?: string;  // Teacher feedback
  
  // Metadata
  submitted_at: Date;
  time_taken_seconds?: number;  // For quizzes
  
  // Soft Delete
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface CreateSubmissionData {
  submittable_type: SubmittableType;
  submittable_id: number;
  student_id: number;
  content?: string;
  answers?: Record<number, any>;
  attachments_id?: number;
  time_taken_seconds?: number;
}

export interface UpdateSubmissionData {
  content?: string;
  answers?: Record<number, any>;
  score?: number;
  max_score?: number;
  feedback?: string;
  grade?: number;
}

export interface QuizSubmissionData {
  quiz_id: number;
  answers: Record<number, any>;
  time_taken_seconds: number;
}

export interface AssignmentSubmissionData {
  assignment_id: number;
  content?: string;
  attachments_id?: number;
}
