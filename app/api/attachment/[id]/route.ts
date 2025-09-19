import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export const runtime = 'nodejs';

// GET - Generate signed URL for attachment access
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Parse the ID to get the actual attachment ID
    // The ID might be in format like "123-abc" where 123 is the attachment ID
    const attachmentId = id.split('-')[0];
    
    if (!attachmentId || isNaN(Number(attachmentId))) {
      return NextResponse.json({ error: 'Invalid attachment ID' }, { status: 400 });
    }

    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get attachment details
    const { data: attachment, error: attachmentError } = await supabase
      .from('classroom_attachments')
      .select(`
        id,
        bucket,
        path,
        visibility,
        context_type,
        context_id,
        file_name,
        mime_type,
        owner_id
      `)
      .eq('id', attachmentId)
      .eq('is_deleted', false)
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Check access permissions
    if (attachment.context_type === 'chat') {
      // For chat attachments, check if user is member of the classroom
      const { data: classroom } = await supabase
        .from('classroom')
        .select('id')
        .eq('id', attachment.context_id)
        .single();

      if (classroom) {
        const { data: membership } = await supabase
          .from('classroom_member')
          .select('id')
          .eq('classroom_id', classroom.id)
          .eq('user_id', profile.id)
          .single();

        if (!membership) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }
    } else if (attachment.context_type === 'submission') {
      // For submissions, only owner and classroom tutors/owners can access
      if (attachment.owner_id !== profile.id) {
        // Check if user is tutor/owner of the classroom
        const { data: classroom } = await supabase
          .from('classroom')
          .select('id')
          .eq('id', attachment.context_id)
          .single();

        if (classroom) {
          const { data: membership } = await supabase
            .from('classroom_member')
            .select('role')
            .eq('classroom_id', classroom.id)
            .eq('user_id', profile.id)
            .single();

          if (!membership || membership.role === 'student') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
          }
        }
      }
    }

    // Generate signed URL based on visibility
    if (attachment.visibility === 'public') {
      // For public files, return direct public URL
      const { data: { publicUrl } } = supabase.storage
        .from(attachment.bucket)
        .getPublicUrl(attachment.path);
      
      // Redirect to the public URL
      return NextResponse.redirect(publicUrl);
    } else {
      // For private files, generate signed URL (24 hours expiration)
      const { data, error: signedUrlError } = await supabase.storage
        .from(attachment.bucket)
        .createSignedUrl(attachment.path, 24 * 60 * 60); // 24 hours

      if (signedUrlError || !data?.signedUrl) {
        console.error('Error creating signed URL:', signedUrlError);
        return NextResponse.json({ error: 'Failed to generate access URL' }, { status: 500 });
      }

      // Redirect to the signed URL
      return NextResponse.redirect(data.signedUrl);
    }

  } catch (error: any) {
    console.error('Error in GET /api/attachment/[id]:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
