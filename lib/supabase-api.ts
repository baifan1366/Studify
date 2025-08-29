/**
 * Supabase API Service
 * Centralized service for all Supabase database operations
 */

import { User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase/client';

// Types based on actual database schema
export interface Profile {
  user_id: string;
  display_name?: string;
  role: 'admin' | 'student' | 'tutor' | 'parent';
  avatar_url?: string;
  bio?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  owner_id: string;
  title: string;
  description?: string;
  visibility: 'public' | 'private' | 'unlisted';
  price_cents: number;
  currency: string;
  tags: string[];
  updated_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  position: number;
  updated_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  module_id?: string;
  title: string;
  kind: 'video' | 'live' | 'document' | 'quiz' | 'assignment' | 'whiteboard';
  content_url?: string;
  duration_sec?: number;
  live_session_id?: string;
  updated_at: string;
}

export interface Enrollment {
  course_id: string;
  user_id: string;
  enrolled_at: string;
  progress_pct: number;
  completed_at?: string;
}

export interface Quiz {
  id: string;
  course_id?: string;
  title: string;
  settings: {
    shuffle?: boolean;
    time_limit?: number;
  };
}

export interface Question {
  id: string;
  bank_id?: string;
  stem: string;
  kind: 'mcq' | 'true_false' | 'short' | 'essay' | 'code';
  choices?: any;
  answer?: any;
  difficulty?: number;
}

export interface Attempt {
  id: string;
  quiz_id: string;
  user_id: string;
  started_at: string;
  submitted_at?: string;
  score: number;
}

export interface Notification {
  id: string;
  user_id: string;
  kind: string;
  payload: any;
  is_read: boolean;
}

/**
 * Authentication Services
 */
export const authService = {
  // Get current user
  getCurrentUser: async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Sign up new user
  signUp: async (email: string, password: string, metadata?: any) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
  },

  // Sign in user
  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  },

  // Sign out user
  signOut: async () => {
    return await supabase.auth.signOut();
  },

  // Reset password
  resetPassword: async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email);
  }
};

/**
 * Profile Services
 */
export const profileService = {
  // Get user profile
  getProfile: async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('core.profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  },

  // Update user profile
  updateProfile: async (userId: string, updates: Partial<Profile>) => {
    return await supabase
      .from('core.profiles')
      .update(updates)
      .eq('user_id', userId);
  },

  // Create user profile
  createProfile: async (profile: Omit<Profile, 'created_at' | 'updated_at'>) => {
    return await supabase
      .from('core.profiles')
      .insert([profile]);
  }
};

/**
 * Course Services
 */
export const courseService = {
  // Get all public courses
  getAllCourses: async (): Promise<Course[]> => {
    const { data, error } = await supabase
      .from('courses.course')
      .select('*')
      .eq('visibility', 'public')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      return [];
    }

    return data || [];
  },

  // Get course by ID
  getCourseById: async (courseId: string): Promise<Course | null> => {
    const { data, error } = await supabase
      .from('courses.course')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error) {
      console.error('Error fetching course:', error);
      return null;
    }

    return data;
  },

  // Create new course
  createCourse: async (course: Omit<Course, 'id' | 'updated_at'>) => {
    return await supabase
      .from('courses.course')
      .insert([course]);
  },

  // Update course
  updateCourse: async (courseId: string, updates: Partial<Course>) => {
    return await supabase
      .from('courses.course')
      .update(updates)
      .eq('id', courseId);
  },

  // Delete course
  deleteCourse: async (courseId: string) => {
    return await supabase
      .from('courses.course')
      .delete()
      .eq('id', courseId);
  }
};

/**
 * Enrollment Services
 */
export const enrollmentService = {
  // Get user enrollments
  getUserEnrollments: async (userId: string): Promise<Enrollment[]> => {
    const { data, error } = await supabase
      .from('courses.enrollment')
      .select('*')
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.error('Error fetching enrollments:', error);
      return [];
    }

    return data || [];
  },

  // Enroll user in course
  enrollInCourse: async (userId: string, courseId: string) => {
    return await supabase
      .from('courses.enrollment')
      .insert([{
        user_id: userId,
        course_id: courseId,
        progress_pct: 0
      }]);
  },

  // Update enrollment progress
  updateProgress: async (userId: string, courseId: string, progress: number) => {
    const updates: any = {
      progress_pct: progress
    };

    if (progress >= 100) {
      updates.completed_at = new Date().toISOString();
    }

    return await supabase
      .from('courses.enrollment')
      .update(updates)
      .eq('user_id', userId)
      .eq('course_id', courseId);
  },

  // Unenroll from course
  unenrollFromCourse: async (userId: string, courseId: string) => {
    return await supabase
      .from('courses.enrollment')
      .delete()
      .eq('user_id', userId)
      .eq('course_id', courseId);
  }
};

/**
 * Quiz Services 
 */
