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
} as const;

/**
 * Supabase Table Names 
 */
export const TABLES = {
  // Core schema
  PROFILES: 'core.profiles',
  NOTIFICATIONS: 'core.notifications',
  PARENT_STUDENT: 'core.parent_student',

  // Courses schema
  COURSES: 'courses.course',
  MODULES: 'courses.module',
  LESSONS: 'courses.lesson',
  ENROLLMENTS: 'courses.enrollment',

  // Assessment schema
  QUIZZES: 'assessment.quiz',
  QUESTIONS: 'assessment.question',
  QUESTION_BANKS: 'assessment.question_bank',
  QUIZ_QUESTIONS: 'assessment.quiz_question',
  ATTEMPTS: 'assessment.attempt',
  ANSWERS: 'assessment.answer',
  ASSIGNMENTS: 'assessment.assignment',
  SUBMISSIONS: 'assessment.submission',

  // Community schema
  POSTS: 'community.post',
  COMMENTS: 'community.comment',
  LIKES: 'community.like',
  STUDY_GROUPS: 'community.study_group',
  GROUP_MEMBERS: 'community.group_member',

  // Gamification schema
  BADGES: 'gamification.badge',
  USER_BADGES: 'gamification.user_badge',
  ACHIEVEMENTS: 'gamification.achievement',
  USER_ACHIEVEMENTS: 'gamification.user_achievement',
  LEADERBOARD: 'gamification.leaderboard',
  CHALLENGE_RESULTS: 'gamification.challenge_results',

  // Classroom schema
  LIVE_SESSIONS: 'classroom.live_session',
  SESSION_PARTICIPANTS: 'classroom.session_participant',
  CLASSROOM_LOGS: 'classroom.classroom_log',

  // Resources schema
  FILES: 'resources.file',
  NOTES: 'resources.note',

  // Analytics schema
  USER_ACTIONS: 'analytics.user_action',
  LEARNING_ANALYTICS: 'analytics.learning_analytics',

  // Tutoring schema
  TUTOR_PROFILES: 'tutoring.tutor_profile',
  TUTORING_SESSIONS: 'tutoring.tutoring_session',
  SESSION_FEEDBACK: 'tutoring.session_feedback',
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

// Export default configuration
export default {
  tables: TABLES,
  buckets: STORAGE_BUCKETS,
  channels: CHANNELS,
};
