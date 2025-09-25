import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/learning-progress - Get learning progress for a user
export async function GET(request: NextRequest) {
  try {
    const authResponse = await authorize('student');
    if (authResponse instanceof NextResponse) return authResponse;
    
    const { payload } = authResponse;
    const userId = payload.profileId;
    
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const courseSlug = searchParams.get('courseSlug');
    const type = searchParams.get('type') || 'progress'; // 'progress' or 'continue-watching'
    
    const supabase = await createAdminClient();
    
    if (type === 'continue-watching') {
      // Get continue watching items using the database function
      const { data: continueWatching, error } = await supabase
        .rpc('get_continue_watching_for_user', {
          p_user_id: userId,
          p_limit: 5
        });
        
      if (error) {
        console.error('Error fetching continue watching:', error);
        return NextResponse.json(
          { message: 'Failed to fetch continue watching items', error: error.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: continueWatching || []
      });
    }
    
    if (lessonId) {
      // Get specific lesson progress
      // First get the lesson's internal ID
      const { data: lesson, error: lessonError } = await supabase
        .from('course_lesson')
        .select('id')
        .eq('public_id', lessonId)
        .eq('is_deleted', false)
        .single();
      
      if (lessonError) {
        console.error('Error finding lesson:', lessonError);
        return NextResponse.json(
          { message: 'Lesson not found', error: lessonError.message },
          { status: 404 }
        );
      }
      
      if (!lesson) {
        return NextResponse.json({
          success: true,
          data: null
        });
      }
      
      // Now get progress for this lesson (simplified query)
      const { data: progress, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lesson.id)
        .eq('is_deleted', false)
        .single();

      // If progress found, get lesson details separately
      if (progress) {
        const { data: lessonDetails } = await supabase
          .from('course_lesson')
          .select(`
            public_id,
            title,
            kind,
            content_url,
            duration_sec,
            course_module(
              title,
              position,
              course(
                id,
                slug,
                title,
                thumbnail_url
              )
            )
          `)
          .eq('id', lesson.id)
          .single();

        if (lessonDetails) {
          progress.lesson = lessonDetails;
        }
      }
        
      if (error && error.code !== 'PGRST116') { // Not found is OK
        console.error('Error fetching lesson progress:', error);
        return NextResponse.json(
          { message: 'Failed to fetch lesson progress', error: error.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: progress || null
      });
    }
    
    if (courseSlug) {
      // Get all progress for a course
      // First get the course's internal ID
      const { data: course, error: courseError } = await supabase
        .from('course')
        .select('id')
        .eq('slug', courseSlug)
        .eq('is_deleted', false)
        .single();
      
      if (courseError || !course) {
        return NextResponse.json({
          success: true,
          data: []
        });
      }
      
      // Get lessons for this course
      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lesson')
        .select('id')
        .eq('course_id', course.id)
        .eq('is_deleted', false);
      
      if (lessonsError || !lessons || lessons.length === 0) {
        return NextResponse.json({
          success: true,
          data: []
        });
      }
      
      const lessonIds = lessons.map(l => l.id);
      
      // Get progress for these lessons (simplified)
      const { data: progress, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false });

      // If progress found, get lesson details separately
      if (progress && progress.length > 0) {
        const { data: lessonsDetails } = await supabase
          .from('course_lesson')
          .select(`
            id,
            public_id,
            title,
            kind,
            content_url,
            duration_sec,
            position,
            course_module(
              title,
              position,
              course(
                slug
              )
            )
          `)
          .in('id', lessonIds);

        // Attach lesson details to progress records
        if (lessonsDetails) {
          progress.forEach((prog: any) => {
            const lessonDetail = lessonsDetails.find((l: any) => l.id === prog.lesson_id);
            if (lessonDetail) {
              prog.lesson = lessonDetail;
            }
          });
        }
      }
        
      if (error) {
        console.error('Error fetching course progress:', error);
        return NextResponse.json(
          { message: 'Failed to fetch course progress', error: error.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: progress || []
      });
    }
    
    return NextResponse.json(
      { message: 'Missing required parameter: lessonId or courseSlug' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('GET /api/learning-progress error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/learning-progress - Create or update learning progress
export async function POST(request: NextRequest) {
  try {
    const authResponse = await authorize('student');
    if (authResponse instanceof NextResponse) return authResponse;
    
    const { payload } = authResponse;
    const userId = payload.profileId;
    
    const body = await request.json();
    const {
      lessonId,
      progressPct,
      videoPositionSec,
      videoDurationSec,
      timeSpentSec,
      state,
      lessonKind = 'video'
    } = body;
    
    // Validate required fields
    if (!lessonId) {
      return NextResponse.json(
        { message: 'Missing required field: lessonId' },
        { status: 400 }
      );
    }
    
    const supabase = await createAdminClient();
    
    // First, get the lesson's internal ID
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lesson')
      .select('id, duration_sec')
      .eq('public_id', lessonId)
      .eq('is_deleted', false)
      .single();
      
    if (lessonError || !lesson) {
      return NextResponse.json(
        { message: 'Lesson not found', error: lessonError?.message },
        { status: 404 }
      );
    }
    
    // Determine the state based on progress
    let calculatedState = state;
    if (!calculatedState) {
      if (progressPct === 0) {
        calculatedState = 'not_started';
      } else if (progressPct >= 95) {
        calculatedState = 'completed';
      } else {
        calculatedState = 'in_progress';
      }
    }
    
    // Use lesson duration if video duration not provided
    const finalVideoDurationSec = videoDurationSec || lesson.duration_sec || 0;
    
    // Prepare the update data (include both timestamp fields for compatibility)
    const now = new Date().toISOString();
    const updateData = {
      user_id: userId,
      lesson_id: lesson.id,
      progress_pct: progressPct ?? 0,
      video_position_sec: videoPositionSec ?? 0,
      video_duration_sec: finalVideoDurationSec,
      time_spent_sec: timeSpentSec ?? 0,
      state: calculatedState,
      lesson_kind: lessonKind,
      last_accessed_at: now,
      last_seen_at: now,
      is_deleted: false,
      updated_at: now
    };
    
    // Set completion date if completed
    if (calculatedState === 'completed') {
      (updateData as any).completion_date = new Date().toISOString();
    }
    
    // Upsert the progress record
    const { data: progress, error } = await supabase
      .from('course_progress')
      .upsert(updateData, {
        onConflict: 'user_id,lesson_id',
        ignoreDuplicates: false
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error upserting progress:', error);
      return NextResponse.json(
        { message: 'Failed to update progress', error: error.message },
        { status: 500 }
      );
    }
    
    // Also track in video_views table if it's a video
    if (lessonKind === 'video' && videoPositionSec !== undefined) {
      const videoViewData = {
        user_id: userId,
        lesson_id: lesson.id,
        watch_duration_sec: Math.max(videoPositionSec, timeSpentSec || 0),
        total_duration_sec: finalVideoDurationSec,
        last_position_sec: videoPositionSec,
        session_start_time: new Date().toISOString(),
        session_end_time: new Date().toISOString(),
        is_completed: calculatedState === 'completed',
        completed_at: calculatedState === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };
      
      // Insert new video view record (don't upsert as each session should be separate)
      await supabase
        .from('video_views')
        .insert(videoViewData);
    }
    
    return NextResponse.json({
      success: true,
      data: progress,
      message: 'Progress updated successfully'
    });
    
  } catch (error) {
    console.error('POST /api/learning-progress error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/learning-progress - Update progress with video position
export async function PUT(request: NextRequest) {
  try {
    const authResponse = await authorize('student');
    if (authResponse instanceof NextResponse) return authResponse;
    
    const { payload } = authResponse;
    const userId = payload.profileId;
    
    const body = await request.json();
    const {
      lessonId,
      videoPositionSec,
      videoDurationSec,
      progressPct
    } = body;
    
    if (!lessonId || videoPositionSec === undefined) {
      return NextResponse.json(
        { message: 'Missing required fields: lessonId, videoPositionSec' },
        { status: 400 }
      );
    }
    
    const supabase = await createAdminClient();
    
    // Get the lesson's internal ID
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lesson')
      .select('id, duration_sec')
      .eq('public_id', lessonId)
      .eq('is_deleted', false)
      .single();
      
    if (lessonError || !lesson) {
      return NextResponse.json(
        { message: 'Lesson not found' },
        { status: 404 }
      );
    }
    
    // Calculate progress percentage if not provided
    const finalVideoDurationSec = videoDurationSec || lesson.duration_sec || 0;
    const calculatedProgressPct = progressPct ?? (
      finalVideoDurationSec > 0 ? Math.min((videoPositionSec / finalVideoDurationSec) * 100, 100) : 0
    );
    
    // Update existing progress record (include both timestamp fields)
    const now = new Date().toISOString();
    const { data: progress, error } = await supabase
      .from('course_progress')
      .update({
        video_position_sec: videoPositionSec,
        video_duration_sec: finalVideoDurationSec,
        progress_pct: calculatedProgressPct,
        last_accessed_at: now,
        last_seen_at: now,
        updated_at: now
      })
      .eq('user_id', userId)
      .eq('lesson_id', lesson.id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating video position:', error);
      return NextResponse.json(
        { message: 'Failed to update video position', error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: progress,
      message: 'Video position updated'
    });
    
  } catch (error) {
    console.error('PUT /api/learning-progress error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
