export interface Course {
  // Database fields
  id: number;
  public_id: string;
  owner_id: number;
  title: string;
  description?: string;
  slug: string;
  visibility: 'public' | 'private' | 'unlisted';
  price_cents?: number;
  currency?: string;
  tags: string[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // Content fields
  video_intro_url?: string;
  thumbnail_url?: string | null;
  certificate_template?: string;
  
  // Course metadata
  level?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  language?: string;
  total_lessons?: number;
  total_duration_minutes?: number;
  requirements?: string[];
  learning_objectives?: string[];
  
  // Statistics
  average_rating?: number;
  total_students?: number;
  
  // Pricing
  is_free?: boolean;
  
  // Auto-creation flags
  auto_create_classroom?: boolean;
  auto_create_community?: boolean;
}