import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { apiKeyManager } from '@/lib/langChain/api-key-manager';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // 仅限管理员访问
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'api-keys':
        return NextResponse.json(await getApiKeyStatus());
      
      case 'workflows':
        return NextResponse.json(await getWorkflowStats());
      
      case 'usage':
        return NextResponse.json(await getUsageStats());
      
      case 'errors':
        return NextResponse.json(await getErrorStats());
      
      default:
        return NextResponse.json(await getSystemOverview());
    }

  } catch (error) {
    console.error('❌ Admin API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 仅限管理员访问
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'reset-api-key':
        return NextResponse.json(await resetApiKey(data.keyName));
      
      case 'cleanup-data':
        return NextResponse.json(await cleanupOldData(data.daysToKeep));
      
      case 'test-workflow':
        return NextResponse.json(await testWorkflow(data.workflowId));
      
      default:
        return NextResponse.json({
          error: 'Unknown action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Admin POST error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 获取API Key状态
async function getApiKeyStatus() {
  try {
    const status = apiKeyManager.getStatus();
    return {
      apiKeys: status.keys,
      usage: status.usage,
      totalKeys: status.keys.length,
      activeKeys: status.keys.filter(k => k.isActive).length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { error: 'Failed to get API key status' };
  }
}

// 获取工作流统计
async function getWorkflowStats() {
  try {
    const supabase = await createAdminClient();
    const { data: executions } = await supabase
      .from('ai_workflow_executions')
      .select('workflow_id, status, created_at, execution_time_ms')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (!executions) return { workflows: [], summary: {} };

    // 按工作流分组统计
    const stats = executions.reduce((acc: any, exec: any) => {
      const workflowId = exec.workflow_id;
      if (!acc[workflowId]) {
        acc[workflowId] = {
          total: 0,
          completed: 0,
          failed: 0,
          running: 0,
          avgTime: 0,
          totalTime: 0
        };
      }
      
      acc[workflowId].total++;
      acc[workflowId][exec.status]++;
      
      if (exec.execution_time_ms) {
        acc[workflowId].totalTime += exec.execution_time_ms;
        acc[workflowId].avgTime = acc[workflowId].totalTime / acc[workflowId].completed;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const summary = {
      totalExecutions: executions.length,
      successRate: executions.length > 0 
        ? (executions.filter((e: any) => e.status === 'completed').length / executions.length * 100).toFixed(2)
        : 0,
      avgExecutionTime: executions.length > 0
        ? Math.round(executions.reduce((sum: number, e: any) => sum + (e.execution_time_ms || 0), 0) / executions.length)
        : 0
    };

    return { workflows: stats, summary };
  } catch (error) {
    return { error: 'Failed to get workflow stats' };
  }
}

// 获取使用统计
async function getUsageStats() {
  try {
    const supabase = await createAdminClient();
    const { data } = await supabase.rpc('get_ai_usage_summary', { days_back: 7 });
    return data?.[0] || {};
  } catch (error) {
    return { error: 'Failed to get usage stats' };
  }
}

// 获取错误统计
async function getErrorStats() {
  try {
    const supabase = await createAdminClient();
    const { data: errors } = await supabase
      .from('api_error_log')
      .select('error_type, key_name, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (!errors) return { errors: [], summary: {} };

    const errorCounts = errors.reduce((acc: any, error: any) => {
      acc[error.error_type] = (acc[error.error_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const keyErrors = errors.reduce((acc: any, error: any) => {
      acc[error.key_name] = (acc[error.key_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      recentErrors: errors.slice(0, 20),
      errorTypes: errorCounts,
      keyErrors,
      totalErrors: errors.length
    };
  } catch (error) {
    return { error: 'Failed to get error stats' };
  }
}

// 获取系统概览
async function getSystemOverview() {
  try {
    const [apiKeys, workflows, usage, errors] = await Promise.all([
      getApiKeyStatus(),
      getWorkflowStats(),
      getUsageStats(),
      getErrorStats()
    ]);

    return {
      systemStatus: 'operational',
      timestamp: new Date().toISOString(),
      overview: {
        apiKeys: (apiKeys as any).totalKeys || 0,
        activeKeys: (apiKeys as any).activeKeys || 0,
        totalWorkflows: Object.keys((workflows as any).workflows || {}).length,
        successRate: (workflows as any).summary?.successRate || 0,
        totalRequests: (usage as any).total_requests || 0,
        errorRate: (errors as any).totalErrors || 0
      },
      components: {
        apiKeyManager: ((apiKeys as any).activeKeys || 0) > 0 ? 'healthy' : 'warning',
        workflowExecutor: ((workflows as any).summary?.successRate || 0) > 80 ? 'healthy' : 'warning',
        contextManager: 'healthy',
        database: 'healthy'
      }
    };
  } catch (error) {
    return {
      systemStatus: 'error',
      error: 'Failed to get system overview'
    };
  }
}

// 重置API Key
async function resetApiKey(keyName: string) {
  try {
    apiKeyManager.resetKey(keyName);
    return {
      success: true,
      message: `API Key ${keyName} has been reset`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to reset API key'
    };
  }
}

// 清理旧数据
async function cleanupOldData(daysToKeep: number = 90) {
  try {
    const supabase = await createAdminClient();
    const { data } = await supabase.rpc('cleanup_ai_workflow_data', { 
      days_to_keep: daysToKeep 
    });
    
    return {
      success: true,
      deletedRecords: data || 0,
      message: `Cleaned up data older than ${daysToKeep} days`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to cleanup old data'
    };
  }
}

// 测试工作流
async function testWorkflow(workflowId: string) {
  try {
    const { aiWorkflowExecutor } = await import('@/lib/langChain/ai-workflow');
    
    const testQuery = "Test query for system monitoring";
    const result = await aiWorkflowExecutor.executeWorkflow(
      workflowId as any,
      {
        query: testQuery,
        userId: 1, // 系统测试用户
        additionalContext: { test: true }
      }
    );

    return {
      success: result.success,
      testResult: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to test workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
