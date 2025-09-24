import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/lib/server-guard';
import { createAdminClient } from '@/lib/supabase/admin';

// Track video view/watch session
export async function POST(request: NextRequest) {
  try {
    const user = await authorize('student');
    const supabase = createAdminClient();
    
    const { 
      lessonId, 
      attachmentId, 
      watchDurationSec, 
      totalDurationSec, 
      lastPositionSec,
      isCompleted = false,
      deviceInfo = {}
    } = await request.json();

    if (!lessonId || watchDurationSec === undefined) {
      return NextResponse.json(
        { error: 'lessonId and watchDurationSec are required' },
        { status: 400 }
      );
    }

    // Get lesson to validate it exists
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lesson')
      .select('id, title')
      .eq('public_id', lessonId)
      .eq('is_deleted', false)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Check if there's an active view session for this user/lesson
    const { data: existingView } = await supabase
      .from('video_views')
      .select('id, watch_duration_sec, last_position_sec')
      .eq('user_id', user.profile?.id || user.id)
      .eq('lesson_id', lesson.id)
      .is('session_end_time', null) // Active session
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let viewData;

    if (existingView) {
      // Update existing active session
      const { data: updatedView, error: updateError } = await supabase
        .from('video_views')
        .update({
          watch_duration_sec: Math.max(existingView.watch_duration_sec, watchDurationSec),
          total_duration_sec: totalDurationSec,
          last_position_sec: lastPositionSec,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          session_end_time: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingView.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating video view:', updateError);
        return NextResponse.json(
          { error: 'Failed to update view' },
          { status: 500 }
        );
      }
      
      viewData = updatedView;
    } else {
      // Create new view session
      const { data: newView, error: insertError } = await supabase
        .from('video_views')
        .insert({
          user_id: user.profile?.id || user.id,
          lesson_id: lesson.id,
          attachment_id: attachmentId,
          watch_duration_sec: watchDurationSec,
          total_duration_sec: totalDurationSec,
          last_position_sec: lastPositionSec,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          session_end_time: isCompleted ? new Date().toISOString() : null,
          device_info: deviceInfo,
          ip_address: request.ip || request.headers.get('x-forwarded-for')
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Error creating video view:', insertError);
        return NextResponse.json(
          { error: 'Failed to create view' },
          { status: 500 }
        );
      }
      
      viewData = newView;
    }

    return NextResponse.json({
      success: true,
      view: viewData
    });

  } catch (error) {
    console.error('Error in video views POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get video view statistics
export async function GET(request: NextRequest) {
  try {
    const user = await authorize('student');
    const supabase = createAdminClient();
    
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    
    if (!lessonId) {
      return NextResponse.json(
        { error: 'lessonId is required' },
        { status: 400 }
      );
    }

    // Get lesson to validate it exists
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lesson')
      .select('id, title')
      .eq('public_id', lessonId)
      .eq('is_deleted', false)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Get user's view history for this lesson
    const { data: userViews, error: viewsError } = await supabase
      .from('video_views')
      .select('*')
      .eq('user_id', user.profile?.id || user.id)
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (viewsError) {
      console.error('Error fetching user views:', viewsError);
      return NextResponse.json(
        { error: 'Failed to fetch views' },
        { status: 500 }
      );
    }

    // Get total view statistics for the lesson
    const { data: lessonStats, error: statsError } = await supabase
      .from('video_views')
      .select(`
        lesson_id,
        count(*) as total_views,
        count(DISTINCT user_id) as unique_viewers,
        avg(watch_percentage) as avg_watch_percentage,
        avg(watch_duration_sec) as avg_watch_duration
      `)
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .group('lesson_id')
      .single();

    if (statsError && statsError.code !== 'PGRST116') { // Ignore "no rows" error
      console.error('Error fetching lesson stats:', statsError);
    }

    const currentView = userViews?.[0] || null;
    
    return NextResponse.json({
      success: true,
      userViews: userViews || [],
      currentView,
      lessonStats: lessonStats || {
        total_views: 0,
        unique_viewers: 0,
        avg_watch_percentage: 0,
        avg_watch_duration: 0
      }
    });

  } catch (error) {
    console.error('Error in video views GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
