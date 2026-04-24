import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

/**
 * POST /api/video/optimize-mp4
 * Optimize MP4 for streaming by moving moov atom to beginning
 * 
 * This is a lightweight alternative to HLS that:
 * 1. Downloads video from MEGA
 * 2. Runs: ffmpeg -i input.mp4 -movflags faststart -c copy output.mp4
 * 3. Re-uploads optimized video to MEGA
 * 4. Updates attachment URL
 * 
 * Benefits:
 * - Same file size as original (just reordered)
 * - Enables instant streaming (no need to download entire file)
 * - Much faster than HLS transcoding
 * - No extra storage needed
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize(['admin', 'tutor','student']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { attachmentId } = await request.json();

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'attachmentId is required' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Get attachment details
    const { data: attachment, error: attachmentError } = await supabase
      .from('course_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('is_deleted', false)
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Validate it's a video
    const isVideo = attachment.file_type?.startsWith('video/') || 
                    attachment.url?.match(/\.(mp4|mov)$/i);

    if (!isVideo) {
      return NextResponse.json(
        { error: 'Only MP4/MOV videos can be optimized' },
        { status: 400 }
      );
    }

    // Check if already optimized
    if (attachment.metadata?.optimized_for_streaming) {
      return NextResponse.json({
        message: 'Video is already optimized for streaming',
        attachment
      });
    }

    // Create optimization job
    const { data: job, error: jobError } = await supabase
      .from('video_optimization_jobs')
      .insert({
        attachment_id: attachmentId,
        source_url: attachment.url,
        status: 'pending',
        optimization_type: 'faststart',
        created_by: authResult.user.id,
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating optimization job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create optimization job' },
        { status: 500 }
      );
    }

    // Trigger worker
    const workerUrl = process.env.VIDEO_OPTIMIZATION_WORKER_URL || 
                      `${request.nextUrl.origin}/api/video/optimize-mp4/worker`;

    try {
      fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`,
        },
        body: JSON.stringify({ jobId: job.id }),
      }).catch(err => {
        console.error('Failed to trigger optimization worker:', err);
      });
    } catch (error) {
      console.error('Error triggering worker:', error);
    }

    return NextResponse.json({
      success: true,
      job,
      message: 'Optimization job created. This will make your video stream instantly without increasing file size.',
      estimatedTime: '5-10 minutes',
      benefits: [
        'Same file size as original',
        'Instant streaming (no buffering)',
        'No extra storage cost',
        'Works with existing MEGA storage'
      ]
    });

  } catch (error) {
    console.error('Error in optimize-mp4 POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video/optimize-mp4?attachmentId=123
 * Check optimization status
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'attachmentId is required' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Check if attachment is optimized
    const { data: attachment } = await supabase
      .from('course_attachments')
      .select('metadata')
      .eq('id', parseInt(attachmentId))
      .single();

    const isOptimized = attachment?.metadata?.optimized_for_streaming === true;

    // Get latest optimization job
    const { data: job } = await supabase
      .from('video_optimization_jobs')
      .select('*')
      .eq('attachment_id', parseInt(attachmentId))
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      isOptimized,
      job: job || null,
      recommendation: isOptimized 
        ? 'Video is optimized and ready for streaming'
        : 'Consider optimizing this video for instant streaming'
    });

  } catch (error) {
    console.error('Error in optimize-mp4 GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
