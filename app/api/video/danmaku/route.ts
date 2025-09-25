import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// Send danmaku/bullet comment
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const supabase = await createAdminClient();
    
    const { 
      lessonId, 
      attachmentId, 
      content, 
      videoTimeSec, 
      color = '#FFFFFF',
      size = 'medium',
      displayType = 'scroll'
    } = await request.json();

    if (!lessonId || !content || videoTimeSec === undefined) {
      return NextResponse.json(
        { error: 'lessonId, content, and videoTimeSec are required' },
        { status: 400 }
      );
    }

    // Validate content length
    if (content.length > 100) {
      return NextResponse.json(
        { error: 'Danmaku content must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Validate color format
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        { error: 'Invalid color format. Use hex format #RRGGBB' },
        { status: 400 }
      );
    }

    // Validate size
    if (!['small', 'medium', 'large'].includes(size)) {
      return NextResponse.json(
        { error: 'Size must be small, medium, or large' },
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
      console.error('POST danmaku - Lesson lookup failed:', {
        lessonId,
        lessonError,
        lesson
      });
      return NextResponse.json(
        { error: 'Lesson not found', details: lessonError?.message },
        { status: 404 }
      );
    }

    // Check for rate limiting - max 10 danmaku per minute per user
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentDanmaku, error: countError } = await supabase
      .from('video_danmaku')
      .select('id')
      .eq('user_id', authResult.user.profile?.id || authResult.user.id)
      .eq('lesson_id', lesson.id)
      .gte('created_at', oneMinuteAgo)
      .eq('is_deleted', false);

    if (countError) {
      console.error('Error checking danmaku rate limit:', countError);
    } else if (recentDanmaku && recentDanmaku.length >= 10) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 10 danmaku per minute.' },
        { status: 429 }
      );
    }

    // Create danmaku
    const { data: danmakuData, error: insertError } = await supabase
      .from('video_danmaku')
      .insert({
        user_id: authResult.user.profile?.id || authResult.user.id,
        lesson_id: lesson.id,
        attachment_id: attachmentId,
        content: content.trim(),
        video_time_sec: videoTimeSec,
        color,
        size,
        display_type: displayType
      })
      .select(`
        *,
        author:profiles!video_danmaku_user_id_fkey(
          id,
          full_name,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (insertError) {
      console.error('Error creating danmaku:', insertError);
      return NextResponse.json(
        { error: 'Failed to create danmaku' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      danmaku: danmakuData
    });

  } catch (error) {
    console.error('Error in danmaku POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get danmaku for a video lesson
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student'); // Ensure user is authenticated
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const supabase = await createAdminClient();
    
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const startTime = searchParams.get('startTime'); // Optional: get danmaku from specific time
    const endTime = searchParams.get('endTime'); // Optional: get danmaku until specific time
    
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
      console.error('GET danmaku - Lesson lookup failed:', {
        lessonId,
        lessonError,
        lesson
      });
      return NextResponse.json(
        { error: 'Lesson not found', details: lessonError?.message },
        { status: 404 }
      );
    }

    // Build query for danmaku
    let query = supabase
      .from('video_danmaku')
      .select(`
        *,
        author:profiles!video_danmaku_user_id_fkey(
          id,
          full_name,
          display_name,
          avatar_url
        )
      `)
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .eq('is_approved', true)
      .eq('is_blocked', false)
      .order('video_time_sec', { ascending: true });

    // Add time range filters if provided
    if (startTime !== null && !isNaN(parseFloat(startTime))) {
      query = query.gte('video_time_sec', parseFloat(startTime));
    }
    
    if (endTime !== null && !isNaN(parseFloat(endTime))) {
      query = query.lte('video_time_sec', parseFloat(endTime));
    }

    const { data: danmakuList, error: danmakuError } = await query;

    if (danmakuError) {
      console.error('Error fetching danmaku:', danmakuError);
      return NextResponse.json(
        { error: 'Failed to fetch danmaku' },
        { status: 500 }
      );
    }

    // Get danmaku statistics
    const { count: totalDanmaku } = await supabase
      .from('video_danmaku')
      .select('*', { count: 'exact' })
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .eq('is_approved', true);

    // For unique senders, we need to get the data and count unique user_ids
    const { data: danmakuUsers } = await supabase
      .from('video_danmaku')
      .select('user_id')
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .eq('is_approved', true);

    const uniqueSenders = new Set(danmakuUsers?.map(d => d.user_id) || []).size;

    const danmakuStats = {
      total_danmaku: totalDanmaku || 0,
      unique_senders: uniqueSenders
    };

    return NextResponse.json({
      success: true,
      danmaku: danmakuList || [],
      stats: danmakuStats,
      timeRange: {
        startTime: startTime ? parseFloat(startTime) : null,
        endTime: endTime ? parseFloat(endTime) : null
      }
    });

  } catch (error) {
    console.error('Error in danmaku GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete danmaku (only by owner)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const supabase = await createAdminClient();
    
    const { searchParams } = new URL(request.url);
    const danmakuId = searchParams.get('danmakuId');
    
    if (!danmakuId) {
      return NextResponse.json(
        { error: 'danmakuId is required' },
        { status: 400 }
      );
    }

    // Check if danmaku exists and belongs to user
    const { data: danmaku, error: fetchError } = await supabase
      .from('video_danmaku')
      .select('*')
      .eq('public_id', danmakuId)
      .eq('user_id', authResult.user.profile?.id || authResult.user.id)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !danmaku) {
      return NextResponse.json(
        { error: 'Danmaku not found or access denied' },
        { status: 404 }
      );
    }

    // Soft delete the danmaku
    const { error: deleteError } = await supabase
      .from('video_danmaku')
      .update({ 
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', danmaku.id);

    if (deleteError) {
      console.error('Error deleting danmaku:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete danmaku' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Danmaku deleted successfully'
    });

  } catch (error) {
    console.error('Error in danmaku DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
