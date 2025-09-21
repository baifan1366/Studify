// app/api/admin/ai/content-generation/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/ai/content-generation - Get AI content generation statistics
export async function GET(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const supabase = await createAdminClient();
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Get AI run statistics
    const { data: aiRuns, error: aiRunsError } = await supabase
      .from('ai_run')
      .select(`
        id,
        status,
        created_at,
        ai_agent:agent_id (
          id,
          name,
          purpose
        )
      `)
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (aiRunsError) {
      throw aiRunsError;
    }

    // Get video processing statistics
    const { data: videoProcessing, error: videoError } = await supabase
      .from('video_processing_queue')
      .select('id, status, current_step, created_at, completed_at')
      .gte('created_at', daysAgo.toISOString());

    if (videoError) {
      throw videoError;
    }

    // Get course notes with AI summaries
    const { data: aiNotes, error: notesError } = await supabase
      .from('course_notes')
      .select('id, ai_summary, created_at')
      .not('ai_summary', 'is', null)
      .gte('created_at', daysAgo.toISOString());

    if (notesError) {
      throw notesError;
    }

    // Process statistics
    const aiRunStats = aiRuns?.reduce((acc, run) => {
      acc[run.status] = (acc[run.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const videoStats = videoProcessing?.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Calculate average processing times
    const completedVideos = videoProcessing?.filter(v => v.status === 'completed' && v.completed_at) || [];
    const avgVideoProcessingTime = completedVideos.length > 0
      ? completedVideos.reduce((acc, video) => {
          const processingTime = new Date(video.completed_at!).getTime() - new Date(video.created_at).getTime();
          return acc + processingTime;
        }, 0) / completedVideos.length
      : 0;

    // Get agent usage statistics
    const agentUsage = aiRuns?.reduce((acc, run) => {
      const agentName = (run.ai_agent as any)?.name || 'Unknown';
      if (!acc[agentName]) {
        acc[agentName] = { total: 0, succeeded: 0, failed: 0 };
      }
      acc[agentName].total++;
      if (run.status === 'succeeded') acc[agentName].succeeded++;
      if (run.status === 'failed') acc[agentName].failed++;
      return acc;
    }, {} as Record<string, { total: number; succeeded: number; failed: number }>) || {};

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          aiRunsTotal: aiRuns?.length || 0,
          videoProcessingTotal: videoProcessing?.length || 0,
          aiNotesGenerated: aiNotes?.length || 0,
          avgVideoProcessingTimeMs: Math.round(avgVideoProcessingTime)
        },
        aiRunStats,
        videoStats,
        agentUsage,
        recentActivities: {
          aiRuns: aiRuns?.slice(0, 10) || [],
          videoProcessing: videoProcessing?.slice(0, 10) || []
        }
      }
    });

  } catch (error) {
    console.error('AI content generation API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/ai/content-generation - Trigger AI content generation tasks
export async function POST(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { action, contentType, contentIds, agentId, config } = body;

    const supabase = await createAdminClient();

    switch (action) {
      case 'generate_summaries':
        // Trigger AI summary generation for course notes
        if (!contentIds || !Array.isArray(contentIds)) {
          return NextResponse.json(
            { message: 'Content IDs array is required' },
            { status: 400 }
          );
        }

        const { data: notes } = await supabase
          .from('course_notes')
          .select('id, content, user_id, lesson_id')
          .in('id', contentIds)
          .is('ai_summary', null);

        // Create AI run requests for summary generation
        const summaryRuns = notes?.map(note => ({
          agent_id: agentId,
          requester_id: authResult.user.profile?.id,
          input: {
            type: 'generate_summary',
            content: note.content,
            note_id: note.id
          },
          status: 'queued'
        })) || [];

        if (summaryRuns.length > 0) {
          const { error } = await supabase
            .from('ai_run')
            .insert(summaryRuns);

          if (error) {
            throw error;
          }
        }

        return NextResponse.json({
          success: true,
          message: `${summaryRuns.length} summary generation tasks queued`
        });

      case 'reprocess_videos':
        // Re-trigger video processing for failed items
        const { error: reprocessError } = await supabase
          .from('video_processing_queue')
          .update({
            status: 'pending',
            retry_count: 0,
            error_message: null,
            updated_at: new Date().toISOString()
          })
          .eq('status', 'failed');

        if (reprocessError) {
          throw reprocessError;
        }

        return NextResponse.json({
          success: true,
          message: 'Failed video processing tasks requeued'
        });

      case 'batch_analyze':
        // Batch analyze content for insights
        if (!contentType || !contentIds) {
          return NextResponse.json(
            { message: 'Content type and IDs are required' },
            { status: 400 }
          );
        }

        const analysisRuns = contentIds.map((id: string) => ({
          agent_id: agentId,
          requester_id: authResult.user.profile?.id,
          input: {
            type: 'content_analysis',
            content_type: contentType,
            content_id: id,
            config: config || {}
          },
          status: 'queued'
        }));

        const { error: batchError } = await supabase
          .from('ai_run')
          .insert(analysisRuns);

        if (batchError) {
          throw batchError;
        }

        return NextResponse.json({
          success: true,
          message: `${analysisRuns.length} analysis tasks queued`
        });

      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('AI content generation operation error:', error);
    return NextResponse.json(
      { message: 'Failed to perform AI operation' },
      { status: 500 }
    );
  }
}
