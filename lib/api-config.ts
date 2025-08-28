/**
 * API Configuration
 * Centralized configuration for API settings and constants
 */

import { supabase } from '@/utils/supabase/client';

// Export supabase client
export { supabase };

/**
 * API Configuration Constants
 */
export const API_CONFIG = {
  // Base URLs
  BASE_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  
  // Supabase Configuration
  SUPABASE: {
    URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  // Request timeouts (in milliseconds)
  TIMEOUTS: {
    DEFAULT: 10000, // 10 seconds
    UPLOAD: 30000,  // 30 seconds
    DOWNLOAD: 60000, // 60 seconds
  },
  
  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
  
  // File upload limits
  UPLOAD_LIMITS: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
  },
  
  // Cache settings
  CACHE: {
    DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
    USER_PROFILE_TTL: 15 * 60 * 1000, // 15 minutes
    COURSES_TTL: 10 * 60 * 1000, // 10 minutes
  }
} as const;

/**
 * API Response Types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * API Error Codes
 */
export const API_ERROR_CODES = {
  // Authentication errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // File upload errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
} as const;

/**
 * Supabase Table Names
 */
export const TABLES = {
  PROFILES: 'profiles',
  COURSES: 'courses',
  ENROLLMENTS: 'enrollments',
  ASSIGNMENTS: 'assignments',
  SUBMISSIONS: 'submissions',
  LESSONS: 'lessons',
  PROGRESS: 'progress',
  NOTIFICATIONS: 'notifications',
  MESSAGES: 'messages',
  POSTS: 'posts',
  COMMENTS: 'comments',
  LIKES: 'likes',
  STUDY_GROUPS: 'study_groups',
  GROUP_MEMBERS: 'group_members',
  BADGES: 'badges',
  USER_BADGES: 'user_badges',
  ACHIEVEMENTS: 'achievements',
  USER_ACHIEVEMENTS: 'user_achievements',
  LEADERBOARD: 'leaderboard',
  CALENDAR_EVENTS: 'calendar_events',
  DOCUMENTS: 'documents',
  USER_ROLES: 'user_roles',
  SETTINGS: 'settings',
} as const;

/**
 * Supabase Storage Buckets
 */
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  COURSE_THUMBNAILS: 'course-thumbnails',
  DOCUMENTS: 'documents',
  ASSIGNMENTS: 'assignments',
  SUBMISSIONS: 'submissions',
  MEDIA: 'media',
} as const;

/**
 * Real-time Channel Names
 */
export const CHANNELS = {
  COURSES: 'courses-channel',
  ASSIGNMENTS: 'assignments-channel',
  MESSAGES: 'messages-channel',
  NOTIFICATIONS: 'notifications-channel',
  STUDY_GROUPS: 'study-groups-channel',
  LEADERBOARD: 'leaderboard-channel',
} as const;

/**
 * API Helper Functions
 */
export const apiHelpers = {
  // Create standardized API response
  createResponse: <T>(
    success: boolean, 
    data?: T, 
    error?: string, 
    meta?: ApiResponse['meta']
  ): ApiResponse<T> => ({
    success,
    data,
    error,
    meta,
  }),

  // Create error response
  createErrorResponse: (error: string, code?: string): ApiResponse => ({
    success: false,
    error,
    ...(code && { code }),
  }),

  // Validate file upload
  validateFileUpload: (file: File): { valid: boolean; error?: string } => {
    if (file.size > API_CONFIG.UPLOAD_LIMITS.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds ${API_CONFIG.UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      };
    }

    if (!API_CONFIG.UPLOAD_LIMITS.ALLOWED_TYPES.includes(file.type as any)) {
      return {
        valid: false,
        error: 'File type not allowed',
      };
    }

    return { valid: true };
  },

  // Format pagination metadata
  formatPaginationMeta: (
    page: number,
    pageSize: number,
    total: number
  ): ApiResponse['meta'] => ({
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  }),

  // Get storage URL for file
  getStorageUrl: (bucket: string, path: string): string => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  // Upload file to storage
  uploadFile: async (
    bucket: string,
    path: string,
    file: File
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      const validation = apiHelpers.validateFileUpload(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file);

      if (error) {
        return { success: false, error: error.message };
      }

      const url = apiHelpers.getStorageUrl(bucket, data.path);
      return { success: true, url };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  },

  // Delete file from storage
  deleteFile: async (
    bucket: string,
    path: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Delete failed' 
      };
    }
  },
};

/**
 * Environment validation
 */
export const validateEnvironment = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!API_CONFIG.SUPABASE.URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  if (!API_CONFIG.SUPABASE.ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Export default configuration
export default {
  config: API_CONFIG,
  tables: TABLES,
  buckets: STORAGE_BUCKETS,
  channels: CHANNELS,
  helpers: apiHelpers,
  validateEnvironment,
};
