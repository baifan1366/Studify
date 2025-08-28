/**
 * Supabase API Service
 * Centralized service for all Supabase database operations
 */

import { User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase/client';

// Types for better type safety
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  instructor_id: string;
  created_at: string;
  updated_at: string;
  published: boolean;
  thumbnail_url?: string;
  duration?: number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
}

export interface Enrollment {
  id: number;
  user_id: string;
  course_id: number;
  enrolled_at: string;
  progress: number;
  completed: boolean;
  last_accessed?: string;
}

export interface Assignment {
  id: number;
  course_id: number;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  max_points: number;
  assignment_type: 'homework' | 'quiz' | 'project' | 'exam';
}

export interface Submission {
  id: number;
  assignment_id: number;
  user_id: string;
  content: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'late' | 'missing';
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
      .from('profiles')
      .select('*')
      .eq('id', userId)
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
      .from('profiles')
      .update(updates)
      .eq('id', userId);
  },

  // Create user profile
  createProfile: async (profile: Omit<Profile, 'created_at' | 'updated_at'>) => {
    return await supabase
      .from('profiles')
      .insert([profile]);
  }
};

/**
 * Course Services
 */
export const courseService = {
  // Get all courses
  getAllCourses: async (): Promise<Course[]> => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
    
    return data || [];
  },

  // Get course by ID
  getCourseById: async (courseId: number): Promise<Course | null> => {
    const { data, error } = await supabase
      .from('courses')
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
  createCourse: async (course: Omit<Course, 'id' | 'created_at' | 'updated_at'>) => {
    return await supabase
      .from('courses')
      .insert([course]);
  },

  // Update course
  updateCourse: async (courseId: number, updates: Partial<Course>) => {
    return await supabase
      .from('courses')
      .update(updates)
      .eq('id', courseId);
  },

  // Delete course
  deleteCourse: async (courseId: number) => {
    return await supabase
      .from('courses')
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
      .from('enrollments')
      .select(`
        *,
        courses (
          id,
          title,
          description,
          thumbnail_url,
          difficulty_level
        )
      `)
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching enrollments:', error);
      return [];
    }
    
    return data || [];
  },

  // Enroll user in course
  enrollInCourse: async (userId: string, courseId: number) => {
    return await supabase
      .from('enrollments')
      .insert([{
        user_id: userId,
        course_id: courseId,
        progress: 0,
        completed: false
      }]);
  },

  // Update enrollment progress
  updateProgress: async (enrollmentId: number, progress: number) => {
    return await supabase
      .from('enrollments')
      .update({ 
        progress,
        completed: progress >= 100,
        last_accessed: new Date().toISOString()
      })
      .eq('id', enrollmentId);
  },

  // Unenroll from course
  unenrollFromCourse: async (userId: string, courseId: number) => {
    return await supabase
      .from('enrollments')
      .delete()
      .eq('user_id', userId)
      .eq('course_id', courseId);
  }
};

/**
 * Assignment Services
 */
export const assignmentService = {
  // Get assignments for a course
  getCourseAssignments: async (courseId: number): Promise<Assignment[]> => {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId)
      .order('due_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
    
    return data || [];
  },

  // Get user assignments (across all enrolled courses)
  getUserAssignments: async (userId: string): Promise<Assignment[]> => {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        courses!inner (
          enrollments!inner (
            user_id
          )
        )
      `)
      .eq('courses.enrollments.user_id', userId)
      .order('due_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching user assignments:', error);
      return [];
    }
    
    return data || [];
  },

  // Create assignment
  createAssignment: async (assignment: Omit<Assignment, 'id' | 'created_at' | 'updated_at'>) => {
    return await supabase
      .from('assignments')
      .insert([assignment]);
  },

  // Update assignment
  updateAssignment: async (assignmentId: number, updates: Partial<Assignment>) => {
    return await supabase
      .from('assignments')
      .update(updates)
      .eq('id', assignmentId);
  },

  // Delete assignment
  deleteAssignment: async (assignmentId: number) => {
    return await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId);
  }
};

/**
 * Submission Services
 */
export const submissionService = {
  // Get user submissions
  getUserSubmissions: async (userId: string): Promise<Submission[]> => {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        assignments (
          id,
          title,
          due_date,
          max_points
        )
      `)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching submissions:', error);
      return [];
    }
    
    return data || [];
  },

  // Submit assignment
  submitAssignment: async (submission: Omit<Submission, 'id' | 'submitted_at'>) => {
    return await supabase
      .from('submissions')
      .insert([{
        ...submission,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      }]);
  },

  // Grade submission
  gradeSubmission: async (submissionId: number, grade: number, feedback?: string) => {
    return await supabase
      .from('submissions')
      .update({
        grade,
        feedback,
        status: 'graded'
      })
      .eq('id', submissionId);
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
  enrollment: enrollmentService,
  assignment: assignmentService,
  submission: submissionService,
  utils: supabaseUtils
};
