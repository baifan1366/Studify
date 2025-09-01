/**
 * API endpoints configuration
 * Centralized definition of all API routes used throughout the application
 */

import { supabase } from "@/utils/supabase/client";

// Export supabase client for direct access
export { supabase };

// Students API endpoints
export const studentsApi = {
  list: "/api/students",
  getById: (id: number) => `/api/students/${id}`,
  create: "/api/students",
  update: (id: number) => `/api/students/${id}`,
  delete: (id: number) => `/api/students/${id}`,
  search: (query: string) =>
    `/api/students/search?q=${encodeURIComponent(query)}`,
  progress: (id: number) => `/api/students/${id}/progress`,
} as const;

// Courses API endpoints
export const coursesApi = {
  list: "/api/courses",
  getById: (id: number) => `/api/courses/${id}`,
  create: "/api/courses",
  update: (id: number) => `/api/courses/${id}`,
  delete: (id: number) => `/api/courses/${id}`,
  search: (query: string) =>
    `/api/courses/search?q=${encodeURIComponent(query)}`,
  enroll: (courseId: number) => `/api/courses/${courseId}/enroll`,
  unenroll: (courseId: number) => `/api/courses/${courseId}/unenroll`,
} as const;

// Documents API endpoints
export const documentsApi = {
  list: "/api/documents",
  getById: (id: number) => `/api/documents/${id}`,
  upload: "/api/documents/upload",
  delete: (id: number) => `/api/documents/${id}`,
  download: (id: number) => `/api/documents/${id}/download`,
  search: (query: string) =>
    `/api/documents/search?q=${encodeURIComponent(query)}`,
} as const;

// Messages API endpoints
export const messagesApi = {
  list: "/api/messages",
  getById: (id: number) => `/api/messages/${id}`,
  send: "/api/messages",
  markAsRead: (id: number) => `/api/messages/${id}/read`,
  delete: (id: number) => `/api/messages/${id}`,
  conversations: "/api/messages/conversations",
} as const;

// Notifications API endpoints
export const notificationsApi = {
  list: "/api/notifications",
  getById: (id: number) => `/api/notifications/${id}`,
  markAsRead: (id: number) => `/api/notifications/${id}/read`,
  markAllAsRead: "/api/notifications/read-all",
  delete: (id: number) => `/api/notifications/${id}`,
  preferences: "/api/notifications/preferences",
} as const;

// Calendar API endpoints
export const calendarApi = {
  events: "/api/calendar/events",
  getEvent: (id: number) => `/api/calendar/events/${id}`,
  createEvent: "/api/calendar/events",
  updateEvent: (id: number) => `/api/calendar/events/${id}`,
  deleteEvent: (id: number) => `/api/calendar/events/${id}`,
  availability: "/api/calendar/availability",
} as const;

// Dashboard API endpoints
export const dashboardApi = {
  overview: "/api/dashboard/overview",
  analytics: "/api/dashboard/analytics",
  recentActivity: "/api/dashboard/recent-activity",
  quickStats: "/api/dashboard/quick-stats",
} as const;

// Settings API endpoints
export const settingsApi = {
  profile: "/api/settings/profile",
  preferences: "/api/settings/preferences",
  security: "/api/settings/security",
  notifications: "/api/settings/notifications",
  theme: "/api/settings/theme",
} as const;

// Authentication API endpoints
export const authApi = {
  login: "/api/auth/login",
  logout: "/api/auth/logout",
  register: "/api/auth/register",
  forgotPassword: "/api/auth/forgot-password",
  resetPassword: "/api/auth/reset-password",
  verifyEmail: "/api/auth/verify-email",
  refreshToken: "/api/auth/refresh-token",
  profile: "/api/auth/profile",
} as const;

// AI/Learning API endpoints
export const aiApi = {
  chat: "/api/ai/chat",
  generateMindMap: "/api/ai/mind-map",
  solveProblem: "/api/ai/solve-problem",
  recommendations: "/api/ai/recommendations",
  studyPlan: "/api/ai/study-plan",
  progress: "/api/ai/progress-analysis",
} as const;

// Community API endpoints
export const communityApi = {
  posts: "/api/community/posts",
  getPost: (id: number) => `/api/community/posts/${id}`,
  createPost: "/api/community/posts",
  updatePost: (id: number) => `/api/community/posts/${id}`,
  deletePost: (id: number) => `/api/community/posts/${id}`,
  likePost: (id: number) => `/api/community/posts/${id}/like`,
  commentPost: (id: number) => `/api/community/posts/${id}/comments`,
  studyGroups: "/api/community/study-groups",
  joinGroup: (id: number) => `/api/community/study-groups/${id}/join`,
  leaveGroup: (id: number) => `/api/community/study-groups/${id}/leave`,
} as const;

// Gamification API endpoints
export const gamificationApi = {
  leaderboard: "/api/gamification/leaderboard",
  badges: "/api/gamification/badges",
  achievements: "/api/gamification/achievements",
  checkin: "/api/gamification/checkin",
  points: "/api/gamification/points",
  streak: "/api/gamification/streak",
} as const;

// Users API endpoints
export const usersApi = {
  updateProfile: "/api/users/profile",
  getProfile: "/api/users/profile",
} as const;
