// app/api/admin/cleanup-queue/route.ts

import { NextResponse } from "next/server";
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { qstashClient } from '@/utils/qstash/qstash';

// GET /api/admin/cleanup-queue - Check for orphaned queue records and QStash messages
export async function GET() {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = await createAdminClient();

    // Get all active/processing queue records
    const { data: queueRecords, error: queueError } = await supabase
      .from('video_processing_queue')
      .select('id, status, current_step, created_at, qstash_message_id')
      .in('status', ['pending', 'processing', 'retrying'])
      .order('id', { ascending: false });

    if (queueError) {
      throw new Error(`Failed to fetch queue records: ${queueError.message}`);
    }

    // Get QStash messages (if you have access to list them)
    let qstashMessages = [];
    try {
      // Note: This requires QStash API that supports listing messages
      // You may need to implement your own tracking mechanism
      console.log('QStash message listing not implemented - using database records');
    } catch (error) {
      console.warn('Could not fetch QStash messages:', error);
    }

    const report = {
      active_queue_records: queueRecords?.length || 0,
      queue_records: queueRecords || [],
      qstash_messages: qstashMessages.length,
      orphaned_detection: 'Manual check required - compare queue IDs in logs with database records'
    };

    return NextResponse.json(report);

  } catch (error: any) {
    console.error('Queue cleanup check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check queue status',
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE /api/admin/cleanup-queue - Clean up failed/stuck queue records
export async function DELETE() {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = await createAdminClient();

    // Clean up stuck/failed records older than 1 hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: stuckRecords, error: selectError } = await supabase
      .from('video_processing_queue')
      .select('id, status, current_step, created_at')
      .in('status', ['processing', 'retrying'])
      .lt('created_at', oneHourAgo.toISOString());

    if (selectError) {
      throw new Error(`Failed to select stuck records: ${selectError.message}`);
    }

    if (!stuckRecords || stuckRecords.length === 0) {
      return NextResponse.json({
        message: 'No stuck queue records found',
        cleaned_count: 0
      });
    }

    // Update stuck records to failed status
    const { error: updateError } = await supabase
      .from('video_processing_queue')
      .update({
        status: 'failed',
        error_message: 'Cleaned up - stuck in processing for over 1 hour',
        updated_at: new Date().toISOString()
      })
      .in('id', stuckRecords.map(r => r.id));

    if (updateError) {
      throw new Error(`Failed to clean up stuck records: ${updateError.message}`);
    }

    return NextResponse.json({
      message: 'Stuck queue records cleaned up successfully',
      cleaned_count: stuckRecords.length,
      cleaned_records: stuckRecords
    });

  } catch (error: any) {
    console.error('Queue cleanup error:', error);
    return NextResponse.json({ 
      error: 'Failed to clean up queue records',
      details: error.message 
    }, { status: 500 });
  }
}
