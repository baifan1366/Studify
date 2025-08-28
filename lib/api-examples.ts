/**
 * API Usage Examples
 * Examples showing how to use the Supabase API services
 */

import supabaseApi, { 
  authService, 
  profileService, 
  courseService, 
  enrollmentService, 
  assignmentService,
  submissionService,
  supabaseUtils
} from './supabase-api';

/**
 * Authentication Examples
 */
export const authExamples = {
  // Example: User login
  loginUser: async (email: string, password: string) => {
    try {
      const { data, error } = await authService.signIn(email, password);
      
      if (error) {
        console.error('Login failed:', error.message);
        return { success: false, error: error.message };
      }
      
      console.log('Login successful:', data.user);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  // Example: User registration
  registerUser: async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await authService.signUp(email, password, {
        full_name: fullName
      });
      
      if (error) {
        console.error('Registration failed:', error.message);
        return { success: false, error: error.message };
      }
      
      console.log('Registration successful:', data.user);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  // Example: Check if user is authenticated
  checkAuth: async () => {
    try {
      const isAuth = await supabaseUtils.isAuthenticated();
      const user = await authService.getCurrentUser();
      
      return {
        isAuthenticated: isAuth,
        user: user
      };
    } catch (error) {
      console.error('Auth check error:', error);
      return { isAuthenticated: false, user: null };
    }
  }
};

/**
 * Profile Management Examples
 */
export const profileExamples = {
  // Example: Get and display user profile
  getUserProfile: async (userId: string) => {
    try {
      const profile = await profileService.getProfile(userId);
      
      if (!profile) {
        console.log('Profile not found');
        return null;
      }
      
      console.log('User profile:', profile);
      return profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  },

  // Example: Update user profile
  updateUserProfile: async (userId: string, updates: { full_name?: string; avatar_url?: string }) => {
    try {
      const { data, error } = await profileService.updateProfile(userId, updates);
      
      if (error) {
        console.error('Profile update failed:', error.message);
        return { success: false, error: error.message };
      }
      
      console.log('Profile updated successfully');
      return { success: true, data };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
};

/**
 * Course Management Examples
 */
export const courseExamples = {
  // Example: Get all available courses
  getAllCourses: async () => {
    try {
      const courses = await courseService.getAllCourses();
      console.log(`Found ${courses.length} courses:`, courses);
      return courses;
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  },

  // Example: Get course details
  getCourseDetails: async (courseId: number) => {
    try {
      const course = await courseService.getCourseById(courseId);
      
      if (!course) {
        console.log('Course not found');
        return null;
      }
      
      console.log('Course details:', course);
      return course;
    } catch (error) {
      console.error('Error fetching course details:', error);
      return null;
    }
  },

  // Example: Create a new course
  createNewCourse: async (courseData: {
    title: string;
    description: string;
    instructor_id: string;
    difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  }) => {
    try {
      const { data, error } = await courseService.createCourse({
        ...courseData,
        published: false // Default to unpublished
      });
      
      if (error) {
        console.error('Course creation failed:', error.message);
        return { success: false, error: error.message };
      }
      
      console.log('Course created successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Course creation error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
};

/**
 * Enrollment Examples
 */
export const enrollmentExamples = {
  // Example: Get user's enrolled courses
  getUserEnrollments: async (userId: string) => {
    try {
      const enrollments = await enrollmentService.getUserEnrollments(userId);
      console.log(`User has ${enrollments.length} enrollments:`, enrollments);
      return enrollments;
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      return [];
    }
  },

  // Example: Enroll user in a course
  enrollUserInCourse: async (userId: string, courseId: number) => {
    try {
      const { data, error } = await enrollmentService.enrollInCourse(userId, courseId);
      
      if (error) {
        console.error('Enrollment failed:', error.message);
        return { success: false, error: error.message };
      }
      
      console.log('Enrollment successful:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Enrollment error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  // Example: Update course progress
  updateCourseProgress: async (enrollmentId: number, progress: number) => {
    try {
      const { data, error } = await enrollmentService.updateProgress(enrollmentId, progress);
      
      if (error) {
        console.error('Progress update failed:', error.message);
        return { success: false, error: error.message };
      }
      
      console.log('Progress updated successfully');
      return { success: true, data };
    } catch (error) {
      console.error('Progress update error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
};

/**
 * Assignment Examples
 */
export const assignmentExamples = {
  // Example: Get user's assignments
  getUserAssignments: async (userId: string) => {
    try {
      const assignments = await assignmentService.getUserAssignments(userId);
      console.log(`User has ${assignments.length} assignments:`, assignments);
      return assignments;
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  },

  // Example: Create a new assignment
  createAssignment: async (assignmentData: {
    course_id: number;
    title: string;
    description: string;
    due_date: string;
    max_points: number;
    assignment_type: 'homework' | 'quiz' | 'project' | 'exam';
  }) => {
    try {
      const { data, error } = await assignmentService.createAssignment(assignmentData);
      
      if (error) {
        console.error('Assignment creation failed:', error.message);
        return { success: false, error: error.message };
      }
      
      console.log('Assignment created successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Assignment creation error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
};

/**
 * Submission Examples
 */
export const submissionExamples = {
  // Example: Submit an assignment
  submitAssignment: async (submissionData: {
    assignment_id: number;
    user_id: string;
    content: string;
  }) => {
    try {
      const { data, error } = await submissionService.submitAssignment(submissionData);
      
      if (error) {
        console.error('Submission failed:', error.message);
        return { success: false, error: error.message };
      }
      
      console.log('Assignment submitted successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Submission error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  // Example: Get user's submissions
  getUserSubmissions: async (userId: string) => {
    try {
      const submissions = await submissionService.getUserSubmissions(userId);
      console.log(`User has ${submissions.length} submissions:`, submissions);
      return submissions;
    } catch (error) {
      console.error('Error fetching submissions:', error);
      return [];
    }
  }
};

/**
 * Real-time Examples
 */
export const realtimeExamples = {
  // Example: Subscribe to course updates
  subscribeToCourseUpdates: (callback: (payload: any) => void) => {
    const subscription = supabaseUtils.subscribeToTable('courses', (payload) => {
      console.log('Course update received:', payload);
      callback(payload);
    });
    
    return subscription;
  },

  // Example: Subscribe to new assignments
  subscribeToAssignments: (callback: (payload: any) => void) => {
    const subscription = supabaseUtils.subscribeToTable('assignments', (payload) => {
      console.log('Assignment update received:', payload);
      callback(payload);
    });
    
    return subscription;
  }
};

/**
 * Complete workflow example
 */
export const workflowExample = {
  // Example: Complete student enrollment workflow
  studentEnrollmentWorkflow: async (email: string, password: string, courseId: number) => {
    try {
      // 1. Login user
      const loginResult = await authExamples.loginUser(email, password);
      if (!loginResult.success) {
        return { success: false, step: 'login', error: loginResult.error };
      }
      
      const userId = loginResult.user?.id;
      if (!userId) {
        return { success: false, step: 'login', error: 'User ID not found' };
      }
      
      // 2. Get user profile
      const profile = await profileExamples.getUserProfile(userId);
      if (!profile) {
        return { success: false, step: 'profile', error: 'Profile not found' };
      }
      
      // 3. Enroll in course
      const enrollmentResult = await enrollmentExamples.enrollUserInCourse(userId, courseId);
      if (!enrollmentResult.success) {
        return { success: false, step: 'enrollment', error: enrollmentResult.error };
      }
      
      // 4. Get course assignments
      const assignments = await assignmentExamples.getUserAssignments(userId);
      
      return {
        success: true,
        data: {
          user: loginResult.user,
          profile,
          enrollment: enrollmentResult.data,
          assignments
        }
      };
    } catch (error) {
      console.error('Workflow error:', error);
      return { success: false, step: 'unknown', error: 'An unexpected error occurred' };
    }
  }
};

// Export all examples
export default {
  auth: authExamples,
  profile: profileExamples,
  course: courseExamples,
  enrollment: enrollmentExamples,
  assignment: assignmentExamples,
  submission: submissionExamples,
  realtime: realtimeExamples,
  workflow: workflowExample
};
