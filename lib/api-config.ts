/**
 * API Configuration
 * Centralized configuration for API settings and constants
 */

import { supabase } from '@/utils/supabase/client';

// Export supabase client
export { supabase };

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

  // LiveKit Token errors
  LIVEKIT_TOKEN_GENERATION_FAILED: 'LIVEKIT_TOKEN_GENERATION_FAILED',
  LIVEKIT_TOKEN_INVALID: 'LIVEKIT_TOKEN_INVALID',
  LIVEKIT_ROOM_NOT_FOUND: 'LIVEKIT_ROOM_NOT_FOUND',
  LIVEKIT_PARTICIPANT_LIMIT_EXCEEDED: 'LIVEKIT_PARTICIPANT_LIMIT_EXCEEDED',
} as const;

/**
 * Supabase Table Names 
 */
export const TABLES = {
  // Core schema
  PROFILES: 'profiles',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'audit_logs',
  CHECKINS: 'checkins',
  REPORT: 'report',
  ACTION: 'action',
  BAN: 'ban',

  // Courses schema
  COURSE: 'courses.course',
  MODULE: 'courses.module',
  LESSON: 'courses.lesson',
  ENROLLMENT: 'courses.enrollment',
  PROGRESS: 'courses.progress',
  REVIEWS: 'courses.reviews',
  PRODUCT: 'courses.product',
  ORDER: 'courses.order',
  ORDER_ITEM: 'courses.order_item',
  PAYMENT: 'courses.payment',

  // Community schema
  GROUP: 'community.group',
  POST: 'community.post',
  COMMENT: 'community.comment',
  REACTION: 'community.reaction',
  POINTS_LEDGER: 'community.points_ledger',
  ACHIEVEMENT: 'community.achievement',
  CHALLENGES: 'community.challenges',
  CHALLENGE_RESULTS: 'community.challenge_results',
  GROUP_MEMBER: 'community.group_member',

  // Classroom schema
  LIVE_SESSIONS: 'classroom.live_session',
  ATTENDANCE: 'classroom.attendance',
  CHAT_MESSAGE: 'classroom.chat_message',
  WHITEBOARD_SESSION: 'classroom.whiteboard_session',
  WHITEBOARD_EVENT: 'classroom.whiteboard_event',
  RECORDING: 'classroom.recording',
  QUESTION_BANK: 'classroom.question_bank',
  QUESTION: 'classroom.question',
  QUIZ: 'classroom.quiz',
  QUIZ_QUESTION: 'classroom.quiz_question',
  ATTEMPT: 'classroom.attempt',
  ANSWER: 'classroom.answer',
  ASSIGNMENT: 'classroom.assignment',
  SUBMISSION: 'classroom.submission',
  GRADE: 'classroom.grade',
  SESSION_PARTICIPANTS: 'classroom.session_participant',
  CLASSROOM_LOGS: 'classroom.classroom_log',
  MISTAKE_BOOK: 'classroom.mistake_book',

  // Resources schema
  FILES: 'resources.file',
  NOTES: 'resources.note',

  // Analytics schema
  USER_ACTIONS: 'analytics.user_action',
  LEARNING_ANALYTICS: 'analytics.learning_analytics',

  // Tutoring schema
  TUTORS: 'tutoring.tutors',
  STUDENTS: 'tutoring.students',
  AVAILABILITY: 'tutoring.availability',
  APPOINTMENTS: 'tutoring.appointments',
  FILE: 'tutoring.file',
  NOTE: 'tutoring.note',
  SHARE: 'tutoring.share',

  // AI schema
  AGENT: 'ai.agent',
  RUN: 'ai.run',
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
  LEADERBOARD: 'leaderboard-channel',
} as const;

/**
 * Api helper
 */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Request failed');
  // Handle both wrapped and unwrapped responses
  return (json.data !== undefined ? json.data : json) as T;
}

export interface ApiSendOptions<T> {
  url: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: T;
  headers?: Record<string, string>;
  role?: string; // optional role
  credentials?: RequestCredentials; // 🔑 make this type-safe
}

