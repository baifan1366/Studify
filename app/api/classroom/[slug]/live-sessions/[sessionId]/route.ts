import { NextResponse } from 'next/server';
import { createEnhancedServerClient } from '@/utils/supabase/server';

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
// ... (previous imports and code)

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
