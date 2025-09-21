import { NextRequest, NextResponse } from 'next/server';
import { contextManager } from '@/lib/langChain/context-manager';
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
      query,
      contentTypes,
      maxTokens,
      maxChunks,
      minSimilarity,
      includeMetadata
    } = body;

    // 验证必需参数
    if (!query) {
      return NextResponse.json({
        error: 'Missing required parameter: query'
      }, { status: 400 });
    }

    console.log(`🔍 Getting context for query: ${query.substring(0, 100)}...`);

    // 构建上下文配置
    const contextConfig = {
      maxTokens: maxTokens || 4000,
      maxChunks: maxChunks || 10,
      minSimilarity: minSimilarity || 0.7,
      includeMetadata: includeMetadata !== false // 默认包含元数据
    };

    // 获取相关上下文
    const result = await contextManager.getRelevantContext(
      query,
      contextConfig,
      profile?.id || parseInt(payload.sub),
      contentTypes
    );

    return NextResponse.json({
      ...result,
      success: true,
      query,
      userId: profile?.id || parseInt(payload.sub)
    });

  } catch (error) {
    console.error('❌ Context API error:', error);
    return NextResponse.json({
      error: 'Context retrieval failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('contentType');
    const contentId = searchParams.get('contentId');

    if (!contentType || !contentId) {
      return NextResponse.json({
        error: 'Missing required parameters: contentType and contentId'
      }, { status: 400 });
    }

    console.log(`🔗 Getting related context for ${contentType}:${contentId}`);

    // 获取内容相关上下文
    const context = await contextManager.getContentRelatedContext(
      contentType,
      parseInt(contentId),
      {
        maxTokens: 3000,
        maxChunks: 8
      }
    );

    return NextResponse.json({
      context,
      contentType,
      contentId: parseInt(contentId),
      success: true
    });

  } catch (error) {
    console.error('❌ Related context API error:', error);
    return NextResponse.json({
      error: 'Related context retrieval failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
