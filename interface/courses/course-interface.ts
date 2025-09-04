export interface Course {
  id: number;
  public_id: string;
  owner_id: number;
  title: string;
  description?: string;
  visibility: 'public' | 'private' | 'unlisted';
  price_cents?: number;
  currency?: string;
  tags: string[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Marketplace fields
  thumbnail_url?: string | null;
  level?: 'beginner' | 'intermediate' | 'advanced';
  total_lessons?: number;
  total_duration_minutes?: number;
  average_rating?: number;
  total_students?: number;
  is_free?: boolean;
  // Course structure
  modules?: CourseModule[];
  requirements?: string[];
  learning_objectives?: string[];
  category?: string;
}

export interface CourseModule {
  id: string;
  public_id: string;
  title: string;
  description?: string;
  position: number;
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  public_id: string;
  title: string;
  description?: string;
  position: number;
  duration_minutes?: number;
  video_url?: string;
  content?: string;
}