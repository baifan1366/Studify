import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { getLLM } from '@/lib/langChain/client';
import { HumanMessage } from '@langchain/core/messages';

/**
 * POST /api/admin/api-keys/test
 * 测试API keys的工作状态
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const profile = user.profile;

    const { 
      strategy = 'round_robin',
      testMessage = 'Hello, this is a test message. Please respond with "Test successful!"',
      testCount = 3 
    } = await request.json();

    console.log(`🧪 Admin ${profile.email || user.email} initiated API key test`);

    const results: Array<{
      testNumber: number;
      keyName?: string;
      success: boolean;
      response?: string;
      error?: string;
      duration: number;
      timestamp: string;
    }> = [];

    // 执行多次测试
    for (let i = 1; i <= Math.min(testCount, 10); i++) {
      const startTime = Date.now();
      let testResult: any = {
        testNumber: i,
        success: false,
        duration: 0,
        timestamp: new Date().toISOString()
      };

      try {
        // 创建LLM实例
        const llm = await getLLM({
          keySelectionStrategy: strategy as any,
          temperature: 0.1,
          maxTokens: 100,
          timeout: 15000, // 15秒超时
        });

        // 获取key名称 (如果可用)
        testResult.keyName = (llm as any).__keyName;

        // 执行测试调用
        const response = await llm.invoke([
          new HumanMessage(testMessage)
        ]);

        testResult.success = true;
        testResult.response = response.content.toString().substring(0, 200); // 限制长度
        testResult.duration = Date.now() - startTime;

      } catch (error) {
        testResult.success = false;
        testResult.error = error instanceof Error ? error.message : 'Unknown error';
        testResult.duration = Date.now() - startTime;
      }

      results.push(testResult);

      // 测试间隔 (避免rate limit)
      if (i < testCount) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 计算统计数据
    const successfulTests = results.filter(r => r.success).length;
    const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const keysUsed = [...new Set(results.map(r => r.keyName).filter(Boolean))];

    const summary = {
      totalTests: testCount,
      successfulTests,
      failedTests: testCount - successfulTests,
      successRate: ((successfulTests / testCount) * 100).toFixed(1) + '%',
      averageDuration: Math.round(averageDuration),
      keysUsed: keysUsed.length,
      uniqueKeysUsed: keysUsed,
    };

    console.log(`✅ API key test completed: ${successfulTests}/${testCount} successful`);

    return NextResponse.json({
      success: true,
      summary,
      results,
      testConfig: {
        strategy,
        testMessage: testMessage.substring(0, 100) + '...',
        testCount
      },
      testedBy: profile.email || user.email,
      completedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ API key test failed:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'API key test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
