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
  listByOwnerId: (owner_id: number) => `/api/courses?owner_id=${owner_id}`,
  create: "/api/courses",
  search: (query: string) => `/api/courses/search?q=${encodeURIComponent(query)}`,
  getById: (courseId: number) => `/api/courses/${courseId}`,
  update: (courseId: number) => `/api/courses/${courseId}`,
  updateStatus: (courseId: number) => `/api/courses/${courseId}/status`,
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
  getChaptersByLessonId: (lessonId: number) => `/api/course-lesson/${lessonId}/course-chapter`,
  createChapterByLessonId: (lessonId: number) => `/api/course-lesson/${lessonId}/course-chapter`,
  getChapterById: (lessonId: number, chapterId: number) => `/api/course-lesson/${lessonId}/course-chapter/${chapterId}`,
  updateChapterById: (lessonId: number, chapterId: number) => `/api/course-lesson/${lessonId}/course-chapter/${chapterId}`,
  deleteChapterById: (lessonId: number, chapterId: number) => `/api/course-lesson/${lessonId}/course-chapter/${chapterId}`,
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
  enrolledCoursesByUserId: (userId: number) => `/api/classroom/enrolled-courses/${userId}`,
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

// Attachments API endpoints
export const attachmentsApi = {
  list: "/api/attachments",
  listByOwner: (ownerId: number) => `/api/attachments?owner_id=${ownerId}`,
  create: "/api/attachments",
  getById: (id: number) => `/api/attachments/${id}`,
  update: (id: number) => `/api/attachments/${id}`,
  delete: (id: number) => `/api/attachments/${id}`,
  deleteByOwner: (id: number, ownerId: number) => `/api/attachments/${id}?owner_id=${ownerId}`,
} as const;

// Announcements API endpoints
export const announcementsApi = {
  list: "/api/announcements",
  getById: (id: number) => `/api/announcements/${id}`,
  create: "/api/announcements",
  update: (id: number) => `/api/announcements/${id}`,
  delete: (id: number) => `/api/announcements/${id}`,
  updateStatus: (id: number) => `/api/announcements/${id}/status`,
} as const;

// Achievements API endpoints
export const achievementsApi = {
  list: '/achievements',
  unlock: '/achievements',
} as const;

// Admin API endpoints
export const adminApi = {
  // User management
  getUsers: (filters?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.limit) params.set('limit', filters.limit.toString());
    if (filters?.role) params.set('role', filters.role);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    return api.get(`/api/admin/users?${params.toString()}`);
  },
  getUser: (userId: string) => api.get(`/api/admin/users/${userId}`),
  promoteToAdmin: (data: { user_id?: string; email?: string }) => 
    api.post('/api/admin/users', data),
  updateUser: (userId: string, updates: any) => 
    api.put(`/api/admin/users/${userId}`, updates),
  deleteUser: (userId: string) => 
    api.delete(`/api/admin/users/${userId}`),
  
  // Role management
  getRoles: () => api.get('/api/admin/roles'),
  bulkUpdateRoles: (data: { userIds: string[]; newRole: string; reason?: string }) => 
    api.post('/api/admin/roles/bulk-update', data),
  
  // Analytics
  getAnalytics: (period: number = 30) => 
    api.get(`/api/admin/analytics?period=${period}`),
  
  // Reports and moderation
  getReports: (filters?: {
    page?: number;
    limit?: number;
    status?: string;
    subject_type?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.limit) params.set('limit', filters.limit.toString());
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.subject_type && filters.subject_type !== 'all') params.set('subject_type', filters.subject_type);
    return api.get(`/api/admin/reports?${params.toString()}`);
  },
  getReport: (reportId: string) => api.get(`/api/admin/reports/${reportId}`),
  updateReportStatus: (reportId: string, data: { status: string; notes?: string }) => 
    api.put(`/api/admin/reports/${reportId}`, data),
  executeModerationAction: (reportId: string, data: any) => 
    api.post(`/api/admin/reports/${reportId}/actions`, data),
  
  // Batch operations
  batchReportAction: (data: {
    reportIds: string[];
    action: 'resolve' | 'reject' | 'hide_all' | 'delete_all' | 'ban_all';
    notes?: string;
    ban_duration_hours?: number;
  }) => api.post('/api/admin/reports/batch', data),
  
  // Course management
  getCourses: (filters?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
    owner_id?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.limit) params.set('limit', filters.limit.toString());
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.owner_id) params.set('owner_id', filters.owner_id);
    return api.get(`/api/admin/courses?${params.toString()}`);
  },
  getCourse: (courseId: string) => api.get(`/api/admin/courses/${courseId}`),
  updateCourse: (courseId: string, data: any) => 
    api.put(`/api/admin/courses/${courseId}`, data),
  deleteCourse: (courseId: string) => 
    api.delete(`/api/admin/courses/${courseId}`),
  approveCourse: (courseId: string, notes?: string) => 
    api.post(`/api/admin/courses/${courseId}/approve`, { notes }),
  rejectCourse: (courseId: string, reason: string) => 
    api.put(`/api/admin/courses/${courseId}/approve`, { reason }),
  getCourseAnalytics: (period: number = 30) => 
    api.get(`/api/admin/courses/analytics?period=${period}`),
} as const;

// Recommendations API endpoints
export const recommendationsApi = {
  get: '/recommendations',
} as const;

// API client for making HTTP requests
export const api = {
  get: async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },
  post: async (url: string, data?: any) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },
  put: async (url: string, data?: any) => {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },
  delete: async (url: string) => {
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },
};
// video embeddings api
export const videoEmbeddingsApi = {
  list: "/api/embeddings/video-embeddings",
  getById: (videoId: number) => `/api/embeddings/video-embeddings/${videoId}`,
  getByAttachmentId: (attachmentId: number) => `/api/embeddings/video-embeddings/attachment/${attachmentId}`,
  create: "/api/embeddings/video-embeddings",
  process: "/api/embeddings/video-embeddings/process",
  update: (videoId: number) => `/api/embeddings/video-embeddings/${videoId}`,
  delete: (videoId: number) => `/api/embeddings/video-embeddings/${videoId}`,
} as const;
