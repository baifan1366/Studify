import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

interface RouteParams {
  params: Promise<{
    commentId: string;
  }>;
}

// Toggle comment like/unlike
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const supabase = await createAdminClient();
    
    const { commentId } = await params;
    const { isLiked = true } = await request.json();

    if (!commentId) {
      return NextResponse.json(
        { error: 'commentId is required' },
        { status: 400 }
      );
    }

    // Get comment to validate it exists
    const { data: comment, error: commentError } = await supabase
      .from('video_comments')
      .select('id, public_id')
      .eq('public_id', commentId)
      .eq('is_deleted', false)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    const userId = authResult.user?.profile?.id;

    // Check if user already liked/disliked this comment
    const { data: existingLike } = await supabase
      .from('video_comment_likes')
      .select('*')
      .eq('user_id', userId)
      .eq('comment_id', comment.id)
      .single();

    let likeData;
    let action;

    if (existingLike) {
      if (existingLike.is_liked === isLiked) {
        // Same action - remove the like/dislike
        const { error: deleteError } = await supabase
          .from('video_comment_likes')
          .delete()
          .eq('id', existingLike.id);

        if (deleteError) {
          console.error('Error removing comment like:', deleteError);
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
          .from('video_comment_likes')
          .update({
            is_liked: isLiked,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLike.id)
          .select('*')
          .single();

        if (updateError) {
          console.error('Error updating comment like:', updateError);
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
        .from('video_comment_likes')
        .insert({
          user_id: userId,
          comment_id: comment.id,
          is_liked: isLiked
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Error creating comment like:', insertError);
        return NextResponse.json(
          { error: 'Failed to create like' },
          { status: 500 }
        );
      }

      action = 'created';
      likeData = newLike;
    }

    // Get updated comment with like counts
    const { data: updatedComment } = await supabase
      .from('video_comments')
      .select('id, likes_count')
      .eq('id', comment.id)
      .single();

    return NextResponse.json({
      success: true,
      action,
      like: likeData,
      comment: updatedComment
    });

  } catch (error) {
    console.error('Error in comment likes POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get comment like status and statistics
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const supabase = await createAdminClient();
    
    const { commentId } = await params;

    if (!commentId) {
      return NextResponse.json(
        { error: 'commentId is required' },
        { status: 400 }
      );
    }

    // Get comment to validate it exists
    const { data: comment, error: commentError } = await supabase
      .from('video_comments')
      .select('id, public_id, likes_count')
      .eq('public_id', commentId)
      .eq('is_deleted', false)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    const userId = authResult.user?.profile?.id;

    // Get user's current like status
    const { data: userLike } = await supabase
      .from('video_comment_likes')
      .select('*')
      .eq('user_id', userId)
      .eq('comment_id', comment.id)
      .single();

    // Get detailed like statistics using separate queries
    const { count: likesCount } = await supabase
      .from('video_comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', comment.id)
      .eq('is_liked', true);

    const { count: dislikesCount } = await supabase
      .from('video_comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', comment.id)
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
      },
      comment: {
        id: comment.public_id,
        likes_count: comment.likes_count
      }
    });

  } catch (error) {
    console.error('Error in comment likes GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
