// app/api/admin/reports/[reportId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/reports/[reportId] - Get specific report details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { reportId } = await params;
    const supabase = await createAdminClient();

    // Get report details
    const { data: report, error } = await supabase
      .from('report')
      .select(`
        *,
        profiles!report_reporter_id_fkey(
          id,
          display_name,
          email,
          avatar_url
        )
      `)
      .eq('public_id', reportId)
      .eq('is_deleted', false)
      .single();

    if (error || !report) {
      return NextResponse.json({ message: 'Report not found' }, { status: 404 });
    }

    // Get related actions
    const { data: actions } = await supabase
      .from('action')
      .select(`
        *,
        profiles!action_actor_id_fkey(
          display_name,
          email
        )
      `)
      .eq('report_id', report.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      report,
      actions: actions || []
    });

  } catch (error) {
    console.error('Admin report GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/reports/[reportId] - Update report status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { reportId } = await params;
    const { status, notes } = await request.json();

    if (!status || !['open', 'reviewing', 'resolved', 'rejected'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Update report status
    const { data: updatedReport, error: updateError } = await supabase
      .from('report')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('public_id', reportId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating report:', updateError);
      return NextResponse.json({ message: 'Failed to update report' }, { status: 500 });
    }

    // Log the action
    await supabase
      .from('audit_log')
      .insert({
        actor_id: authResult.user.profile?.id,
        action: 'update_report_status',
        subject_type: 'report',
        subject_id: updatedReport.id.toString(),
        meta: {
          previous_status: status,
          new_status: status,
          notes: notes || null,
          report_public_id: reportId
        }
      });

    return NextResponse.json({
      message: 'Report updated successfully',
      report: updatedReport
    });

  } catch (error) {
    console.error('Admin report PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
