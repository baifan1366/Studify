/**
 * API endpoints configuration
 * Centralized definition of all API routes used throughout the application
 */

import { supabase } from "@/utils/supabase/client";

// Export supabase client for direct access
export { supabase };

// User API endpoints
export const userApi = {
  getUser: "/api/user",
} as const;

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
  create: "/api/courses",
  search: (query: string) => `/api/courses/search?q=${encodeURIComponent(query)}`,
  getById: (courseId: number) => `/api/courses/${courseId}`,
  update: (courseId: string) => `/api/courses/${courseId}`,
  delete: (courseId: number) => `/api/courses/${courseId}`,
  enroll: (courseId: number) => `/api/courses/${courseId}/enroll`,
  unenroll: (courseId: number) => `/api/courses/${courseId}/unenroll`,
  getModuleByCourseId: (courseId: number) => `/api/courses/${courseId}/course-module`,
  createModuleByCourseId: (courseId: number) => `/api/courses/${courseId}/course-module`,
  getModuleById: (courseId: number, moduleId: number) => `/api/courses/${courseId}/course-module/${moduleId}`,
  updateModuleById: (courseId: number, moduleId: number) => `/api/courses/${courseId}/course-module/${moduleId}`,
  deleteModuleById: (courseId: number, moduleId: number) => `/api/courses/${courseId}/course-module/${moduleId}`,
  getLessonByCourseModuleId: (courseId: number, moduleId: number) => `/api/courses/${courseId}/course-module/${moduleId}/course-lesson`,
  createLessonByCourseModuleId: (courseId: number, moduleId: number) => `/api/courses/${courseId}/course-module/${moduleId}/course-lesson`,
  getLessonById: (courseId: number, moduleId: number, lessonId: number) => `/api/courses/${courseId}/course-module/${moduleId}/course-lesson/${lessonId}`,
  updateLessonById: (courseId: number, moduleId: number, lessonId: number) => `/api/courses/${courseId}/course-module/${moduleId}/course-lesson/${lessonId}`,
  deleteLessonById: (courseId: number, moduleId: number, lessonId: number) => `/api/courses/${courseId}/course-module/${moduleId}/course-lesson/${lessonId}`,
} as const;

// Classroom API endpoints
export const classroomApi = {
  // Core classroom management
  list: "/api/classroom",
  create: "/api/classroom",
  join: "/api/classroom/join",
  
  // Member management
  members: {
    list: "/api/classroom/member",
    update: "/api/classroom/member",
    remove: "/api/classroom/member",
  },
  
  // Live sessions
  liveSessions: {
    list: "/api/classroom/live-session",
    create: "/api/classroom/live-session",
    update: "/api/classroom/live-session",
  },
  
  // Legacy endpoints (keeping for backward compatibility)
  enrolledCourses: "/api/classroom/enrolled-courses",
  assignments: "/api/classroom/assignments",
  assignmentDetail: (id: string) => `/api/classroom/assignments/${id}`,
  submitAssignment: (id: string) => `/api/classroom/assignments/${id}/submit`,
  autograde: (id: string) => `/api/classroom/assignments/${id}/autograde`,
  mistakes: "/api/classroom/assignments/mistakes",
  // 课程详情相关API
  detail: (id: string) => `/api/classroom/${id}`,
  posts: {
    list: (id: string) => `/api/classroom/${id}/posts`,
    create: (id: string) => `/api/classroom/${id}/posts`,
    comment: (id: string, postId: string) => `/api/classroom/${id}/posts/${postId}/comment`,
  },
  chat: {
    send: (id: string) => `/api/classroom/${id}/chat/message`,
    history: (id: string) => `/api/classroom/${id}/chat/history`,
  },
  classroomAssignments: {
    list: (id: string) => `/api/classroom/${id}/assignments`,
    create: (id: string) => `/api/classroom/${id}/assignments`,
    submit: (id: string, assignmentId: string) => `/api/classroom/${id}/assignments/${assignmentId}/submit`,
    grade: (id: string, assignmentId: string) => `/api/classroom/${id}/assignments/${assignmentId}/grade`,
  },
  classroomMembers: {
    list: (id: string) => `/api/classroom/${id}/members`,
    invite: (id: string) => `/api/classroom/${id}/members/invite`,
  },
  docs: {
    list: (id: string) => `/api/classroom/${id}/docs`,
    upload: (id: string) => `/api/classroom/${id}/docs/upload`,
    delete: (id: string, docId: string) => `/api/classroom/${id}/docs/${docId}`,
  },
} as const;

// Learning Path API endpoints
export const learningPathApi = {
  generate: "/api/classroom/learning-path/generate",
  getByUserId: (userId: string) => `/api/classroom/learning-path/${userId}`,
  updateProgress: (pathId: string) => `/api/classroom/learning-path/${pathId}/progress`,
  unlock: (pathId: string) => `/api/classroom/learning-path/${pathId}/unlock`,
  reward: (pathId: string) => `/api/classroom/learning-path/${pathId}/reward`,
} as const;


export const meetingApi = {
  getMeeting: (id: string) => `/api/meeting/${id}`,
  getToken: (id: string) => `/api/meeting/${id}/token`,
  create: "/api/meeting/create",
  end: (id: string) => `/api/meeting/${id}/end`,
  chat: (id: string) => `/api/meeting/${id}/chat`,
  whiteboard: {
    init: (id: string) => `/api/meeting/${id}/whiteboard/init`,
    state: (id: string) => `/api/meeting/${id}/whiteboard/state`,
  },
  copilot: {
    summary: (id: string) => `/api/meeting/${id}/copilot/summary`,
    chapters: (id: string) => `/api/meeting/${id}/copilot/auto-chapters`,
    conceptExplain: (id: string) => `/api/meeting/${id}/copilot/concept-explain`,
    transcribe: (id: string) => `/api/meeting/${id}/copilot/transcribe`,
  },
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

// Embedding API endpoints
export const embeddingApi = {
  search: "/api/embeddings/search",
  queue: "/api/embeddings/queue",
  processor: "/api/embeddings/processor",
} as const;

// Users API endpoints
export const usersApi = {
  updateProfile: "/api/users/profile",
  getProfile: "/api/users/profile",
} as const;
