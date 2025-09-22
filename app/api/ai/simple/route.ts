import { NextRequest, NextResponse } from 'next/server';
import { aiWorkflowExecutor } from '@/lib/langChain/ai-workflow';
import { authorize } from '@/utils/auth/server-guard';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user, payload } = authResult;
    const profile = user.profile;
    const body = await request.json();
    
    const { 
      prompt, 
      model, 
      temperature,
      includeContext,
      contextQuery,
      contextConfig
    } = body;

    // 验证必需参数
    if (!prompt) {
      return NextResponse.json({
        error: 'Missing required parameter: prompt'
      }, { status: 400 });
    }

    console.log(`🤖 Simple AI call for user ${profile?.id || payload.sub}`);

    // 执行简单AI调用
    const result = await aiWorkflowExecutor.simpleAICall(prompt, {
      model,
      temperature,
      userId: profile?.id || parseInt(payload.sub),
      includeContext,
      contextQuery: contextQuery || prompt, // 默认使用prompt作为context查询
      contextConfig
    });

    return NextResponse.json({
      result,
      success: true,
      metadata: {
        model: model || 'default',
        includeContext: includeContext || false,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Simple AI API error:', error);
    return NextResponse.json({
      error: 'AI processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
