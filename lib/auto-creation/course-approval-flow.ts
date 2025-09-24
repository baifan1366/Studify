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
  
  const result: AutoCreationResult = {
    success: false,
    classroomCreated: false,
    communityCreated: false,
    errors: []
  };

  const supabase = await createAdminClient();

  // Auto-create classroom if requested
  if (autoCreateClassroom) {
    try {
      const classroomResult = await createClassroomForCourse(
        supabase,
        courseName,
        courseSlug,
        tutorProfileId
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
        tutorProfileId
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
  tutorProfileId: number
) {
  const classroomName = `${courseName} - Classroom`;
  const classroomSlug = `${courseSlug}-classroom`;

  console.log('[AutoCreation] Checking if classroom exists:', { name: classroomName, slug: classroomSlug });

  // Check if classroom already exists
  const { data: existingClassroom } = await supabase
    .from('classroom')
    .select('id')
    .eq('name', classroomName)
    .eq('slug', classroomSlug)
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

  // Create classroom
  const { data: classroom, error: classroomError } = await supabase
    .from('classroom')
    .insert({
      name: classroomName,
      description: `Classroom for ${courseName}`,
      visibility: 'public',
      class_code: classCode,
      slug: classroomSlug,
      owner_id: tutorProfileId,
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

  // Add tutor as owner member
  const { error: memberError } = await supabase
    .from('classroom_member')
    .insert({
      classroom_id: classroom.id,
      user_id: tutorProfileId,
      role: 'owner',
    });

  if (memberError) {
    console.error('[AutoCreation] Failed to add tutor as classroom member:', memberError);
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
  tutorProfileId: number
) {
  const communityName = `${courseName} - Group`;
  const communitySlug = `${courseSlug}-group`;

  console.log('[AutoCreation] Checking if community exists:', { name: communityName, slug: communitySlug });

  // Check if community already exists
  const { data: existingCommunity } = await supabase
    .from('community_group')
    .select('id')
    .eq('name', communityName)
    .eq('slug', communitySlug)
    .eq('is_deleted', false)
    .maybeSingle();

  if (existingCommunity) {
    console.log('[AutoCreation] Community already exists:', existingCommunity.id);
    return {
      success: true,
      communityId: existingCommunity.id,
      error: null
    };
  }

  // Create community group
  const { data: community, error: communityError } = await supabase
    .from('community_group')
    .insert({
      name: communityName,
      description: `Discussion group for ${courseName}`,
      slug: communitySlug,
      visibility: 'public',
      owner_id: tutorProfileId
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

  // Add tutor as owner member
  const { error: memberError } = await supabase
    .from('community_group_member')
    .insert({
      group_id: community.id,
      user_id: tutorProfileId,
      role: 'owner'
    });

  if (memberError) {
    console.error('[AutoCreation] Failed to add tutor as community member:', memberError);
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
