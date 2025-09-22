import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { apiKeyManager } from '@/lib/langChain/api-key-manager';

/**
 * GET /api/admin/api-keys/status
 * 获取所有API keys的状态信息
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const profile = user.profile;

    // 获取API keys状态
    const status = apiKeyManager.getStatus();

    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get API keys status:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get API keys status' },
      { status: 500 }
    );
  }
}
