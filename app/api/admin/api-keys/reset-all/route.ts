import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { apiKeyManager } from '@/lib/langChain/api-key-manager';

/**
 * POST /api/admin/api-keys/reset-all
 * 批量重置API keys状态
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
      resetInactive = true,
      resetErrors = true,
      resetCooldown = false,
      minErrorCount = 5 
    } = await request.json();

    const status = apiKeyManager.getStatus();
    const keysToReset: string[] = [];

    // 筛选需要重置的keys
    status.keys.forEach(key => {
      let shouldReset = false;

      // 重置非活跃的keys
      if (resetInactive && !key.isActive) {
        shouldReset = true;
      }

      // 重置错误过多的keys
      if (resetErrors && key.errorCount >= minErrorCount) {
        shouldReset = true;
      }

      // 重置冷却中的keys
      if (resetCooldown && key.cooldownUntil && new Date(key.cooldownUntil) > new Date()) {
        shouldReset = true;
      }

      if (shouldReset) {
        keysToReset.push(key.name);
        apiKeyManager.resetKey(key.name);
      }
    });

    console.log(`🔄 Admin ${profile.email || user.email} reset ${keysToReset.length} API keys:`, keysToReset);

    return NextResponse.json({
      success: true,
      message: `Reset ${keysToReset.length} API keys`,
      resetKeys: keysToReset,
      resetBy: profile.email || user.email,
      resetAt: new Date().toISOString(),
      criteria: {
        resetInactive,
        resetErrors,
        resetCooldown,
        minErrorCount
      }
    });

  } catch (error) {
    console.error('❌ Failed to reset API keys:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reset API keys' },
      { status: 500 }
    );
  }
}
