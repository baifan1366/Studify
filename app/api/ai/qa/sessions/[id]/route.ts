import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Request validation schema
const updateSessionSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty')
});

// Create Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET endpoint - Fetch single session with messages
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) return authResult;

    const userId = authResult.user.profile?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { id } = await params;

    // Fetch session and verify ownership
    const { data: session, error: sessionError } = await supabase
      .from('ai_quick_qa_sessions')
      .select('id, public_id, title, created_at, user_id')
      .eq('public_id', id)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found', message: sessionError?.message },
        { status: 404 }
      );
    }

    // Fetch messages for this session
    const { data: messages, error: messagesError } = await supabase
      .from('ai_quick_qa_messages')
      .select('id, role, content, thinking, reasoning_details, ai_mode, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages', message: messagesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.public_id,
        title: session.title,
        createdAt: session.created_at
      },
      messages: messages?.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        thinking: msg.thinking,
        reasoning_details: msg.reasoning_details,
        ai_mode: msg.ai_mode,
        createdAt: msg.created_at
      })) || []
    });

  } catch (error) {
    console.error('GET session error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH endpoint - Update session title
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) return authResult;

    const userId = authResult.user.profile?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = updateSessionSchema.parse(body);

    // Update session and verify ownership
    const { data: session, error } = await supabase
      .from('ai_quick_qa_sessions')
      .update({ 
        title: validatedData.title,
        updated_at: new Date().toISOString()
      })
      .eq('public_id', id)
      .eq('user_id', userId)
      .select('public_id')
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Session not found or update failed', message: error?.message },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('PATCH session error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          message: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to update session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint - Delete session
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) return authResult;

    const userId = authResult.user.profile?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { id } = await params;

    // Delete session (cascade will delete messages)
    const { error } = await supabase
      .from('ai_quick_qa_sessions')
      .delete()
      .eq('public_id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting session:', error);
      return NextResponse.json(
        { error: 'Failed to delete session', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('DELETE session error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
