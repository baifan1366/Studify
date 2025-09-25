import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// Create video comment
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
      parentId, 
      replyToUserId,
      videoTimeSec,
      contentType = 'text'
    } = await request.json();

    if (!lessonId || !content) {
      return NextResponse.json(
        { error: 'lessonId and content are required' },
        { status: 400 }
      );
    }

    // Validate content length
    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Comment content must be 2000 characters or less' },
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
      console.error('POST comments - Lesson lookup failed:', {
        lessonId,
        lessonError,
        lesson
      });
      return NextResponse.json(
        { error: 'Lesson not found', details: lessonError?.message },
        { status: 404 }
      );
    }

    // If replying to a comment, validate parent comment exists
    let parentCommentId = null;
    if (parentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from('video_comments')
        .select('id, lesson_id')
        .eq('public_id', parentId)
        .eq('is_deleted', false)
        .single();

      if (parentError || !parentComment || parentComment.lesson_id !== lesson.id) {
        return NextResponse.json(
          { error: 'Parent comment not found or invalid' },
          { status: 400 }
        );
      }
      parentCommentId = parentComment.id;
    }

    // Create comment
    const { data: commentData, error: insertError } = await supabase
      .from('video_comments')
      .insert({
        user_id: authResult.user.profile?.id || authResult.user.id,
        lesson_id: lesson.id,
        attachment_id: attachmentId,
        parent_id: parentCommentId,
        reply_to_user_id: replyToUserId,
        content: content.trim(),
        content_type: contentType,
        video_time_sec: videoTimeSec
      })
      .select(`
        *,
        author:profiles!video_comments_user_id_fkey(
          id,
          full_name,
          display_name,
          avatar_url
        ),
        reply_to_user:profiles!video_comments_reply_to_user_id_fkey(
          id,
          full_name,
          display_name
        )
      `)
      .single();

    if (insertError) {
      console.error('Error creating comment:', insertError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: commentData
    });

  } catch (error) {
    console.error('Error in comments POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get video comments with pagination and threading
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student'); // Ensure user is authenticated
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const supabase = await createAdminClient();
    
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const parentId = searchParams.get('parentId'); // For getting replies
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'newest'; // newest, oldest, popular
    
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
      console.error('GET comments - Lesson lookup failed:', {
        lessonId,
        lessonError,
        lesson
      });
      return NextResponse.json(
        { error: 'Lesson not found', details: lessonError?.message },
        { status: 404 }
      );
    }

    // Build base query
    let query = supabase
      .from('video_comments')
      .select(`
        *,
        author:profiles!video_comments_user_id_fkey(
          id,
          full_name,
          display_name,
          avatar_url
        ),
        reply_to_user:profiles!video_comments_reply_to_user_id_fkey(
          id,
          full_name,
          display_name
        )
      `)
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .eq('is_approved', true);

    // Filter by parent (for threading)
    if (parentId) {
      // Get replies to a specific comment
      const { data: parentComment } = await supabase
        .from('video_comments')
        .select('id')
        .eq('public_id', parentId)
        .single();
      
      if (parentComment) {
        query = query.eq('parent_id', parentComment.id);
      } else {
        return NextResponse.json({ success: true, comments: [], pagination: {} });
      }
    } else {
      // Get top-level comments only
      query = query.is('parent_id', null);
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'popular':
        query = query.order('likes_count', { ascending: false });
        break;
      default: // newest
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: comments, error: commentsError } = await query;

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('video_comments')
      .select('id', { count: 'exact' })
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .eq('is_approved', true);

    if (parentId) {
      const { data: parentComment } = await supabase
        .from('video_comments')
        .select('id')
        .eq('public_id', parentId)
        .single();
      if (parentComment) {
        countQuery = countQuery.eq('parent_id', parentComment.id);
      }
    } else {
      countQuery = countQuery.is('parent_id', null);
    }

    const { count: totalCount } = await countQuery;

    // For top-level comments, get reply counts
    let commentsWithReplies = comments;
    if (!parentId && comments) {
      // Get reply counts for each comment
      const commentIds = comments.map((c: any) => c.id);
      if (commentIds.length > 0) {
        const { data: replyCounts } = await supabase
          .from('video_comments')
          .select('parent_id')
          .in('parent_id', commentIds)
          .eq('is_deleted', false)
          .eq('is_approved', true);

        const replyCountMap = new Map();
        replyCounts?.forEach((reply: any) => {
          replyCountMap.set(reply.parent_id, (replyCountMap.get(reply.parent_id) || 0) + 1);
        });

        commentsWithReplies = comments.map((comment: any) => ({
          ...comment,
          replies_count: replyCountMap.get(comment.id) || 0
        }));
      }
    }

    return NextResponse.json({
      success: true,
      comments: commentsWithReplies || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasMore: ((totalCount || 0) > offset + limit)
      },
      sortBy
    });

  } catch (error) {
    console.error('Error in comments GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update comment (edit content)
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const supabase = await createAdminClient();
    
    const { commentId, content, contentType = 'text' } = await request.json();

    if (!commentId || !content) {
      return NextResponse.json(
        { error: 'commentId and content are required' },
        { status: 400 }
      );
    }

    // Validate content length
    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Comment content must be 2000 characters or less' },
        { status: 400 }
      );
    }

    // Check if comment exists and belongs to user
    const { data: comment, error: fetchError } = await supabase
      .from('video_comments')
      .select('*')
      .eq('public_id', commentId)
      .eq('user_id', authResult.user.profile?.id || authResult.user.id)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found or access denied' },
        { status: 404 }
      );
    }

    // Update comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('video_comments')
      .update({
        content: content.trim(),
        content_type: contentType,
        updated_at: new Date().toISOString()
      })
      .eq('id', comment.id)
      .select(`
        *,
        author:profiles!video_comments_user_id_fkey(
          id,
          full_name,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating comment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: updatedComment
    });

  } catch (error) {
    console.error('Error in comments PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete comment
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const supabase = await createAdminClient();
    
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    
    if (!commentId) {
      return NextResponse.json(
        { error: 'commentId is required' },
        { status: 400 }
      );
    }

    // Check if comment exists and belongs to user
    const { data: comment, error: fetchError } = await supabase
      .from('video_comments')
      .select('*')
      .eq('public_id', commentId)
      .eq('user_id', authResult.user.profile?.id || authResult.user.id)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found or access denied' },
        { status: 404 }
      );
    }

    // Soft delete the comment
    const { error: deleteError } = await supabase
      .from('video_comments')
      .update({ 
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', comment.id);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Error in comments DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
