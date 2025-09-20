// interface/admin/admin-interface.ts

export interface AdminUser {
  id: number;
  public_id: string;
  user_id: string;
  display_name?: string;
  full_name?: string;
  email?: string;
  role: 'admin' | 'student' | 'tutor';
  status: 'active' | 'banned';
  banned_reason?: string;
  banned_at?: string;
  points: number;
  onboarded: boolean;
  profile_completion: number;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface AdminUserDetails extends AdminUser {
  course_enrollment: { count: number }[];
  classroom_member: { count: number }[];
  community_post: { count: number }[];
  community_comment: { count: number }[];
  recentActivity: AdminAuditEntry[];
}

export interface AdminUsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUserFilters {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}

export interface AdminUserUpdate {
  role?: 'admin' | 'student' | 'tutor';
  status?: 'active' | 'banned';
  banned_reason?: string;
  ban_expires_at?: string;
}

export interface AdminPromoteRequest {
  user_id?: string;
  email?: string;
}

export interface AdminBulkRoleUpdate {
  userIds: string[];
  newRole: 'admin' | 'student' | 'tutor';
  reason?: string;
}

export interface AdminAuditEntry {
  id: number;
  action: string;
  subject_type: string;
  created_at: string;
  meta: any;
  profiles?: {
    display_name?: string;
    email?: string;
  };
}

export interface AdminAnalytics {
  userStats: {
    total: number;
    new: number;
    active: number;
    banned: number;
    roleDistribution: Record<string, number>;
  };
  contentStats: {
    courses: number;
    classrooms: number;
    communityPosts: number;
    enrollments: number;
  };
  recentActivity: AdminAuditEntry[];
  dailyRegistrations: Record<string, number>;
  period: number;
}

export interface AdminRolePermission {
  name: string;
  description: string;
  permissions: string[];
}

export interface AdminRoleStats {
  roleStats: {
    admin: number;
    tutor: number;
    student: number;
    total: number;
  };
  rolePermissions: Record<string, AdminRolePermission>;
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  bannedUsers: number;
  totalCourses: number;
  totalClassrooms: number;
  totalPosts: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export interface AdminActionLog {
  id: number;
  actor_id: number;
  action: string;
  subject_type: string;
  subject_id: string;
  meta: Record<string, any>;
  created_at: string;
  actor?: {
    display_name?: string;
    email?: string;
  };
}

export type AdminPermission = 
  | 'manage_users'
  | 'manage_roles'
  | 'view_analytics'
  | 'manage_content'
  | 'moderate_reports';

// Content moderation interfaces
export interface AdminReport {
  id: number;
  public_id: string;
  subject_type: 'post' | 'comment' | 'course' | 'profile';
  subject_id: string;
  reason: string;
  status: 'open' | 'reviewing' | 'resolved' | 'rejected';
  created_at: string;
  updated_at: string;
  profiles: {
    id: number;
    display_name: string;
    email: string;
    avatar_url?: string;
  };
  content_details?: {
    title?: string;
    body?: string;
    description?: string;
    display_name?: string;
    bio?: string;
    profiles?: {
      display_name: string;
    };
  };
}

export interface AdminReportDetails extends AdminReport {
  actions: AdminModerationAction[];
}

export interface AdminModerationAction {
  id: number;
  report_id: number;
  actor_id: number;
  action: 'hide' | 'delete' | 'warn' | 'ban';
  notes?: string;
  created_at: string;
  profiles: {
    display_name: string;
    email: string;
  };
}

export interface AdminReportsFilters {
  status?: string;
  subject_type?: string;
  page?: number;
  limit?: number;
}

export interface AdminReportsResponse {
  reports: AdminReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminModerationActionRequest {
  action: 'hide' | 'delete' | 'warn' | 'ban';
  notes?: string;
  ban_duration_hours?: number;
}

// Course management interfaces
export interface AdminCourse {
  id: number;
  public_id: string;
  title: string;
  description?: string;
  slug?: string;
  category?: string;
  visibility: 'public' | 'private' | 'unlisted';
  status: 'active' | 'pending' | 'inactive';
  price_cents: number;
  currency: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  total_lessons: number;
  total_duration_minutes: number;
  total_students: number;
  average_rating: number;
  is_free: boolean;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  profiles: {
    id: number;
    display_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface AdminCourseDetails extends AdminCourse {
  course_module: Array<{
    id: number;
    title: string;
    position: number;
    course_lesson: Array<{
      id: number;
      title: string;
      kind: string;
      duration_sec?: number;
      is_preview: boolean;
    }>;
  }>;
  stats: {
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
  };
}

export interface AdminCourseFilters {
  status?: string;
  category?: string;
  search?: string;
  owner_id?: string;
  page?: number;
  limit?: number;
}

export interface AdminCoursesResponse {
  courses: AdminCourse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminCourseAnalytics {
  overview: {
    totalCourses: number;
    activeCourses: number;
    pendingCourses: number;
    inactiveCourses: number;
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    totalRevenue: number;
    totalTransactions: number;
  };
  distributions: {
    status: Record<string, number>;
    category: Record<string, number>;
  };
  recentCourses: Array<{
    id: number;
    title: string;
    status: string;
    created_at: string;
    profiles: { display_name: string };
  }>;
  topCourses: Array<{
    id: number;
    title: string;
    total_students: number;
    average_rating: number;
    total_lessons: number;
    profiles: { display_name: string };
  }>;
  pendingCourses: Array<{
    id: number;
    public_id: string;
    title: string;
    created_at: string;
    profiles: { display_name: string; email: string };
  }>;
  period: number;
}