export async function apiSend<TResponse = unknown, TBody = any>(
  options: ApiSendOptions<TBody>
): Promise<TResponse> {
  const { url, method, body, headers = {}, role, credentials } = options;

  // ✅ Merge custom headers
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (role) {
    finalHeaders["X-User-Role"] = role;
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: credentials ?? "include", // 🔑 default include cookies
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `API request failed: ${res.status}`);
  }

  return res.json() as Promise<TResponse>;
}

export async function apiUploadFile(url: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "File upload failed");
  }

  return res.json(); // { id, url }
}

// Convenience functions for common HTTP methods
export async function apiPost<TResponse = unknown, TBody = any>(
  url: string, 
  body: TBody
): Promise<TResponse> {
  return apiSend<TResponse, TBody>({
    url,
    method: 'POST',
    body
  });
}

export async function apiPatch<TResponse = unknown, TBody = any>(
  url: string, 
  body: TBody
): Promise<TResponse> {
  return apiSend<TResponse, TBody>({
    url,
    method: 'PATCH',
    body
  });
}

export async function apiPostFormData<T>(url: string, formData: FormData): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText };
    }
    throw { response: { data: errorData }, message: errorData.error || "Request failed" };
  }

  return res.json() as Promise<T>;
}

/**
 * Video AI Configuration
 * Centralized configuration for Video AI features
 * All values can be overridden via environment variables
 */
export const VideoAIConfig = {
  /**
   * Rate Limiting Configuration
   */
  rateLimit: {
    windowMs: parseInt(process.env.VIDEO_QA_WINDOW_MS || '60000'), // 1 minute
    maxRequests: parseInt(process.env.VIDEO_QA_MAX_REQUESTS || '20'), // 20 requests per minute
  },

  /**
   * Time Window Configuration (in seconds)
   */
  timeWindow: {
    default: parseInt(process.env.VIDEO_DEFAULT_TIME_WINDOW || '30'), // Default QA time window
    terms: parseInt(process.env.VIDEO_TERMS_TIME_WINDOW || '15'), // Terms extraction time window
    maxWindow: parseInt(process.env.VIDEO_MAX_TIME_WINDOW || '120'), // Maximum allowed time window
  },

  /**
   * Content Limits
   */
  limits: {
    segments: parseInt(process.env.VIDEO_SEGMENTS_LIMIT || '3'), // Max video segments to fetch
    terms: parseInt(process.env.VIDEO_TERMS_MAX_COUNT || '5'), // Max terms to extract
    searchResults: parseInt(process.env.VIDEO_SEARCH_MAX_RESULTS || '5'), // Max search results
    contextLength: parseInt(process.env.VIDEO_CONTEXT_LENGTH || '2000'), // Max context text length
  },

  /**
   * Cache Configuration
   */
  cache: {
    // Cache interval for terms (in seconds)
    interval: parseInt(process.env.NEXT_PUBLIC_TERMS_CACHE_INTERVAL || '15'),
    // Stale time for React Query (in milliseconds)
    staleTime: parseInt(process.env.NEXT_PUBLIC_TERMS_STALE_TIME || '30000'),
    // Enable/disable caching
    enabled: process.env.NEXT_PUBLIC_ENABLE_VIDEO_CACHE !== 'false',
  },

  /**
   * Search Configuration
   */
  search: {
    similarityThreshold: parseFloat(process.env.VIDEO_SEARCH_SIMILARITY_THRESHOLD || '0.7'),
    contentTypes: (process.env.VIDEO_SEARCH_CONTENT_TYPES || 'video_segment,lesson,note').split(','),
    prioritizeNearbySegments: process.env.VIDEO_PRIORITIZE_NEARBY !== 'false',
  },

  /**
   * AI Models Configuration
   */
  models: {
    default: process.env.OPEN_ROUTER_MODEL || 'z-ai/glm-4.5-air:free',
    document: process.env.OPEN_ROUTER_DOCUMENT_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free',
    image: process.env.OPEN_ROUTER_IMAGE_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free',
    toolCalling: process.env.OPEN_ROUTER_TOOL_CALLING_MODEL || 'z-ai/glm-4.5-air:free',
  },

  /**
   * Feature Flags
   */
  features: {
    enableExternalVideoSupport: process.env.ENABLE_EXTERNAL_VIDEO_SUPPORT !== 'false',
    enableTermsExtraction: process.env.ENABLE_TERMS_EXTRACTION !== 'false',
    enableVideoSegments: process.env.ENABLE_VIDEO_SEGMENTS !== 'false',
    enableQAHistory: process.env.ENABLE_QA_HISTORY !== 'false',
    enableAutoShowTerms: process.env.ENABLE_AUTO_SHOW_TERMS !== 'false',
  },

  /**
   * External Video Configuration
   */
  externalVideo: {
    supportedPlatforms: ['youtube', 'vimeo'] as const,
    youtubePattern: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    vimeoPattern: /vimeo\.com\/(\d+)/,
  },

  /**
   * UI Configuration
   */
  ui: {
    defaultPanelPosition: (process.env.NEXT_PUBLIC_QA_PANEL_POSITION || 'right') as 'left' | 'right',
    showKeyboardShortcuts: process.env.NEXT_PUBLIC_SHOW_KEYBOARD_SHORTCUTS !== 'false',
    enableAnimations: process.env.NEXT_PUBLIC_ENABLE_ANIMATIONS !== 'false',
  },

  /**
   * Logging Configuration
   */
  logging: {
    enableDebugLogs: process.env.NODE_ENV === 'development' || process.env.ENABLE_VIDEO_DEBUG === 'true',
    logSearchResults: process.env.LOG_SEARCH_RESULTS === 'true',
    logToolCalls: process.env.LOG_TOOL_CALLS === 'true',
  },
} as const;

