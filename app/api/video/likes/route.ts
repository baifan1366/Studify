import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// Toggle video like/unlike
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const supabase = await createAdminClient();
    
    const { lessonId, attachmentId, isLiked = true } = await request.json();

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

    const userId = authResult.user.profile?.id || authResult.user.id;

    // Check if user already liked/disliked this video
    const { data: existingLike } = await supabase
      .from('video_likes')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .single();

    let likeData;
    let action;

    if (existingLike) {
      if (existingLike.is_liked === isLiked) {
        // Same action - remove the like/dislike
        const { error: deleteError } = await supabase
          .from('video_likes')
          .update({ is_deleted: true })
          .eq('id', existingLike.id);

        if (deleteError) {
          console.error('Error removing like:', deleteError);
          return NextResponse.json(
            { error: 'Failed to remove like' },
            { status: 500 }
          );
        }

        action = 'removed';
        likeData = null;
      } else {
        // Different action - update the like/dislike
        const { data: updatedLike, error: updateError } = await supabase
          .from('video_likes')
          .update({
            is_liked: isLiked,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLike.id)
          .select('*')
          .single();

        if (updateError) {
          console.error('Error updating like:', updateError);
          return NextResponse.json(
            { error: 'Failed to update like' },
            { status: 500 }
          );
        }

        action = 'updated';
        likeData = updatedLike;
      }
    } else {
      // Create new like/dislike
      const { data: newLike, error: insertError } = await supabase
        .from('video_likes')
        .insert({
          user_id: userId,
          lesson_id: lesson.id,
          attachment_id: attachmentId,
          is_liked: isLiked
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Error creating like:', insertError);
        return NextResponse.json(
          { error: 'Failed to create like' },
          { status: 500 }
        );
      }

      action = 'created';
      likeData = newLike;
    }

    // Get updated like statistics
    const { count: likesCount } = await supabase
      .from('video_likes')
      .select('*', { count: 'exact' })
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .eq('is_liked', true);

    const { count: dislikesCount } = await supabase
      .from('video_likes')
      .select('*', { count: 'exact' })
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .eq('is_liked', false);

    const likeStats = {
      likes_count: likesCount || 0,
      dislikes_count: dislikesCount || 0,
      total_reactions: (likesCount || 0) + (dislikesCount || 0)
    };

    return NextResponse.json({
      success: true,
      action,
      like: likeData,
      stats: likeStats
    });

  } catch (error) {
    console.error('Error in video likes POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get video like statistics and user's like status
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

    const userId = authResult.user.profile?.id || authResult.user.id;

    // Get user's current like status
    const { data: userLike } = await supabase
      .from('video_likes')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .single();

    // Get overall like statistics
    const { count: likesCount } = await supabase
      .from('video_likes')
      .select('*', { count: 'exact' })
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .eq('is_liked', true);

    const { count: dislikesCount } = await supabase
      .from('video_likes')
      .select('*', { count: 'exact' })
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .eq('is_liked', false);

    const likeStats = {
      likes_count: likesCount || 0,
      dislikes_count: dislikesCount || 0,
      total_reactions: (likesCount || 0) + (dislikesCount || 0)
    };

    return NextResponse.json({
      success: true,
      userLike: userLike || null,
      currentUserLiked: userLike?.is_liked || null,
      stats: likeStats || {
        likes_count: 0,
        dislikes_count: 0,
        total_reactions: 0
      }
    });

  } catch (error) {
    console.error('Error in video likes GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
