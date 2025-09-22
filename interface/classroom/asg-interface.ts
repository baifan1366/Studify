// Assignment interface matching the actual database schema
export interface Assignment {
  id: number;                     // bigint
  classroom_id: number;           // bigint - foreign key to classroom
  author_id: number;              // bigint - foreign key to profiles.id
  title: string;                  // text
  description: string;            // text
  due_date: string;              // timestamp with time zone
  created_at: string;            // timestamp with time zone
  slug?: string;                 // text - URL-friendly identifier (optional)
}

// Response interfaces for API endpoints
export interface AssignmentResponse {
  assignment: Assignment;
}

export interface AssignmentsListResponse {
  assignments: Assignment[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// Request interfaces for API endpoints
export interface CreateAssignmentRequest {
  title: string;
  description: string;
  due_date: string;
}

export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  due_date?: string;
}

// Assignment with additional computed fields
export interface AssignmentWithStatus extends Assignment {
  status: 'upcoming' | 'ongoing' | 'overdue';
  days_until_due: number;
}