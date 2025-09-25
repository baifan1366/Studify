import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(request: NextRequest) {
  try {
    // Authorize admin access
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }    
    const userId = authResult.sub;
    const supabase = await createClient();

    // Get community statistics
    const [
      postsResult,
      commentsResult,
      groupsResult,
      reportsResult,
      postsWithReportsResult,
      commentsWithReportsResult
    ] = await Promise.all([
      // Total posts
      supabase
        .from('community_post')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false),
      
      // Total comments
      supabase
        .from('community_comment')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false),
      
      // Total groups
      supabase
        .from('community_group')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false),
      
      // Total reports
      supabase
        .from('report')
        .select('*', { count: 'exact', head: true })
        .in('target_type', ['post', 'comment']),
      
      // Posts with reports
      supabase
        .from('report')
        .select('target_id', { count: 'exact' })
        .eq('target_type', 'post'),
      
      // Comments with reports
      supabase
        .from('report')
        .select('target_id', { count: 'exact' })
        .eq('target_type', 'comment')
    ]);

    // Get most active authors (top 5)
    const { data: topAuthors } = await supabase
      .from('community_post')
      .select(`
        author_id,
        author:profiles!community_post_author_id_fkey (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('is_deleted', false)
      .limit(1000); // Get enough data to analyze

    // Count posts per author
    const authorStats = topAuthors?.reduce((acc, post) => {
      const authorId = post.author_id;
      if (!acc[authorId]) {
        acc[authorId] = {
          author: post.author,
          post_count: 0,
        };
      }
      acc[authorId].post_count++;
      return acc;
    }, {} as Record<number, { author: any; post_count: number }>);

    const topAuthorsList = Object.values(authorStats || {})
      .sort((a, b) => b.post_count - a.post_count)
      .slice(0, 5);

    // Get most commented posts (top 5)
    const { data: postsForComments } = await supabase
      .from('community_post')
      .select(`
        id,
        title,
        author:profiles!community_post_author_id_fkey (
          full_name,
          email
        )
      `)
      .eq('is_deleted', false);

    const postCommentCounts = await Promise.all(
      (postsForComments || []).slice(0, 100).map(async (post) => {
        const { count } = await supabase
          .from('community_comment')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
          .eq('is_deleted', false);

        return {
          ...post,
          comment_count: count || 0,
        };
      })
    );

    const topCommentedPosts = postCommentCounts
      .sort((a, b) => b.comment_count - a.comment_count)
      .slice(0, 5);

    return NextResponse.json({
      total_posts: postsResult.count || 0,
      total_comments: commentsResult.count || 0,
      total_groups: groupsResult.count || 0,
      total_reports: reportsResult.count || 0,
      posts_with_reports: postsWithReportsResult.count || 0,
      comments_with_reports: commentsWithReportsResult.count || 0,
      top_authors: topAuthorsList,
      top_commented_posts: topCommentedPosts,
    });

  } catch (error) {
    console.error('Admin community stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