export const quizService = {
  // Get quizzes for a course
  getCourseQuizzes: async (courseId: string): Promise<Quiz[]> => {
    const { data, error } = await supabase
      .from('assessment.quiz')
      .select('*')
      .eq('course_id', courseId);

    if (error) {
      console.error('Error fetching quizzes:', error);
      return [];
    }

    return data || [];
  },

  // Get quiz by ID
  getQuizById: async (quizId: string): Promise<Quiz | null> => {
    const { data, error } = await supabase
      .from('assessment.quiz')
      .select('*')
      .eq('id', quizId)
      .single();

    if (error) {
      console.error('Error fetching quiz:', error);
      return null;
    }

    return data;
  },

  // Create quiz
  createQuiz: async (quiz: Omit<Quiz, 'id'>) => {
    return await supabase
      .from('assessment.quiz')
      .insert([quiz]);
  },

  // Update quiz
  updateQuiz: async (quizId: string, updates: Partial<Quiz>) => {
    return await supabase
      .from('assessment.quiz')
      .update(updates)
      .eq('id', quizId);
  },

  // Delete quiz
  deleteQuiz: async (quizId: string) => {
    return await supabase
      .from('assessment.quiz')
      .delete()
      .eq('id', quizId);
  }
};

/**
 * Module Services
 */
export const moduleService = {
  // Get modules for a course
  getCourseModules: async (courseId: string): Promise<Module[]> => {
    const { data, error } = await supabase
      .from('courses.module')
      .select('*')
      .eq('course_id', courseId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching modules:', error);
      return [];
    }

    return data || [];
  },

  // Create module
  createModule: async (module: Omit<Module, 'id' | 'updated_at'>) => {
    return await supabase
      .from('courses.module')
      .insert([module]);
  },

  // Update module
  updateModule: async (moduleId: string, updates: Partial<Module>) => {
    return await supabase
      .from('courses.module')
      .update(updates)
      .eq('id', moduleId);
  },

  // Delete module
  deleteModule: async (moduleId: string) => {
    return await supabase
      .from('courses.module')
      .delete()
      .eq('id', moduleId);
  }
};

/**
 * Lesson Services
 */
export const lessonService = {
  // Get lessons for a course
  getCourseLessons: async (courseId: string): Promise<Lesson[]> => {
    const { data, error } = await supabase
      .from('courses.lesson')
      .select('*')
      .eq('course_id', courseId);

    if (error) {
      console.error('Error fetching lessons:', error);
      return [];
    }

    return data || [];
  },

  // Get lessons for a module
  getModuleLessons: async (moduleId: string): Promise<Lesson[]> => {
    const { data, error } = await supabase
      .from('courses.lesson')
      .select('*')
      .eq('module_id', moduleId);

    if (error) {
      console.error('Error fetching module lessons:', error);
      return [];
    }

    return data || [];
  },

  // Create lesson
  createLesson: async (lesson: Omit<Lesson, 'id' | 'updated_at'>) => {
    return await supabase
      .from('courses.lesson')
      .insert([lesson]);
  },

  // Update lesson
  updateLesson: async (lessonId: string, updates: Partial<Lesson>) => {
    return await supabase
      .from('courses.lesson')
      .update(updates)
      .eq('id', lessonId);
  },

  // Delete lesson
  deleteLesson: async (lessonId: string) => {
    return await supabase
      .from('courses.lesson')
      .delete()
      .eq('id', lessonId);
  }
};

/**
 * Notification Services
 */
export const notificationService = {
  // Get user notifications
  getUserNotifications: async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase
      .from('core.notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  },

  // Mark notification as read
  markAsRead: async (notificationId: string) => {
    return await supabase
      .from('core.notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  },

  // Create notification
  createNotification: async (notification: Omit<Notification, 'id'>) => {
    return await supabase
      .from('core.notifications')
      .insert([notification]);
  },

  // Delete notification
  deleteNotification: async (notificationId: string) => {
    return await supabase
      .from('core.notifications')
      .delete()
      .eq('id', notificationId);
  }
};

/**
 * Attempt Services (replacing Submission Services)
 */
export const attemptService = {
  // Get user attempts
  getUserAttempts: async (userId: string): Promise<Attempt[]> => {
    const { data, error } = await supabase
      .from('assessment.attempt')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching attempts:', error);
      return [];
    }

    return data || [];
  },

  // Start quiz attempt
  startAttempt: async (quizId: string, userId: string) => {
    return await supabase
      .from('assessment.attempt')
      .insert([{
        quiz_id: quizId,
        user_id: userId,
        score: 0
      }]);
  },

  // Submit quiz attempt
  submitAttempt: async (attemptId: string, score: number) => {
    return await supabase
      .from('assessment.attempt')
      .update({
        submitted_at: new Date().toISOString(),
        score
      })
      .eq('id', attemptId);
  },

  // Get attempt by ID
  getAttemptById: async (attemptId: string): Promise<Attempt | null> => {
    const { data, error } = await supabase
      .from('assessment.attempt')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (error) {
      console.error('Error fetching attempt:', error);
      return null;
    }

    return data;
  }
};

/**
 * Utility Functions
 */
export const supabaseUtils = {
  // Check if user is authenticated
  isAuthenticated: async (): Promise<boolean> => {
    const user = await authService.getCurrentUser();
    return !!user;
  },

  // Get user role (if you have roles table)
  getUserRole: async (userId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
    
    return data?.role || null;
  },

  // Real-time subscription helper
  subscribeToTable: (table: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`public:${table}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table }, 
        callback
      )
      .subscribe();
  }
};

// Export the supabase client for direct access if needed
export { supabase };

// Default export with all services
export default {
  auth: authService,
  profile: profileService,
  course: courseService,
  module: moduleService,
  lesson: lessonService,
  enrollment: enrollmentService,
  quiz: quizService,
  attempt: attemptService,
  notification: notificationService,
  utils: supabaseUtils
};
