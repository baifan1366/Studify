import { NextRequest, NextResponse } from 'next/server';
import { createAttachmentAdminClient } from '@/utils/supabase/server';

/**
 * GET /api/attachments/[id]/check-streaming
 * Check if video supports fast streaming (moov atom at beginning)
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

    // Get attachment metadata
    const supabase = await createAttachmentAdminClient();
    const { data: attachment, error } = await supabase
      .from('course_attachments')
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

    // Check if it's a video file
    const isVideo = attachment.file_type?.startsWith('video/') || 
                    attachment.url?.match(/\.(mp4|webm|mov|avi|mkv)$/i);

    if (!isVideo) {
      return NextResponse.json({
        supportsStreaming: false,
        reason: 'not_a_video',
        recommendation: 'direct_download'
      });
    }

    // For MEGA files, check if we have HLS version
    if (attachment.url?.includes('mega.nz')) {
      // Check if HLS version exists in storage
      const { data: hlsVersion } = await supabase
        .from('video_processing_jobs')
        .select('hls_manifest_url, status')
        .eq('attachment_id', attachmentId)
        .eq('status', 'completed')
        .single();

      if (hlsVersion?.hls_manifest_url) {
        return NextResponse.json({
          supportsStreaming: true,
          streamingType: 'hls',
          hlsUrl: hlsVersion.hls_manifest_url,
          recommendation: 'use_hls'
        });
      }

      // No HLS version - MEGA streaming will be slow
      return NextResponse.json({
        supportsStreaming: true,
        streamingType: 'progressive',
        warning: 'slow_download',
        recommendation: 'show_warning',
        message: 'This video may take a while to load. Consider converting to HLS for faster streaming.'
      });
    }

    // For direct URLs, assume they support streaming
    return NextResponse.json({
      supportsStreaming: true,
      streamingType: 'progressive',
      recommendation: 'direct_stream'
    });

  } catch (error) {
    console.error('Error checking streaming support:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
