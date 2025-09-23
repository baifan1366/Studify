import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET endpoint - 获取单个AI交互详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing history ID parameter' },
        { status: 400 }
      );
    }

    console.log(`📖 AI history detail request: ${id} from user ${authResult.payload.sub}`);

    // Fetch history item
    const { data: historyItem, error } = await supabase
      .from('ai_workflow_executions')
      .select('*')
      .eq('public_id', id)
      .eq('user_id', authResult.user.profile?.id || parseInt(authResult.payload.sub))
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'AI history item not found' },
          { status: 404 }
        );
      }
      
      console.error('❌ Error fetching AI history detail:', error);
      return NextResponse.json(
        { error: 'Failed to fetch AI history detail', details: error.message },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const transformedItem = {
      id: historyItem.public_id,
      type: historyItem.workflow_id,
      status: historyItem.status,
      inputData: historyItem.input_data,
      result: historyItem.final_result,
      metadata: historyItem.metadata,
      executionTimeMs: historyItem.execution_time_ms,
      createdAt: historyItem.created_at,
      updatedAt: historyItem.updated_at
    };

    return NextResponse.json({
      success: true,
      item: transformedItem
    });

  } catch (error) {
    console.error('❌ AI history detail API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch AI history detail',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint - 删除AI交互历史
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing history ID parameter' },
        { status: 400 }
      );
    }

    console.log(`🗑️ AI history delete request: ${id} from user ${authResult.payload.sub}`);

    // Soft delete the history item
    const { error } = await supabase
      .from('ai_workflow_executions')
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('public_id', id)
      .eq('user_id', authResult.user.profile?.id || parseInt(authResult.payload.sub));

    if (error) {
      console.error('❌ Error deleting AI history:', error);
      return NextResponse.json(
        { error: 'Failed to delete AI history', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'AI history deleted successfully'
    });

  } catch (error) {
    console.error('❌ AI history delete API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete AI history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
