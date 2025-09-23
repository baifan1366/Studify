import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Request validation schema
const historyRequestSchema = z.object({
  feature_type: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10)
});

// Create Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to get summary from AI result
function getSummaryFromResult(result: any, workflowId: string): string {
  if (!result) return '';
  
  try {
    switch (workflowId) {
      case 'quick_qa':
        return result.answer ? result.answer.substring(0, 100) + '...' : '';
      case 'solve_problem':
        return result.final_answer ? `解答: ${result.final_answer.substring(0, 80)}...` : '';
      case 'smart_notes':
        return result.summary ? result.summary.substring(0, 100) + '...' : '';
      case 'learning_path':
        return result.learning_plan ? `学习计划包含 ${result.learning_plan.length} 个步骤` : '';
      default:
        return typeof result === 'string' ? result.substring(0, 100) + '...' : '';
    }
  } catch (error) {
    return '';
  }
}

// GET endpoint - 获取AI交互历史
export async function GET(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const featureType = searchParams.get('feature_type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate parameters
    const validatedParams = historyRequestSchema.parse({
      feature_type: featureType,
      page,
      limit
    });

    console.log(`📚 AI history request from user ${authResult.payload.sub}, feature: ${featureType || 'all'}, page: ${page}`);

    // Build query
    let query = supabase
      .from('ai_workflow_executions')
      .select(`
        public_id,
        workflow_id,
        input_data,
        final_result,
        metadata,
        status,
        created_at,
        execution_time_ms
      `)
      .eq('user_id', authResult.user.profile?.id || parseInt(authResult.payload.sub))
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Filter by feature type if specified
    if (featureType) {
      query = query.like('workflow_id', `${featureType}%`);
    }

    const { data: history, error } = await query;

    if (error) {
      console.error('❌ Error fetching AI history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch AI history', details: error.message },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const transformedHistory = history?.map(item => {
      const inputData = item.input_data || {};
      const question = inputData.question || 
                     inputData.learning_goal || 
                     inputData.content?.substring(0, 50) ||
                     'AI交互';

      return {
        id: item.public_id,
        type: item.workflow_id,
        question: question.length > 100 ? question.substring(0, 100) + '...' : question,
        summary: getSummaryFromResult(item.final_result, item.workflow_id),
        created_at: item.created_at,
        execution_time_ms: item.execution_time_ms,
        // Don't return full results to save bandwidth
      };
    }) || [];

    return NextResponse.json({
      success: true,
      history: transformedHistory,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        hasMore: transformedHistory.length === validatedParams.limit,
        total: transformedHistory.length
      }
    });

  } catch (error) {
    console.error('❌ AI history API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch AI history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST endpoint - 保存AI交互结果到历史
export async function POST(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const {
      featureType,
      inputData,
      result,
      metadata = {},
      executionTimeMs = 0
    } = body;

    if (!featureType || !inputData || !result) {
      return NextResponse.json(
        { error: 'Missing required fields: featureType, inputData, result' },
        { status: 400 }
      );
    }

    const userId = authResult.user.profile?.id || parseInt(authResult.payload.sub);
    const sessionId = `${featureType}_${Date.now()}_${userId}`;

    console.log(`💾 Saving AI interaction to history: ${featureType} for user ${userId}`);

    // Insert into ai_workflow_executions table
    const { data: savedHistory, error } = await supabase
      .from('ai_workflow_executions')
      .insert({
        session_id: sessionId,
        workflow_id: featureType,
        user_id: userId,
        status: 'completed',
        total_steps: 1,
        completed_steps: 1,
        input_data: inputData,
        final_result: result,
        metadata: {
          ...metadata,
          feature_type: featureType,
          timestamp: new Date().toISOString()
        },
        execution_time_ms: executionTimeMs
      })
      .select('public_id')
      .single();

    if (error) {
      console.error('❌ Error saving AI history:', error);
      return NextResponse.json(
        { error: 'Failed to save AI history', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      historyId: savedHistory.public_id,
      message: 'AI interaction saved to history'
    });

  } catch (error) {
    console.error('❌ Save AI history error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save AI history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
