// app/api/admin/reports/batch/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// POST /api/admin/reports/batch - Batch operations on multiple reports
export async function POST(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { reportIds, action, notes, ban_duration_hours } = await request.json();

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return NextResponse.json({ message: 'Report IDs are required' }, { status: 400 });
    }

    if (!action || !['resolve', 'reject', 'hide_all', 'delete_all', 'ban_all'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const results = [];
    const errors = [];

    // Process each report
    for (const reportId of reportIds) {
      try {
        // Get report details
        const { data: report, error: reportError } = await supabase
          .from('report')
          .select('*')
          .eq('public_id', reportId)
          .eq('is_deleted', false)
          .single();

        if (reportError || !report) {
          errors.push({ reportId, error: 'Report not found' });
          continue;
        }

        // Execute batch action
        switch (action) {
          case 'resolve':
            await supabase
              .from('report')
              .update({
                status: 'resolved',
                updated_at: new Date().toISOString()
              })
              .eq('id', report.id);
            break;

          case 'reject':
            await supabase
              .from('report')
              .update({
                status: 'rejected',
                updated_at: new Date().toISOString()
              })
              .eq('id', report.id);
            break;

          case 'hide_all':
            await executeBatchModerationAction(supabase, report, 'hide', notes, authResult.user.profile?.id);
            await supabase
              .from('report')
              .update({ status: 'resolved', updated_at: new Date().toISOString() })
              .eq('id', report.id);
            break;

          case 'delete_all':
            await executeBatchModerationAction(supabase, report, 'delete', notes, authResult.user.profile?.id);
            await supabase
              .from('report')
              .update({ status: 'resolved', updated_at: new Date().toISOString() })
              .eq('id', report.id);
            break;

          case 'ban_all':
            await executeBatchModerationAction(supabase, report, 'ban', notes, authResult.user.profile?.id, ban_duration_hours);
            await supabase
              .from('report')
              .update({ status: 'resolved', updated_at: new Date().toISOString() })
              .eq('id', report.id);
            break;
        }

        // Create action record
        await supabase
          .from('action')
          .insert({
            report_id: report.id,
            actor_id: authResult.user.profile?.id,
            action: action.replace('_all', ''),
            notes: notes || null
          });

        // Log audit trail
        await supabase
          .from('audit_log')
          .insert({
            actor_id: authResult.user.profile?.id,
            action: `batch_${action}`,
            subject_type: 'report',
            subject_id: report.id.toString(),
            meta: {
              report_public_id: reportId,
              batch_action: true,
              notes: notes,
              ban_duration_hours: ban_duration_hours || null
            }
          });

        results.push({ reportId, status: 'success' });

      } catch (error) {
        console.error(`Error processing report ${reportId}:`, error);
        errors.push({ reportId, error: 'Processing failed' });
      }
    }

    return NextResponse.json({
      message: `Batch operation completed. ${results.length} successful, ${errors.length} failed.`,
      results,
      errors
    });

  } catch (error) {
    console.error('Batch reports operation error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// Helper function for batch moderation actions
async function executeBatchModerationAction(
  supabase: any,
  report: any,
  action: string,
  notes: string,
  adminId: number,
  banDurationHours?: number
) {
  switch (action) {
    case 'hide':
      const hideTableName = getTableName(report.subject_type);
      if (hideTableName) {
        await supabase
          .from(hideTableName)
          .update({ 
            is_deleted: true,
            deleted_at: new Date().toISOString()
          })
          .eq('id', parseInt(report.subject_id));
      }
      break;

    case 'delete':
      const deleteTableName = getTableName(report.subject_type);
      if (deleteTableName) {
        await supabase
          .from(deleteTableName)
          .update({ 
            is_deleted: true,
            deleted_at: new Date().toISOString()
          })
          .eq('id', parseInt(report.subject_id));
      }
      break;

    case 'ban':
      const authorId = await getContentAuthorId(supabase, report);
      if (authorId) {
        const expiresAt = banDurationHours 
          ? new Date(Date.now() + banDurationHours * 60 * 60 * 1000).toISOString()
          : null;

        // Create ban record
        await supabase
          .from('ban')
          .insert({
            user_id: authorId,
            reason: notes || 'Content violation (batch action)',
            expires_at: expiresAt
          });

        // Update user status
        await supabase
          .from('profiles')
          .update({
            status: 'banned',
            banned_reason: notes || 'Content violation (batch action)',
            banned_at: new Date().toISOString()
          })
          .eq('id', authorId);
      }
      break;
  }
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
