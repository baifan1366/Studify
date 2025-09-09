import { NextResponse } from 'next/server';
import { createEnhancedServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

/**
 * Individual Live Session API
 * GET /api/classroom/[slug]/live-sessions/[sessionId] - Get session details
 * PUT /api/classroom/[slug]/live-sessions/[sessionId] - Update session (tutor/owner only)
 * DELETE /api/classroom/[slug]/live-sessions/[sessionId] - Delete session (tutor/owner only)
 */

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; sessionId: string }> }) {
  const { slug, sessionId } = await params;


  const supabase = await createEnhancedServerClient({ useServiceKey: true });

  try {
    // First, get the classroom by slug
    console.log('Fetching classroom with slug:', slug);
    
    // Get the classroom first
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id, slug, name')
      .eq('slug', slug)
      .eq('is_deleted', false)
      .single();
    
    if (classroomError || !classroom) {
      console.error('Classroom not found:', { error: classroomError, slug });
      return NextResponse.json({ 
        error: 'Classroom not found',
        details: 'No classroom found with the provided slug'
      }, { status: 404 });
    }
    
    // Then check if user is a member of this classroom
    const { data: membership, error: membershipError } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroom.id)
      .single();
    
    if (membershipError || !membership) {
      console.error('User is not a member of this classroom:', { 
        error: membershipError, 
        classroomId: classroom.id, 
      });
      return NextResponse.json({
        error: 'Access denied',
        details: 'You are not a member of this classroom'
      }, { status: 403 });
    }
    
    console.log('User is a member of the classroom with role:', membership.role);

    // Get live session details
    const { data: liveSession, error } = await supabase
      .from('classroom_live_session')
      .select(`
        id,
        public_id,
        title,
        description,
        starts_at,
        ends_at,
        status,
        host_id,
        created_at,
        updated_at,
        profiles:host_id(
          id,
          full_name,
          email
        )
      `)
      .eq('id', sessionId)
      .eq('classroom_id', classroom.id)
      .eq('is_deleted', false)
      .single();

    if (error || !liveSession) {
      return NextResponse.json({ error: 'Live session not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...liveSession,
      user_role: membership.role
    });
  } catch (error) {
    console.error('Error fetching live session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string; sessionId: string }> }) {
  const { slug, sessionId } = await params;

  try {
    // Verify authentication first
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      const tutorAuthResult = await authorize('tutor');
      if (tutorAuthResult instanceof NextResponse) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
    }

    const userId = authResult instanceof NextResponse ? 
      (await authorize('tutor') as any).payload.sub : 
      authResult.payload.sub;

    // Use admin client for database operations
    const supabase = await createAdminClient();

    // Get user profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { message: 'User profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !['scheduled', 'live', 'ended', 'cancelled'].includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status',
        details: 'Status must be one of: scheduled, live, ended, cancelled'
      }, { status: 400 });
    }

    console.log('🔍 [PUT Live Session] Looking for classroom with slug:', slug);

    // Get the classroom by slug and verify user membership
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select(`
        id, 
        slug, 
        name,
        classroom_member!classroom_member_classroom_id_fkey!inner(user_id, role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();
    
    console.log('📊 [PUT Live Session] Classroom query result:', {
      classroom,
      error: classroomError,
      errorMessage: classroomError?.message,
      errorDetails: classroomError?.details
    });
    
    if (classroomError || !classroom) {
      // Try to find any classroom to debug
      const { data: allClassrooms } = await supabase
        .from('classroom')
        .select('id, slug, name')
        .limit(5);
      
      console.log('🔍 [PUT Live Session] Available classrooms:', allClassrooms);
      
      return NextResponse.json({ 
        error: 'Classroom not found',
        details: 'No classroom found with the provided slug',
        debug: {
          searchedSlug: slug,
          availableClassrooms: allClassrooms?.map(c => c.slug) || []
        }
      }, { status: 404 });
    }

    // Update session status
    const now = new Date().toISOString();
    const updateData: any = {
      status,
      updated_at: now
    };

    // Set ends_at if status is 'ended' and it's not already set
    if (status === 'ended') {
      updateData.ends_at = now;
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('classroom_live_session')
      .update(updateData)
      .eq('public_id', sessionId)
      .eq('classroom_id', classroom.id)
      .eq('is_deleted', false)
      .select()
      .single();

    if (updateError) {
      // Try with numeric ID if public_id fails
      const { data: updatedSessionById, error: updateByIdError } = await supabase
        .from('classroom_live_session')
        .update(updateData)
        .eq('id', parseInt(sessionId))
        .eq('classroom_id', classroom.id)
        .eq('is_deleted', false)
        .select()
        .single();

      if (updateByIdError) {
        console.error('Error updating session status:', { updateError, updateByIdError });
        return NextResponse.json({ 
          error: 'Session not found or update failed',
          details: 'Could not update the session status'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Session status updated successfully',
        session: updatedSessionById
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Session status updated successfully',
      session: updatedSession
    });

  } catch (error) {
    console.error('Error updating session status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An error occurred while updating the session'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string; sessionId: string }> }) {
  const { slug, sessionId } = await params;

  const supabase = await createEnhancedServerClient({ useServiceKey: true });

  try {
    // First, get the classroom by slug to verify it exists
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id, slug, name')
      .eq('slug', slug)
      .eq('is_deleted', false)
      .single();
    
    if (classroomError) {
      console.error('Error fetching classroom:', { 
        error: classroomError, 
        slug,
        message: classroomError.message,
        details: classroomError.details,
        hint: classroomError.hint,
        code: classroomError.code
      });
      
      // Return a more specific error if the classroom doesn't exist
      if (classroomError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Classroom not found',
          details: 'No classroom found with the provided slug',
          code: 'CLASSROOM_NOT_FOUND'
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Error fetching classroom',
        details: 'An error occurred while fetching the classroom',
        code: 'CLASSROOM_FETCH_ERROR'
      }, { status: 500 });
    }
    
    // Check if user is a member of this classroom
    const { data: membership, error: membershipError } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroom.id)
      .single();
    
    if (membershipError || !membership) {
      console.error('User is not a member of this classroom:', { 
        error: membershipError, 
        classroomId: classroom.id, 
      });
      return NextResponse.json({
        error: 'Access denied',
        details: 'You are not a member of this classroom',
        code: 'NOT_A_MEMBER'
      }, { status: 403 });
    }

    // Get the session to check ownership
    const { data: session, error: sessionError } = await supabase
      .from('classroom_live_session')
      .select('host_id, is_deleted, status')
      .eq('id', sessionId)
      .eq('classroom_id', classroom.id)
      .single();

    if (sessionError || !session) {
      console.error('Error fetching live session:', {
        error: sessionError,
        sessionId,
        classroomId: classroom.id
      });
      return NextResponse.json({ 
        error: 'Live session not found',
        details: 'The specified live session could not be found',
        code: 'SESSION_NOT_FOUND'
      }, { status: 404 });
    }

    if (session.is_deleted) {
      return NextResponse.json({
        error: 'Session already deleted',
        details: 'This session has already been deleted',
        code: 'SESSION_ALREADY_DELETED'
      }, { status: 410 });
    }


    // Soft delete the session
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('classroom_live_session')
      .update({
        is_deleted: true,
        deleted_at: now,
        status: 'cancelled',
        updated_at: now
      })
      .eq('id', sessionId)
      .eq('classroom_id', classroom.id);

    if (updateError) {
      console.error('Error soft-deleting live session:', {
        error: updateError,
        sessionId,
        classroomId: classroom.id,
      });
      throw updateError;
    }

    return NextResponse.json({ 
      success: true,
      message: 'Live session deleted successfully',
      session_id: sessionId
    });
  } catch (error) {
    console.error('Unexpected error deleting live session:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while deleting the session',
      code: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}
