import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { apiKeyManager } from '@/lib/langChain/api-key-manager';

/**
 * POST /api/admin/api-keys/reset
 * 重置指定API key的状态
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

    const { keyName } = await request.json();

    if (!keyName || typeof keyName !== 'string') {
      return NextResponse.json(
        { error: 'keyName is required and must be a string' },
        { status: 400 }
      );
    }

    // 重置指定key
    apiKeyManager.resetKey(keyName);

    console.log(`🔄 Admin ${profile.email || user.email} reset API key: ${keyName}`);

    return NextResponse.json({
      success: true,
      message: `API key ${keyName} has been reset`,
      resetKey: keyName,
      resetBy: profile.email || user.email,
      resetAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to reset API key:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reset API key' },
      { status: 500 }
    );
  }
}
