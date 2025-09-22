import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * GET /api/chat/attachments/[id]
 * Get a chat attachment by ID and serve the file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const attachmentId = parseInt(id, 10);

    if (isNaN(attachmentId)) {
      return NextResponse.json(
        { error: 'Invalid attachment ID' },
        { status: 400 }
      );
    }

    // Get attachment info
    const supabase = await createAdminClient();
    
    const { data: attachment, error } = await supabase
      .from('chat_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('is_deleted', false)
      .single();

    if (error || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Get signed URL from Supabase Storage
    const { data: signedUrlData, error: urlError } = await supabase
      .storage
      .from('chat-attachments')
      .createSignedUrl(attachment.storage_path, 3600); // 1 hour expiry

    if (urlError || !signedUrlData) {
      console.error('Error creating signed URL:', urlError);
      return NextResponse.json(
        { error: 'Failed to get file URL' },
        { status: 500 }
      );
    }

    // Fetch the file from storage
    const fileResponse = await fetch(signedUrlData.signedUrl);
    
    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();

    // Return the file with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': attachment.mime_type,
        'Content-Length': attachment.size_bytes.toString(),
        'Content-Disposition': `inline; filename="${attachment.original_name}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Error serving attachment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
