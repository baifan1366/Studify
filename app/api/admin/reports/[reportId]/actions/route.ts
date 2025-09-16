// app/api/admin/reports/[reportId]/actions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// POST /api/admin/reports/[reportId]/actions - Take moderation action
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { reportId } = await params;
    const { action, notes, ban_duration_hours } = await request.json();

    if (!action || !['hide', 'delete', 'warn', 'ban'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Get report details
    const { data: report, error: reportError } = await supabase
      .from('report')
      .select('*')
      .eq('public_id', reportId)
      .eq('is_deleted', false)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ message: 'Report not found' }, { status: 404 });
    }

    // Start transaction-like operations
    const results = [];

    // 1. Create action record
    const { data: actionRecord, error: actionError } = await supabase
      .from('action')
      .insert({
        report_id: report.id,
        actor_id: authResult.user.profile?.id,
        action,
        notes: notes || null
      })
      .select()
      .single();

    if (actionError) {
      console.error('Error creating action:', actionError);
      return NextResponse.json({ message: 'Failed to create action' }, { status: 500 });
    }

    results.push({ type: 'action_created', data: actionRecord });

    // 2. Execute the moderation action
    switch (action) {
      case 'hide':
        await executeHideAction(supabase, report);
        results.push({ type: 'content_hidden' });
        break;

      case 'delete':
        await executeDeleteAction(supabase, report);
        results.push({ type: 'content_deleted' });
        break;

      case 'warn':
        await executeWarnAction(supabase, report, authResult.user.profile?.id);
        results.push({ type: 'user_warned' });
        break;

      case 'ban':
        await executeBanAction(supabase, report, ban_duration_hours, notes, authResult.user.profile?.id);
        results.push({ type: 'user_banned' });
        break;
    }

    // 3. Update report status to resolved
    await supabase
      .from('report')
      .update({
        status: 'resolved',
        updated_at: new Date().toISOString()
      })
      .eq('id', report.id);

    // 4. Log audit trail
    await supabase
      .from('audit_log')
      .insert({
        actor_id: authResult.user.profile?.id,
        action: `moderation_${action}`,
        subject_type: report.subject_type,
        subject_id: report.subject_id,
        meta: {
          report_id: report.id,
          report_public_id: reportId,
          action_notes: notes,
          ban_duration_hours: ban_duration_hours || null
        }
      });

    return NextResponse.json({
      message: `${action.charAt(0).toUpperCase() + action.slice(1)} action executed successfully`,
      results
    });

  } catch (error) {
    console.error('Admin moderation action error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions for different moderation actions
async function executeHideAction(supabase: any, report: any) {
  const tableName = getTableName(report.subject_type);
  if (!tableName) return;

  // Add a hidden flag or move to hidden status
  await supabase
    .from(tableName)
    .update({ 
      is_deleted: true, // Soft delete to hide content
      deleted_at: new Date().toISOString()
    })
    .eq('id', parseInt(report.subject_id));
}

async function executeDeleteAction(supabase: any, report: any) {
  const tableName = getTableName(report.subject_type);
  if (!tableName) return;

  // Hard delete or mark as permanently deleted
  await supabase
    .from(tableName)
    .update({ 
      is_deleted: true,
      deleted_at: new Date().toISOString()
    })
    .eq('id', parseInt(report.subject_id));
}

async function executeWarnAction(supabase: any, report: any, adminId: number) {
  // Get the content author
  const authorId = await getContentAuthorId(supabase, report);
  if (!authorId) return;

  // Create a warning notification or record
  // This could be implemented as a notification or a separate warnings table
  console.log(`Warning issued to user ${authorId} for ${report.subject_type} ${report.subject_id}`);
}

async function executeBanAction(supabase: any, report: any, durationHours: number, reason: string, adminId: number) {
  // Get the content author
  const authorId = await getContentAuthorId(supabase, report);
  if (!authorId) return;

  const expiresAt = durationHours 
    ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
    : null; // Permanent ban if no duration

  // Create ban record
  await supabase
    .from('ban')
    .insert({
      user_id: authorId,
      reason: reason || 'Content violation',
      expires_at: expiresAt
    });

  // Update user status to banned
  await supabase
    .from('profiles')
    .update({
      status: 'banned',
      banned_reason: reason || 'Content violation',
      banned_at: new Date().toISOString()
    })
    .eq('id', authorId);
}

function getTableName(subjectType: string): string | null {
  const tableMap: Record<string, string> = {
    'post': 'community_post',
    'comment': 'community_comment',
    'course': 'course',
    'profile': 'profiles'
  };
  return tableMap[subjectType] || null;
}

async function getContentAuthorId(supabase: any, report: any): Promise<number | null> {
  try {
    switch (report.subject_type) {
      case 'post':
        const { data: post } = await supabase
          .from('community_post')
          .select('author_id')
          .eq('id', parseInt(report.subject_id))
          .single();
        return post?.author_id || null;

      case 'comment':
        const { data: comment } = await supabase
          .from('community_comment')
          .select('author_id')
          .eq('id', parseInt(report.subject_id))
          .single();
        return comment?.author_id || null;

      case 'course':
        const { data: course } = await supabase
          .from('course')
          .select('owner_id')
          .eq('id', parseInt(report.subject_id))
          .single();
        return course?.owner_id || null;

      case 'profile':
        return parseInt(report.subject_id);

      default:
        return null;
    }
  } catch (error) {
    console.error('Error getting content author:', error);
    return null;
  }
}
