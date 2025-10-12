/**
 * Student Enrollment Auto-Creation Flow
 * Handles automatic classroom and community joining after course enrollment
 */

export interface EnrollmentFlowResult {
  success: boolean;
  error?: string;
  classroomResult?: {
    created: boolean;
    joined: boolean;
    name?: string;
    error?: string;
  };
  communityResult?: {
    created: boolean;
    joined: boolean;
    name?: string;
    error?: string;
  };
}

/**
 * Handle complete student enrollment auto-creation flow
 * According to requirements:
 * 1. Check if course has auto_create_classroom and auto_create_community flags
 * 2. If yes, check if classroom exists (course.name + " - Classroom")
 * 3. Create classroom if doesn't exist, join user as member
 * 4. Check if community exists (course.name + " - Group")  
 * 5. Create community if doesn't exist, join user as member
 */
export async function handleStudentEnrollmentFlow(
  supabase: any,
  course: any,
  userId: number
): Promise<EnrollmentFlowResult> {
  try {
    console.log(`[StudentEnrollmentFlow] Starting auto-creation flow for course: ${course.title}, user: ${userId}`);
    
    const result: EnrollmentFlowResult = { success: true };

    // Check if course has auto-creation flags enabled
    const hasAutoClassroom = course.auto_create_classroom === true;
    const hasAutoCommunity = course.auto_create_community === true;

    console.log(`[StudentEnrollmentFlow] Auto-creation flags - Classroom: ${hasAutoClassroom}, Community: ${hasAutoCommunity}`);

    if (!hasAutoClassroom && !hasAutoCommunity) {
      console.log('[StudentEnrollmentFlow] No auto-creation flags enabled, skipping auto-creation');
      return result;
    }

    // Handle classroom creation and joining
    if (hasAutoClassroom) {
      console.log('[StudentEnrollmentFlow] Processing classroom auto-creation');
      const classroomResult = await handleClassroomAutoCreation(supabase, course, userId);
      result.classroomResult = classroomResult;
      
      if (!classroomResult.success) {
        console.error('[StudentEnrollmentFlow] Classroom auto-creation failed:', classroomResult.error);
        // Don't fail the entire flow, just log the error
      }
    }

    // Handle community creation and joining
    if (hasAutoCommunity) {
      console.log('[StudentEnrollmentFlow] Processing community auto-creation');
      const communityResult = await handleCommunityAutoCreation(supabase, course, userId);
      result.communityResult = communityResult;
      
      if (!communityResult.success) {
        console.error('[StudentEnrollmentFlow] Community auto-creation failed:', communityResult.error);
        // Don't fail the entire flow, just log the error
      }
    }

    console.log('[StudentEnrollmentFlow] Auto-creation flow completed successfully');
    return result;

  } catch (error) {
    console.error('[StudentEnrollmentFlow] Unexpected error in enrollment flow:', error);
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Handle classroom auto-creation and joining
 */
async function handleClassroomAutoCreation(
  supabase: any,
  course: any,
  userId: number
): Promise<{ success: boolean; created: boolean; joined: boolean; name?: string; error?: string }> {
  try {
    const safeCourseTitle = course.title?.trim() || 'Course';
    const classroomName = `${safeCourseTitle} - Classroom`;
    const classroomSlug = `${course.slug}-classroom`;
    console.log(`[ClassroomAutoCreation] Looking for classroom: ${classroomName}, slug: ${classroomSlug}`);

    // First, try to find by slug (most reliable since slug is unique)
    let { data: existingClassroom, error: classroomError } = await supabase
      .from('classroom')
      .select('*')
      .eq('slug', classroomSlug)
      .eq('is_deleted', false)
      .maybeSingle();

    // If not found by slug, try by name and owner_id as fallback
    if (!existingClassroom && !classroomError) {
      console.log(`[ClassroomAutoCreation] Classroom not found by slug, trying by name`);
      const result = await supabase
        .from('classroom')
        .select('*')
        .eq('name', classroomName)
        .eq('owner_id', course.owner_id)
        .eq('is_deleted', false)
        .maybeSingle();
      
      existingClassroom = result.data;
      classroomError = result.error;
    }

    if (classroomError) {
      console.error('[ClassroomAutoCreation] Failed to lookup classroom:', classroomError);
      return { 
        success: false, 
        created: false, 
        joined: false,
        error: `Failed to lookup classroom: ${classroomError.message}`,
        name: classroomName
      };
    }

    let classroomId;
    let wasCreated = false;

    if (!existingClassroom) {
      console.log('[ClassroomAutoCreation] Classroom not found, creating new one');
      
      // Create new classroom with consistent naming (matching course-approval-flow)
      const classroomDescription = `Classroom for ${safeCourseTitle}. Join this classroom to participate in discussions, activities, and collaborative learning related to the course. This is an interactive learning environment where students can engage with course materials, ask questions, share insights, and connect with peers and instructors.`;
      
      const { data: newClassroom, error: createError } = await supabase
        .from('classroom')
        .insert({
          name: classroomName,
          slug: classroomSlug,
          description: classroomDescription,
          visibility: 'public',
          owner_id: course.owner_id,
          class_code: generateClassCode(),
        })
        .select()
        .single();

      if (createError) {
        console.error('[ClassroomAutoCreation] Failed to create classroom:', createError);
        return { 
          success: false, 
          created: false, 
          joined: false,
          error: `Failed to create classroom: ${createError.message}`,
          name: classroomName
        };
      }
      
      if (!newClassroom) {
        console.error('[ClassroomAutoCreation] Classroom created but no data returned');
        return { 
          success: false, 
          created: false, 
          joined: false,
          error: 'Classroom created but no data returned',
          name: classroomName
        };
      }
      
      classroomId = newClassroom.id;
      wasCreated = true;
      console.log(`[ClassroomAutoCreation] Created new classroom with ID: ${classroomId}`);
    } else {
      classroomId = existingClassroom.id;
      console.log(`[ClassroomAutoCreation] Found existing classroom with ID: ${classroomId}`);
    }

    // Check if user is already a member
    const { data: existingMembership, error: membershipError } = await supabase
      .from('classroom_member')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('user_id', userId)
      .maybeSingle();

    if (membershipError) {
      console.error('[ClassroomAutoCreation] Failed to check existing membership:', membershipError);
      return { 
        success: false, 
        created: wasCreated, 
        joined: false,
        error: `Failed to check membership: ${membershipError.message}`,
        name: classroomName
      };
    }

    let wasJoined = false;

    if (!existingMembership) {
      console.log(`[ClassroomAutoCreation] User ${userId} not a member, joining classroom ${classroomId}`);
      
      const { error: joinError } = await supabase
        .from('classroom_member')
        .insert({
          classroom_id: classroomId,
          user_id: userId,
          role: 'student' // Student joins as member
        });

      if (joinError) {
        console.error(`[ClassroomAutoCreation] Failed to join classroom ${classroomId} for user ${userId}:`, joinError);
        return { 
          success: false, 
          created: wasCreated, 
          joined: false,
          error: `Failed to join classroom: ${joinError.message}`,
          name: classroomName
        };
      }
      
      wasJoined = true;
      console.log('[ClassroomAutoCreation] Successfully joined classroom');
    } else {
      console.log('[ClassroomAutoCreation] User is already a member of the classroom');
    }

    return { 
      success: true, 
      created: wasCreated, 
      joined: wasJoined,
      name: classroomName
    };

  } catch (error) {
    console.error('[ClassroomAutoCreation] Unexpected error:', error);
    return { 
      success: false, 
      created: false, 
      joined: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Handle community auto-creation and joining
 */
async function handleCommunityAutoCreation(
  supabase: any,
  course: any,
  userId: number
): Promise<{ success: boolean; created: boolean; joined: boolean; name?: string; error?: string }> {
  try {
    const safeCourseTitle = course.title?.trim() || 'Course';
    const communityName = `${safeCourseTitle} - Group`;
    const communitySlug = `${course.slug}-group`;
    console.log(`[CommunityAutoCreation] Looking for community group: ${communityName}, slug: ${communitySlug}`);

    // First, try to find by slug (most reliable since slug is unique)
    let { data: existingGroup, error: groupError } = await supabase
      .from('community_group')
      .select('*')
      .eq('slug', communitySlug)
      .eq('is_deleted', false)
      .maybeSingle();

    // If not found by slug, try by name and owner_id as fallback
    if (!existingGroup && !groupError) {
      console.log(`[CommunityAutoCreation] Community not found by slug, trying by name`);
      const result = await supabase
        .from('community_group')
        .select('*')
        .eq('name', communityName)
        .eq('owner_id', course.owner_id)
        .eq('is_deleted', false)
        .maybeSingle();
      
      existingGroup = result.data;
      groupError = result.error;
    }

    if (groupError) {
      console.error('[CommunityAutoCreation] Failed to lookup community group:', groupError);
      return { 
        success: false, 
        created: false, 
        joined: false,
        error: `Failed to lookup community group: ${groupError.message}`,
        name: communityName
      };
    }

    let groupId;
    let wasCreated = false;

    if (!existingGroup) {
      console.log('[CommunityAutoCreation] Community group not found, creating new one');
      
      // Create new community group with consistent naming (matching course-approval-flow)
      const communityDescription = `Discussion group for ${safeCourseTitle}. Connect with other learners, ask questions, share insights, and engage in meaningful discussions about the course content. This community provides a platform for collaborative learning, peer support, knowledge sharing, and building connections with fellow students and educators.`;
      
      const { data: newGroup, error: createError } = await supabase
        .from('community_group')
        .insert({
          name: communityName,
          description: communityDescription,
          slug: communitySlug,
          visibility: 'public',
          owner_id: course.owner_id,
        })
        .select()
        .single();

      if (createError) {
        console.error('[CommunityAutoCreation] Failed to create community group:', createError);
        return { 
          success: false, 
          created: false, 
          joined: false,
          error: `Failed to create community group: ${createError.message}`,
          name: communityName
        };
      }
      
      if (!newGroup) {
        console.error('[CommunityAutoCreation] Community group created but no data returned');
        return { 
          success: false, 
          created: false, 
          joined: false,
          error: 'Community group created but no data returned',
          name: communityName
        };
      }
      
      groupId = newGroup.id;
      wasCreated = true;
      console.log(`[CommunityAutoCreation] Created new community group with ID: ${groupId}`);

      // Update course to link to this community group
      await supabase
        .from('course')
        .update({ community_group_public_id: newGroup.public_id })
        .eq('id', course.id);
        
    } else {
      groupId = existingGroup.id;
      console.log(`[CommunityAutoCreation] Found existing community group with ID: ${groupId}`);
    }

    // Check if user is already a member
    const { data: existingMember, error: memberError } = await supabase
      .from('community_group_member')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError) {
      console.error('[CommunityAutoCreation] Failed to check existing membership:', memberError);
      return { 
        success: false, 
        created: wasCreated, 
        joined: false,
        error: `Failed to check membership: ${memberError.message}`,
        name: communityName
      };
    }

    let wasJoined = false;

    if (!existingMember) {
      console.log(`[CommunityAutoCreation] User ${userId} not a member, joining community group ${groupId}`);
      
      const { error: joinError } = await supabase
        .from('community_group_member')
        .insert({
          user_id: userId,
          group_id: groupId,
          role: 'member', // Student joins as member
        });

      if (joinError) {
        console.error(`[CommunityAutoCreation] Failed to join community group ${groupId} for user ${userId}:`, joinError);
        return { 
          success: false, 
          created: wasCreated, 
          joined: false,
          error: `Failed to join community group: ${joinError.message}`,
          name: communityName
        };
      }
      
      wasJoined = true;
      console.log('[CommunityAutoCreation] Successfully joined community group');
    } else {
      console.log('[CommunityAutoCreation] User is already a member of the community group');
    }

    return { 
      success: true, 
      created: wasCreated, 
      joined: wasJoined,
      name: communityName
    };

  } catch (error) {
    console.error('[CommunityAutoCreation] Unexpected error:', error);
    return { 
      success: false, 
      created: false, 
      joined: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Generate a random class code
 */
function generateClassCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
