import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authorize user
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const userId = authResult.sub;
    const { id: attachmentId } = await params;
    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get attachment record
    const { data: attachment, error: attachmentError } = await supabase
      .from('chat_attachments')
      .select('*')
      .eq('id', parseInt(attachmentId))
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Verify user has access to this attachment
    // Check if user is part of the conversation
    // For now, we'll allow access if the attachment exists
    // TODO: Add proper authorization check

    // Get file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('chat-attachments')
      .download(attachment.storage_path);

    if (downloadError || !fileData) {
      console.error('Failed to download file:', downloadError);
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }

    // Convert blob to buffer
    const buffer = await fileData.arrayBuffer();

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': attachment.mime_type,
        'Content-Disposition': `inline; filename="${attachment.original_name}"`,
        'Content-Length': attachment.size_bytes.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error('Error serving attachment:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
