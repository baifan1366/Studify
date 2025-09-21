import { NextRequest, NextResponse } from 'next/server';
import { aiWorkflowExecutor, WorkflowType } from '@/lib/langChain/ai-workflow';
import { authorize } from '@/utils/auth/server-guard';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份 (允许所有已认证用户)
    const authResult = await authorize('student'); // 基础权限验证
    if (authResult instanceof NextResponse) {
      return authResult; // 返回错误响应
    }

    const { user, payload } = authResult;
    const profile = user.profile;
    const body = await request.json();
    
    const { 
      workflowId, 
      query, 
      additionalContext,
      sessionId 
    } = body;

    // 验证必需参数
    if (!workflowId || !query) {
      return NextResponse.json({
        error: 'Missing required parameters: workflowId and query'
      }, { status: 400 });
    }

    // 验证工作流ID
    const availableWorkflows = aiWorkflowExecutor.getAvailableWorkflows();
    const workflowExists = availableWorkflows.some(w => w.id === workflowId);
    
    if (!workflowExists) {
      return NextResponse.json({
        error: `Unknown workflow: ${workflowId}`,
        availableWorkflows: availableWorkflows.map(w => ({ id: w.id, name: w.name }))
      }, { status: 400 });
    }

    console.log(`🚀 Starting AI workflow: ${workflowId} for user ${profile?.id || payload.sub}`);

    // 执行工作流
    const result = await aiWorkflowExecutor.executeWorkflow(
      workflowId as WorkflowType,
      {
        query,
        userId: profile?.id || parseInt(payload.sub),
        additionalContext
      },
      sessionId
    );

    // 记录使用情况
    await recordWorkflowUsage(profile?.id || parseInt(payload.sub), workflowId, result.success);

    return NextResponse.json({
      ...result,
      message: result.success 
        ? `Workflow ${workflowId} completed successfully`
        : `Workflow ${workflowId} failed: ${result.error}`
    });

  } catch (error) {
    console.error('❌ Workflow API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      // 获取特定工作流状态
      const status = await aiWorkflowExecutor.getWorkflowStatus(sessionId);
      return NextResponse.json(status);
    } else {
      // 获取可用工作流列表
      const workflows = aiWorkflowExecutor.getAvailableWorkflows();
      return NextResponse.json({
        workflows,
        totalCount: workflows.length
      });
    }

  } catch (error) {
    console.error('❌ Workflow status API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 记录工作流使用情况
async function recordWorkflowUsage(userId: number, workflowId: string, success: boolean) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from('ai_workflow_usage').insert({
      user_id: userId,
      workflow_id: workflowId,
      success,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to record workflow usage:', error);
  }
}
