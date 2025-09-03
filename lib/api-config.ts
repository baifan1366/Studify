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
  return json.data as T;
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

// Export default configuration
export default {
  tables: TABLES,
  buckets: STORAGE_BUCKETS,
  channels: CHANNELS,
};
