import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// DELETE - Soft delete a chat message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; messageId: string }> }
) {
  try {
    const { slug, messageId } = await params;

    // Authorize user
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile ID
    const supabase = await createAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify classroom access
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id')
      .eq('slug', slug)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Check if user is a member of the classroom
    const { data: membership } = await supabase
      .from('classroom_member')
      .select('id, role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the message to verify ownership or admin rights
    const { data: message, error: messageError } = await supabase
      .from('classroom_chat_message')
      .select('id, sender_id, is_deleted')
      .eq('public_id', messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.is_deleted) {
      return NextResponse.json({ error: 'Message already deleted' }, { status: 400 });
    }

    // Check if user can delete this message (owner or tutor/admin)
    const canDelete = message.sender_id === profile.id || 
                     membership.role === 'tutor' || 
                     membership.role === 'admin';

    if (!canDelete) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Soft delete the message
    const { error: deleteError } = await supabase
      .from('classroom_chat_message')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', message.id);

    if (deleteError) {
      console.error('Error deleting message:', deleteError);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Chat message delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