/**
 * Validate Video AI configuration
 */
export function validateVideoAIConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate rate limit
  if (VideoAIConfig.rateLimit.maxRequests < 1) {
    errors.push('VIDEO_QA_MAX_REQUESTS must be at least 1');
  }

  // Validate time windows
  if (VideoAIConfig.timeWindow.default < 1) {
    errors.push('VIDEO_DEFAULT_TIME_WINDOW must be at least 1 second');
  }
  if (VideoAIConfig.timeWindow.default > VideoAIConfig.timeWindow.maxWindow) {
    errors.push('VIDEO_DEFAULT_TIME_WINDOW cannot exceed VIDEO_MAX_TIME_WINDOW');
  }

  // Validate limits
  if (VideoAIConfig.limits.terms < 1 || VideoAIConfig.limits.terms > 20) {
    errors.push('VIDEO_TERMS_MAX_COUNT must be between 1 and 20');
  }

  // Validate similarity threshold
  if (VideoAIConfig.search.similarityThreshold < 0 || VideoAIConfig.search.similarityThreshold > 1) {
    errors.push('VIDEO_SEARCH_SIMILARITY_THRESHOLD must be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get Video AI configuration summary for debugging
 */
export function getVideoAIConfigSummary() {
  return {
    rateLimit: `${VideoAIConfig.rateLimit.maxRequests} requests per ${VideoAIConfig.rateLimit.windowMs}ms`,
    timeWindow: `${VideoAIConfig.timeWindow.default}s (max: ${VideoAIConfig.timeWindow.maxWindow}s)`,
    limits: {
      segments: VideoAIConfig.limits.segments,
      terms: VideoAIConfig.limits.terms,
      searchResults: VideoAIConfig.limits.searchResults,
    },
    cache: {
      enabled: VideoAIConfig.cache.enabled,
      interval: `${VideoAIConfig.cache.interval}s`,
      staleTime: `${VideoAIConfig.cache.staleTime}ms`,
    },
    models: {
      default: VideoAIConfig.models.default,
      document: VideoAIConfig.models.document,
    },
    features: VideoAIConfig.features,
  };
}

// Validate Video AI config on module load (only in development)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  const validation = validateVideoAIConfig();
  if (!validation.valid) {
    console.warn('⚠️ Video AI Configuration Validation Errors:');
    validation.errors.forEach(error => console.warn(`  - ${error}`));
  } else if (VideoAIConfig.logging.enableDebugLogs) {
    console.log('✅ Video AI Configuration validated successfully');
    console.log('📊 Video AI Config Summary:', getVideoAIConfigSummary());
  }
}

// Export default configuration
export default {
  tables: TABLES,
  buckets: STORAGE_BUCKETS,
  channels: CHANNELS,
  videoAI: VideoAIConfig,
};
