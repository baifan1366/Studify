/**
 * Auto-creation flow for classroom and community when course is approved
 */

import { createAdminClient } from '@/utils/supabase/server';

export interface AutoCreationResult {
  success: boolean;
  classroomCreated?: boolean;
  communityCreated?: boolean;
  errors?: string[];
  classroomId?: number;
  communityId?: number;
}

/**
 * Handle auto-creation of classroom and community after course approval
 */
export async function handleCourseApprovalAutoCreation(
  courseId: number,
  courseName: string,
  courseSlug: string,
  tutorProfileId: number,
  autoCreateClassroom: boolean,
  autoCreateCommunity: boolean
): Promise<AutoCreationResult> {
  console.log('[AutoCreation] Starting auto-creation flow for course:', courseId);
  
  // Validate input parameters
  if (!courseName?.trim()) {
    return {
      success: false,
      classroomCreated: false,
      communityCreated: false,
      errors: ['Course name is required for auto-creation']
    };
  }
  
  if (!courseSlug?.trim()) {
    return {
      success: false,
      classroomCreated: false,
      communityCreated: false,
      errors: ['Course slug is required for auto-creation']
    };
  }
  
  const result: AutoCreationResult = {
    success: false,
    classroomCreated: false,
    communityCreated: false,
    errors: []
  };

  const supabase = await createAdminClient();

  // Get the course owner_id from the course table
  const { data: courseData, error: courseError } = await supabase
    .from('course')
    .select('owner_id')
    .eq('id', courseId)
    .single();

  if (courseError || !courseData) {
    return {
      success: false,
      classroomCreated: false,
      communityCreated: false,
      errors: [`Failed to get course owner: ${courseError?.message || 'Course not found'}`]
    };
  }

  const courseOwnerId = courseData.owner_id;
  console.log('[AutoCreation] Course owner ID:', courseOwnerId);

  // Auto-create classroom if requested
  if (autoCreateClassroom) {
    try {
      const classroomResult = await createClassroomForCourse(
        supabase,
        courseName,
        courseSlug,
        courseOwnerId
      );
      
      if (classroomResult.success) {
        result.classroomCreated = true;
        result.classroomId = classroomResult.classroomId;
        console.log('[AutoCreation] Classroom created successfully:', classroomResult.classroomId);
      } else {
        result.errors?.push(classroomResult.error || 'Failed to create classroom');
        console.error('[AutoCreation] Classroom creation failed:', classroomResult.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown classroom creation error';
      result.errors?.push(errorMessage);
      console.error('[AutoCreation] Classroom creation exception:', error);
    }
  }

  // Auto-create community if requested
  if (autoCreateCommunity) {
    try {
      const communityResult = await createCommunityForCourse(
        supabase,
        courseName,
        courseSlug,
        courseOwnerId
      );
      
      if (communityResult.success) {
        result.communityCreated = true;
        result.communityId = communityResult.communityId;
        console.log('[AutoCreation] Community created successfully:', communityResult.communityId);
      } else {
        result.errors?.push(communityResult.error || 'Failed to create community');
        console.error('[AutoCreation] Community creation failed:', communityResult.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown community creation error';
      result.errors?.push(errorMessage);
      console.error('[AutoCreation] Community creation exception:', error);
    }
  }

  result.success = result.errors?.length === 0;
  
  console.log('[AutoCreation] Auto-creation flow completed:', result);
  return result;
}

/**
 * Create classroom for course
 */
async function createClassroomForCourse(
  supabase: any,
  courseName: string,
  courseSlug: string,
  courseOwnerId: number
) {
  // Ensure courseName is not empty and provide fallback
  const safeCourseTitle = courseName?.trim() || 'Course';
  const classroomName = `${safeCourseTitle} - Classroom`;
  const classroomSlug = `${courseSlug}-classroom`;

  console.log('[AutoCreation] Checking if classroom exists:', { name: classroomName, slug: classroomSlug });

  // Check if classroom already exists (check by slug for uniqueness)
  const { data: existingClassroom } = await supabase
    .from('classroom')
    .select('id, name')
    .eq('slug', classroomSlug)
    .eq('is_deleted', false)
    .maybeSingle();

  if (existingClassroom) {
    console.log('[AutoCreation] Classroom already exists:', existingClassroom.id);
    return {
      success: true,
      classroomId: existingClassroom.id,
      error: null
    };
  }

  // Generate unique class code
  const classCode = generateClassCode();

  // Create classroom with robust content for embedding - ensure no null values
  const classroomDescription = `Classroom for ${safeCourseTitle}. Join this classroom to participate in discussions, activities, and collaborative learning related to the course. This is an interactive learning environment where students can engage with course materials, ask questions, share insights, and connect with peers and instructors.`;
  
  const { data: classroom, error: classroomError } = await supabase
    .from('classroom')
    .insert({
      name: classroomName,
      description: classroomDescription,
      visibility: 'public',
      class_code: classCode,
      slug: classroomSlug,
      owner_id: courseOwnerId,
    })
    .select('id')
    .single();

  if (classroomError) {
    console.error('[AutoCreation] Failed to create classroom:', classroomError);
    return {
      success: false,
      error: `Failed to create classroom: ${classroomError.message}`
    };
  }

  // Add course owner as classroom owner member
  const { error: memberError } = await supabase
    .from('classroom_member')
    .insert({
      classroom_id: classroom.id,
      user_id: courseOwnerId,
      role: 'owner',
    });

  if (memberError) {
    console.error('[AutoCreation] Failed to add course owner as classroom member:', memberError);
    // Don't fail the whole process for this
  }

  return {
    success: true,
    classroomId: classroom.id,
    error: null
  };
}

/**
 * Create community group for course
 */
async function createCommunityForCourse(
  supabase: any,
  courseName: string,
  courseSlug: string,
  courseOwnerId: number
) {
  // Ensure courseName is not empty and provide fallback
  const safeCourseTitle = courseName?.trim() || 'Course';
  const communityName = `${safeCourseTitle} - Group`;

  const communitySlug = `${courseSlug}-group`;

  console.log('[AutoCreation] Checking if community exists:', { name: communityName, slug: communitySlug });

  // Check if community already exists by slug first
  const { data: existingCommunity } = await supabase
    .from('community_group')
    .select('id, name, slug')
    .eq('slug', communitySlug)
    .eq('is_deleted', false)
    .maybeSingle();

  if (existingCommunity) {
    console.log('[AutoCreation] Community already exists:', existingCommunity.id, 'with slug:', existingCommunity.slug);
    return {
      success: true,
      communityId: existingCommunity.id,
      error: null
    };
  }

  // Double check by name as well in case slug was different
  const { data: existingByName } = await supabase
    .from('community_group')
    .select('id, name, slug')
    .eq('name', communityName)
    .eq('is_deleted', false)
    .maybeSingle();

  if (existingByName) {
    console.log('[AutoCreation] Community already exists by name:', existingByName.id, 'with slug:', existingByName.slug);
    return {
      success: true,
      communityId: existingByName.id,
      error: null
    };
  }

  // Create community group with robust content for embedding - ensure no null values
  const communityDescription = `Discussion group for ${safeCourseTitle}. Connect with other learners, ask questions, share insights, and engage in meaningful discussions about the course content. This community provides a platform for collaborative learning, peer support, knowledge sharing, and building connections with fellow students and educators.`;
  
  const { data: community, error: communityError } = await supabase
    .from('community_group')
    .insert({
      name: communityName,
      description: communityDescription,
      slug: communitySlug,
      visibility: 'public',
      owner_id: courseOwnerId
    })
    .select('id')
    .single();

  if (communityError) {
    console.error('[AutoCreation] Failed to create community:', communityError);
    return {
      success: false,
      error: `Failed to create community: ${communityError.message}`
    };
  }

  // Add course owner as community owner member
  const { error: memberError } = await supabase
    .from('community_group_member')
    .insert({
      group_id: community.id,
      user_id: courseOwnerId,
      role: 'owner'
    });

  if (memberError) {
    console.error('[AutoCreation] Failed to add course owner as community member:', memberError);
    // Don't fail the whole process for this
  }

  return {
    success: true,
    communityId: community.id,
    error: null
  };
}

/**
 * Generate classroom invite code
 */
function generateClassCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
