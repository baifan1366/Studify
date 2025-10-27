import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// Batch process all lessons with transcripts
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { limit = 10, forceReprocess = false } = body;

    const supabase = await createAdminClient();

    console.log(`🎬 Starting batch transcript processing (limit: ${limit})`);

    // Find lessons with transcripts but no video segments
    let query = supabase
      .from('course_lesson')
      .select('id, public_id, title, transcript')
      .not('transcript', 'is', null)
      .eq('is_deleted', false)
      .limit(limit);

    if (!forceReprocess) {
      // Only get lessons without existing segments
      const { data: lessonsWithSegments } = await supabase
        .from('video_segments')
        .select('lesson_id')
        .limit(1000);

      const lessonIdsWithSegments = lessonsWithSegments?.map(s => s.lesson_id) || [];
      
      if (lessonIdsWithSegments.length > 0) {
        query = query.not('id', 'in', `(${lessonIdsWithSegments.join(',')})`);
      }
    }

    const { data: lessons, error: lessonsError } = await query;

    if (lessonsError) {
      return NextResponse.json(
        { error: 'Failed to fetch lessons' },
        { status: 500 }
      );
    }

    if (!lessons || lessons.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No lessons to process',
        processed: 0
      });
    }

    console.log(`  ↳ Found ${lessons.length} lessons to process`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const lesson of lessons) {
      try {
        console.log(`  ↳ Processing: ${lesson.title}`);

        // Call the process-transcript endpoint
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/video/process-transcript`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lessonId: lesson.public_id,
              transcript: lesson.transcript,
              forceReprocess
            })
          }
        );

        const result = await response.json();

        if (response.ok) {
          successCount++;
          results.push({
            lessonId: lesson.public_id,
            title: lesson.title,
            status: 'success',
            segmentsCount: result.segmentsCount
          });
          console.log(`    ✅ Success: ${result.segmentsCount} segments`);
        } else {
          failCount++;
          results.push({
            lessonId: lesson.public_id,
            title: lesson.title,
            status: 'failed',
            error: result.error
          });
          console.log(`    ❌ Failed: ${result.error}`);
        }

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        failCount++;
        results.push({
          lessonId: lesson.public_id,
          title: lesson.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log(`    ❌ Error: ${error}`);
      }
    }

    console.log(`✅ Batch processing complete: ${successCount} success, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      message: 'Batch processing complete',
      total: lessons.length,
      successCount,
      failCount,
      results
    });

  } catch (error) {
    console.error('Batch process error:', error);
    return NextResponse.json(
      { error: 'Failed to batch process transcripts' },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) return authResult;

    const supabase = await createAdminClient();

    // Count lessons with transcripts
    const { count: totalWithTranscript } = await supabase
      .from('course_lesson')
      .select('id', { count: 'exact', head: true })
      .not('transcript', 'is', null)
      .eq('is_deleted', false);

    // Count lessons with segments
    const { data: segmentCounts } = await supabase
      .from('video_segments')
      .select('lesson_id')
      .limit(10000);

    const uniqueLessonsWithSegments = new Set(segmentCounts?.map(s => s.lesson_id) || []).size;

    // Count pending embeddings for video segments
    const { count: pendingEmbeddings } = await supabase
      .from('embedding_queue')
      .select('id', { count: 'exact', head: true })
      .eq('content_type', 'video_segment')
      .eq('status', 'queued');

    return NextResponse.json({
      success: true,
      stats: {
        totalLessonsWithTranscript: totalWithTranscript || 0,
        lessonsWithSegments: uniqueLessonsWithSegments,
        lessonsNeedingProcessing: (totalWithTranscript || 0) - uniqueLessonsWithSegments,
        pendingVideoEmbeddings: pendingEmbeddings || 0
      },
      hint: 'POST to this endpoint to start batch processing'
    });

  } catch (error) {
    console.error('Batch status error:', error);
    return NextResponse.json(
      { error: 'Failed to get batch status' },
      { status: 500 }
    );
  }
}
