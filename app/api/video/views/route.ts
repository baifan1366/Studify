import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// Track video view/watch session
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
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

    // Create Supabase client with timeout
    const supabase = await createAdminClient();
    
    // Helper function to execute query with timeout
    const withTimeout = async <T>(
      promiseOrBuilder: Promise<T> | { then: (resolve: any, reject: any) => any },
      timeoutMs: number = 5000
    ): Promise<T> => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase query timeout')), timeoutMs)
      );
      // Convert to promise if it's a thenable (like PostgrestBuilder)
      const promise = Promise.resolve(promiseOrBuilder) as Promise<T>;
      return Promise.race([promise, timeoutPromise]) as Promise<T>;
    };

    // Get lesson to validate it exists (with timeout)
    const lessonResult = await withTimeout(
      supabase
        .from('course_lesson')
        .select('id, title')
        .eq('public_id', lessonId)
        .eq('is_deleted', false)
        .single()
    );
    
    const { data: lesson, error: lessonError } = lessonResult as { data: any; error: any };

    if (lessonError || !lesson) {
      console.error('Lesson lookup error:', lessonError);
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Check if there's an active view session for this user/lesson (with timeout)
    const { data: existingView } = await withTimeout(
      supabase
        .from('video_views')
        .select('id, watch_duration_sec, last_position_sec')
        .eq('user_id', authResult.user.profile?.id || authResult.user.id)
        .eq('lesson_id', lesson.id)
        .is('session_end_time', null) // Active session
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    ).catch(() => ({ data: null })) as { data: any }; // Ignore errors for optional query

    let viewData;

    if (existingView) {
      // Update existing active session (with timeout)
      const { data: updatedView, error: updateError } = await withTimeout(
        supabase
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
          .single()
      ) as { data: any; error: any };

      if (updateError) {
        console.error('Error updating video view:', updateError);
        return NextResponse.json(
          { error: 'Failed to update view', details: updateError.message },
          { status: 500 }
        );
      }
      
      viewData = updatedView;
    } else {
      // Create new view session (with timeout)
      const { data: newView, error: insertError } = await withTimeout(
        supabase
          .from('video_views')
          .insert({
            user_id: authResult.user.profile?.id || authResult.user.id,
            lesson_id: lesson.id,
            attachment_id: attachmentId,
            watch_duration_sec: watchDurationSec,
            total_duration_sec: totalDurationSec,
            last_position_sec: lastPositionSec,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null,
            session_end_time: isCompleted ? new Date().toISOString() : null,
            device_info: deviceInfo,
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
          })
          .select('*')
          .single()
      ) as { data: any; error: any };

      if (insertError) {
        console.error('Error creating video view:', insertError);
        return NextResponse.json(
          { error: 'Failed to create view', details: insertError.message },
          { status: 500 }
        );
      }
      
      viewData = newView;
    }

    return NextResponse.json({
      success: true,
      view: viewData
    });

  } catch (error: any) {
    console.error('Error in video views POST:', error);
    
    // Check if it's a timeout error
    if (error.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Database timeout - please try again', details: error.message },
        { status: 504 } // Gateway Timeout
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Get video view statistics
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const supabase = await createAdminClient();
    
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
      .eq('user_id', authResult.user.profile?.id || authResult.user.id)
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
    const { count: totalViews } = await supabase
      .from('video_views')
      .select('*', { count: 'exact' })
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false);

    // Get unique viewers count by fetching user_ids
    const { data: viewUsers } = await supabase
      .from('video_views')
      .select('user_id')
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false);

    const uniqueViewers = new Set(viewUsers?.map(v => v.user_id) || []).size;

    // Get watch duration data for averages
    const { data: watchData } = await supabase
      .from('video_views')
      .select('watch_duration_sec, total_duration_sec')
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .not('watch_duration_sec', 'is', null);

    let avgWatchDuration = 0;
    let avgWatchPercentage = 0;

    if (watchData && watchData.length > 0) {
      avgWatchDuration = watchData.reduce((sum, item) => sum + (item.watch_duration_sec || 0), 0) / watchData.length;
      
      const validPercentages = watchData
        .filter(item => item.total_duration_sec && item.total_duration_sec > 0)
        .map(item => (item.watch_duration_sec || 0) / item.total_duration_sec * 100);
      
      if (validPercentages.length > 0) {
        avgWatchPercentage = validPercentages.reduce((sum, pct) => sum + pct, 0) / validPercentages.length;
      }
    }

    const lessonStats = {
      total_views: totalViews || 0,
      unique_viewers: uniqueViewers,
      avg_watch_percentage: avgWatchPercentage,
      avg_watch_duration: avgWatchDuration
    };

    const currentView = userViews?.[0] || null;
    
    return NextResponse.json({
      success: true,
      userViews: userViews || [],
      currentView,
      lessonStats: lessonStats
    });

  } catch (error) {
    console.error('Error in video views GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
