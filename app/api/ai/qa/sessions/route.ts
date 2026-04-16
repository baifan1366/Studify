import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Request validation schema
const createSessionSchema = z.object({
  title: z.string().optional()
});

// Create Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET endpoint - List user's sessions
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) return authResult;

    const userId = authResult.user.profile?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch sessions with message count
    const { data: sessions, error } = await supabase
      .from('ai_quick_qa_sessions')
      .select(`
        public_id,
        title,
        created_at,
        updated_at,
        ai_quick_qa_messages(count)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sessions', message: error.message },
        { status: 500 }
      );
    }

    // Transform data for response
    const transformedSessions = sessions?.map(session => ({
      id: session.public_id,
      title: session.title,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      messageCount: Array.isArray(session.ai_quick_qa_messages) 
        ? session.ai_quick_qa_messages.length 
        : (session.ai_quick_qa_messages as any)?.count || 0
    })) || [];

    return NextResponse.json({
      success: true,
      sessions: transformedSessions
    });

  } catch (error) {
    console.error('GET sessions error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch sessions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST endpoint - Create new session
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) return authResult;

    const userId = authResult.user.profile?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = createSessionSchema.parse(body);
    const title = validatedData.title || 'New Chat';

    // Create new session
    const { data: session, error } = await supabase
      .from('ai_quick_qa_sessions')
      .insert({
        user_id: userId,
        title
      })
      .select('public_id, title, created_at')
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json(
        { error: 'Failed to create session', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.public_id,
        title: session.title,
        createdAt: session.created_at
      }
    });

  } catch (error) {
    console.error('POST session error:', error);

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
        error: 'Failed to create session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
