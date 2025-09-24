import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/users/[userId]/chat-activity - Get user's chat activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { userId } = await params;
    const supabase = await createAdminClient();

    // Get user profile first to get the profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Get user's chat messages with classroom and course info
    const { data: messages } = await supabase
      .from('classroom_chat_message')
      .select(`
        id,
        content,
        created_at,
        classroom!inner(
          name,
          course!inner(
            title
          )
        )
      `)
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);

    // Format the data
    const formattedMessages = (messages || []).map(message => ({
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      classroom_name: (message as any).classroom?.name || 'Unknown Classroom',
      course_title: (message as any).classroom?.course?.title || 'Unknown Course',
    }));

    return NextResponse.json({
      messages: formattedMessages,
    });

  } catch (error) {
    console.error('Admin user chat activity GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
