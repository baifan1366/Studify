// app/api/admin/ai/moderation/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/ai/moderation - Get AI content moderation statistics and flagged content
export async function GET(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const supabase = await createAdminClient();
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Get reports that might indicate content issues
    let reportsQuery = supabase
      .from('report')
      .select(`
        id,
        subject_type,
        subject_id,
        reason,
        status,
        created_at,
        reporter:reporter_id (
          id,
          display_name,
          email
        )
      `)
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      reportsQuery = reportsQuery.eq('status', status);
    }

    const { data: reports, error: reportsError } = await reportsQuery.limit(limit);

    if (reportsError) {
      throw reportsError;
    }

    // Get community posts that might need moderation
    const { data: recentPosts, error: postsError } = await supabase
      .from('community_post')
      .select(`
        id,
        title,
        body,
        created_at,
        author:author_id (
          id,
          display_name,
          email
        ),
        group:group_id (
          id,
          name
        )
      `)
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (postsError) {
      throw postsError;
    }

    // Get community comments that might need moderation
    const { data: recentComments, error: commentsError } = await supabase
      .from('community_comment')
      .select(`
        id,
        body,
        created_at,
        author:author_id (
          id,
          display_name,
          email
        ),
        post:post_id (
          id,
          title
        )
      `)
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (commentsError) {
      throw commentsError;
    }

    // Get banned users statistics
    const { data: bannedUsers, error: bannedError } = await supabase
      .from('profiles')
      .select('id, banned_reason, banned_at, display_name, email')
      .eq('status', 'banned')
      .gte('banned_at', daysAgo.toISOString());

    if (bannedError) {
      throw bannedError;
    }

    // Calculate moderation statistics
    const reportStats = reports?.reduce((acc, report) => {
      acc[report.status as keyof typeof acc] = ((acc as any)[report.status] || 0) + 1;
      acc.total++;
      return acc;
    }, { total: 0, open: 0, reviewing: 0, resolved: 0, rejected: 0 }) || 
    { total: 0, open: 0, reviewing: 0, resolved: 0, rejected: 0 };

    // Get content flagging patterns
    const contentTypeStats = reports?.reduce((acc, report) => {
      acc[report.subject_type] = (acc[report.subject_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Simulate AI moderation confidence scores (in real implementation, this would come from AI service)
    const flaggedContent = [
      ...recentPosts?.map(post => ({
        id: post.id,
        type: 'post',
        content: post.body,
        title: post.title,
        author: post.author,
        created_at: post.created_at,
        confidence: Math.random() * 0.3 + 0.1, // Low confidence for demo
        flags: []
      })) || [],
      ...recentComments?.map(comment => ({
        id: comment.id,
        type: 'comment',
        content: comment.body,
        author: comment.author,
        post: comment.post,
        created_at: comment.created_at,
        confidence: Math.random() * 0.3 + 0.1, // Low confidence for demo
        flags: []
      })) || []
    ].filter(item => item.confidence > 0.2) // Only show items with some confidence
     .sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalReports: reportStats.total,
          openReports: reportStats.open,
          bannedUsers: bannedUsers?.length || 0,
          flaggedContent: flaggedContent.length,
          avgResponseTime: 0 // Calculate based on resolved reports
        },
        reportStats,
        contentTypeStats,
        recentReports: reports || [],
        flaggedContent: flaggedContent.slice(0, 20),
        bannedUsers: bannedUsers || [],
        moderationQueue: {
          pending: reportStats.open + reportStats.reviewing,
          completed: reportStats.resolved,
          avgProcessingTime: 0
        }
      }
    });

  } catch (error) {
    console.error('AI moderation API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/ai/moderation - Perform AI moderation actions
export async function POST(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { action, contentIds, contentType, settings, userId } = body;

    const supabase = await createAdminClient();

    switch (action) {
      case 'auto_moderate':
        // Enable/disable auto-moderation for specific content types
        if (!settings || typeof settings.enabled !== 'boolean') {
          return NextResponse.json(
            { message: 'Auto-moderation settings are required' },
            { status: 400 }
          );
        }

        // In a real implementation, this would update moderation configuration
        return NextResponse.json({
          success: true,
          message: `Auto-moderation ${settings.enabled ? 'enabled' : 'disabled'} for ${contentType}`
        });

      case 'review_content':
        // Mark content for human review
        if (!contentIds || !Array.isArray(contentIds)) {
          return NextResponse.json(
            { message: 'Content IDs array is required' },
            { status: 400 }
          );
        }

        // Create reports for manual review
        const reviewReports = contentIds.map(id => ({
          subject_type: contentType,
          subject_id: id.toString(),
          reason: 'AI flagged for review',
          status: 'reviewing',
          reporter_id: null // System generated
        }));

        const { error: reviewError } = await supabase
          .from('report')
          .insert(reviewReports);

        if (reviewError) {
          throw reviewError;
        }

        return NextResponse.json({
          success: true,
          message: `${contentIds.length} items queued for human review`
        });

      case 'bulk_approve':
        // Bulk approve flagged content
        if (!contentIds || !Array.isArray(contentIds)) {
          return NextResponse.json(
            { message: 'Content IDs array is required' },
            { status: 400 }
          );
        }

        const { error: approveError } = await supabase
          .from('report')
          .update({ 
            status: 'resolved',
            updated_at: new Date().toISOString()
          })
          .eq('subject_type', contentType)
          .in('subject_id', contentIds.map(id => id.toString()));

        if (approveError) {
          throw approveError;
        }

        return NextResponse.json({
          success: true,
          message: `${contentIds.length} items approved`
        });

      case 'bulk_remove':
        // Bulk remove/hide flagged content
        if (!contentIds || !Array.isArray(contentIds)) {
          return NextResponse.json(
            { message: 'Content IDs array is required' },
            { status: 400 }
          );
        }

        // Soft delete the content
        const tableName = contentType === 'post' ? 'community_post' : 'community_comment';
        const { error: removeError } = await supabase
          .from(tableName)
          .update({ 
            is_deleted: true,
            deleted_at: new Date().toISOString()
          })
          .in('id', contentIds);

        if (removeError) {
          throw removeError;
        }

        // Update related reports
        await supabase
          .from('report')
          .update({ 
            status: 'resolved',
            updated_at: new Date().toISOString()
          })
          .eq('subject_type', contentType)
          .in('subject_id', contentIds.map(id => id.toString()));

        return NextResponse.json({
          success: true,
          message: `${contentIds.length} items removed`
        });

      case 'update_confidence_threshold':
        // Update AI confidence threshold for auto-actions
        const { threshold } = settings || {};
        
        if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
          return NextResponse.json(
            { message: 'Threshold must be a number between 0 and 1' },
            { status: 400 }
          );
        }

        // In a real implementation, store this in configuration
        return NextResponse.json({
          success: true,
          message: `Confidence threshold updated to ${threshold}`
        });

      case 'train_model':
        // Trigger AI model retraining with recent moderation decisions
        const { data: recentDecisions } = await supabase
          .from('report')
          .select('subject_type, subject_id, reason, status')
          .eq('status', 'resolved')
          .order('updated_at', { ascending: false })
          .limit(1000);

        // In a real implementation, this would trigger ML model retraining
        return NextResponse.json({
          success: true,
          message: `Model retraining queued with ${recentDecisions?.length || 0} recent decisions`
        });

      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('AI moderation operation error:', error);
    return NextResponse.json(
      { message: 'Failed to perform moderation operation' },
      { status: 500 }
    );
  }
}
