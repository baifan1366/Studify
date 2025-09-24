// Assignment submission interface matching the actual database schema
export interface Submission {
  id: number;                     // bigint
  assignment_id: number;          // bigint - foreign key to classroom_assignment
  student_id: number;             // bigint - foreign key to profiles.id (not user_id)
  content: string;                // text - submission content
  submitted_at: string;           // timestamp with time zone
  grade?: number | null;          // numeric - score/grade (not 'score')
  feedback?: string | null;       // text - instructor feedback
  attachments_id?: number | null; // bigint - foreign key to classroom_attachments
  classroom_attachments?: {       // joined attachment data from API
    id: number;
    file_name: string;
    file_url: string;
    mime_type: string;
    size_bytes: number;
    created_at: string;
  } | null;
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
  attachment_ids?: number[]; // Array of attachment IDs to link to submission
}

export interface UpdateSubmissionRequest {
  content: string;
  attachment_ids?: number[]; // Array of attachment IDs to link to submission
}

export interface GradeSubmissionRequest {
  grade: number;
  feedback?: string;
}