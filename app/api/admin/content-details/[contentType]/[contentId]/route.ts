import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { contentType: string; contentId: string } }
) {
  try {
    // Authorize admin user
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.sub;
    
    const supabaseServer = await createClient();
    const { contentType, contentId } = params;
    
    // Validate parameters
    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: 'Content type and ID are required' },
        { status: 400 }
      );
    }
    
    const id = parseInt(contentId);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid content ID' },
        { status: 400 }
      );
    }
    
    let contentData: any = null;
    
    // Fetch content based on type
    switch (contentType) {
      case 'course':
        const { data: course } = await supabaseServer
          .from('course')
          .select(`
            id,
            title,
            description,
            tutor_id,
            created_at,
            updated_at,
            status,
            tutor_profile:profiles!tutor_id(id, full_name, avatar_url)
          `)
          .eq('id', id)
          .single();
        
        // Get enrollment count separately
        const { count: enrollmentCount } = await supabaseServer
          .from('course_enrollment')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', id);
        
        // Get report count separately
        const { count: reportCount } = await supabaseServer
          .from('report')
          .select('*', { count: 'exact', head: true })
          .eq('target_type', 'course')
          .eq('target_id', id.toString())
          .eq('status', 'pending');
        
        if (course) {
          contentData = {
            id: course.id,
            type: 'course',
            title: course.title,
            content: course.description,
            author_id: course.tutor_id,
            created_at: course.created_at,
            updated_at: course.updated_at,
            status: course.status,
            author_profile: course.tutor_profile,
            comment_count: 0, // Courses don't have direct comments
            reaction_count: 0, // Courses don't have direct reactions
            report_count: reportCount || 0,
            enrollment_count: enrollmentCount || 0,
          };
        }
        break;
        
      case 'post':
        const { data: post } = await supabaseServer
          .from('community_post')
          .select(`
            id,
            title,
            body,
            user_id,
            created_at,
            updated_at,
            status,
            author_profile:profiles!user_id(id, full_name, avatar_url)
          `)
          .eq('id', id)
          .single();
        
        // Get counts separately
        const [
          { count: commentCount },
          { count: reactionCount },
          { count: postReportCount }
        ] = await Promise.all([
          supabaseServer
            .from('community_comment')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', id),
          supabaseServer
            .from('community_reaction')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', id),
          supabaseServer
            .from('report')
            .select('*', { count: 'exact', head: true })
            .eq('target_type', 'post')
            .eq('target_id', id.toString())
            .eq('status', 'pending')
        ]);
        
        if (post) {
          // Get reaction breakdown
          const { data: reactionBreakdown } = await supabaseServer
            .from('community_reaction')
            .select('reaction_type')
            .eq('post_id', id);
          
          const reactions: Record<string, number> = {};
          reactionBreakdown?.forEach(reaction => {
            reactions[reaction.reaction_type] = (reactions[reaction.reaction_type] || 0) + 1;
          });
          
          contentData = {
            id: post.id,
            type: 'post',
            title: post.title,
            content: post.body,
            body: post.body,
            author_id: post.user_id,
            user_id: post.user_id,
            created_at: post.created_at,
            updated_at: post.updated_at,
            status: post.status,
            author_profile: post.author_profile,
            comment_count: commentCount || 0,
            reaction_count: reactionCount || 0,
            report_count: postReportCount || 0,
            reactions,
          };
        }
        break;
        
      case 'comment':
        const { data: comment } = await supabaseServer
          .from('community_comment')
          .select(`
            id,
            body,
            user_id,
            post_id,
            created_at,
            updated_at,
            author_profile:profiles!user_id(id, full_name, avatar_url)
          `)
          .eq('id', id)
          .single();
        
        // Get parent post separately to avoid array issues
        let parentPost = null;
        if (comment?.post_id) {
          const { data: postData } = await supabaseServer
            .from('community_post')
            .select('id, title')
            .eq('id', comment.post_id)
            .single();
          parentPost = postData;
        }
        
        // Get counts separately
        const [
          { count: commentReactionCount },
          { count: commentReportCount }
        ] = await Promise.all([
          supabaseServer
            .from('community_reaction')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', id),
          supabaseServer
            .from('report')
            .select('*', { count: 'exact', head: true })
            .eq('target_type', 'comment')
            .eq('target_id', id.toString())
            .eq('status', 'pending')
        ]);
        
        if (comment) {
          // Get reaction breakdown
          const { data: reactionBreakdown } = await supabaseServer
            .from('community_reaction')
            .select('reaction_type')
            .eq('comment_id', id);
          
          const reactions: Record<string, number> = {};
          reactionBreakdown?.forEach(reaction => {
            reactions[reaction.reaction_type] = (reactions[reaction.reaction_type] || 0) + 1;
          });
          
          contentData = {
            id: comment.id,
            type: 'comment',
            title: `Comment on: ${parentPost?.title || 'Unknown Post'}`,
            content: comment.body,
            body: comment.body,
            author_id: comment.user_id,
            user_id: comment.user_id,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            status: null,
            author_profile: comment.author_profile,
            comment_count: 0, // Comments don't have sub-comments
            reaction_count: commentReactionCount || 0,
            report_count: commentReportCount || 0,
            reactions,
            post_id: comment.post_id,
          };
        }
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid content type' },
          { status: 400 }
        );
    }
    
    if (!contentData) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(contentData);
    
  } catch (error) {
    console.error('[ADMIN_CONTENT_DETAILS_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to fetch content details' },
      { status: 500 }
    );
  }
}
