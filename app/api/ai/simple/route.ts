import { NextRequest, NextResponse } from 'next/server';
import { aiWorkflowExecutor } from '@/lib/langChain/ai-workflow';
import { authorize } from '@/utils/auth/server-guard';
import { createRateLimitCheck, rateLimitResponse } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user, payload } = authResult;
    const profile = user.profile;
    const userId = profile?.id || parseInt(payload.sub);
    
    // ✅ Rate limiting check
    const checkLimit = createRateLimitCheck('ai');
    const { allowed, remaining, resetTime, limit } = checkLimit(userId.toString());
    
    if (!allowed) {
      return NextResponse.json(
        rateLimitResponse(resetTime, limit),
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      );
    }

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

    console.log(`🤖 Simple AI call for user ${userId}`);

    // ✅ 执行简单AI调用
    // Note: Caching is handled internally by getLLM() with enableCache: true
    const result = await aiWorkflowExecutor.simpleAICall(prompt, {
      model,
      temperature,
      userId,
      includeContext,
      contextQuery: contextQuery || prompt, // 默认使用prompt作为context查询
      contextConfig
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Simple AI call completed in ${processingTime}ms`);

    return NextResponse.json({
      result,
      success: true,
      metadata: {
        model: model || 'default',
        includeContext: includeContext || false,
        cached: false, // TODO: 从 cache 系统获取
        processingTimeMs: processingTime,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString()
      }
    });

  } catch (error) {
    console.error('❌ Simple AI API error:', error);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      error: 'AI processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      metadata: {
        processingTimeMs: processingTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}
