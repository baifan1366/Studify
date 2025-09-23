/**
 * Shared types for LangChain tools
 */

// Common interface for AI tool handlers
export interface ToolContext {
  userId?: number;
  userRole?: string;
}

// Common interface for AI tool parameters
export interface BaseToolParameters {
  [key: string]: any;
}

// Common interface for AI tool responses
export interface ToolResponse {
  success: boolean;
  error?: string;
  message?: string;
  [key: string]: any;
}

// Database record interfaces
export interface DatabaseRecord {
  id: number;
  public_id: string;
  created_at: string;
  updated_at?: string;
  is_deleted: boolean;
}

export interface UserProfile extends DatabaseRecord {
  user_id: string;
  display_name?: string;
  full_name?: string;
  email: string;
  role: string;
  bio?: string;
  avatar_url?: string;
  preferences?: any;
  onboarded: boolean;
  status: string;
}

export interface Course extends DatabaseRecord {
  owner_id: number;
  title: string;
  description?: string;
  slug: string;
  category?: string;
  level?: string;
  language?: string;
  thumbnail_url?: string;
  price_cents: number;
  is_free: boolean;
  status: string;
  visibility: string;
  total_students?: number;
  average_rating?: number;
  tags?: string[];
  requirements?: string[];
  learning_objectives?: string[];
}

export interface CommunityPost extends DatabaseRecord {
  title?: string;
  body: string;
  author_id: number;
  group_id?: number;
  slug?: string;
}

export interface CommunityGroup extends DatabaseRecord {
  name: string;
  description?: string;
  slug: string;
  owner_id: number;
  visibility: 'public' | 'private';
  member_count?: number;
  post_count?: number;
}

export interface EmbeddingData {
  content_id: number;
  content_type: string;
  embedding_e5_small?: any;
  embedding_bge_m3?: any;
  has_e5_embedding: boolean;
  has_bge_embedding: boolean;
}

// Recommendation interfaces
export interface RecommendationBase {
  recommendation_score: number;
  embedding_similarity?: number;
  recommendation_reasons: string[];
}

export interface RecommendationResult<T> {
  success: boolean;
  userId?: number;
  userProfile?: any;
  totalRecommendations: number;
  recommendations: T[];
  error?: string;
}
