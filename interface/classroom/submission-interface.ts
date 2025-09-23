// Assignment submission interface matching the actual database schema
export interface Submission {
  id: number;                     // bigint
  assignment_id: number;          // bigint - foreign key to classroom_assignment
  student_id: number;             // bigint - foreign key to profiles.id (not user_id)
  content: string;                // text - submission content
  submitted_at: string;           // timestamp with time zone
  grade?: number | null;          // numeric - score/grade (not 'score')
  feedback?: string | null;       // text - instructor feedback
}

// Response interfaces for API endpoints
export interface SubmissionResponse {
  submission: Submission;
  message?: string;
}

export interface SubmissionListResponse {
  submissions: Submission[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// Request interfaces for API endpoints
export interface CreateSubmissionRequest {
  content: string;
}

export interface UpdateSubmissionRequest {
  content: string;
}

export interface GradeSubmissionRequest {
  grade: number;
  feedback?: string;
}