import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 检查环境变量
    const secretKey = process.env.LIVEBLOCKS_SECRET_KEY;
    const publicKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;

    const checks = {
      environment: {
        hasSecretKey: !!secretKey,
        hasPublicKey: !!publicKey,
        secretKeyFormat: secretKey ? secretKey.startsWith('sk_') : false,
        publicKeyFormat: publicKey ? publicKey.startsWith('pk_') : false,
        secretKeyPreview: secretKey ? secretKey.substring(0, 10) + '...' : 'Not set',
        publicKeyPreview: publicKey ? publicKey.substring(0, 10) + '...' : 'Not set',
      },
      files: {
        authRouteExists: true, // 如果这个能执行说明API routes能工作
      },
      liveblocks: {
        nodePackageAvailable: false,
        clientPackageAvailable: false,
      }
    };

    // 测试 @liveblocks/node 包
    try {
      const { Liveblocks } = await import('@liveblocks/node');
      checks.liveblocks.nodePackageAvailable = true;
    } catch (error) {
      // Package not available
    }

    return NextResponse.json({
      status: 'ok',
      checks,
      recommendations: [
        !checks.environment.hasSecretKey && '❌ 请设置 LIVEBLOCKS_SECRET_KEY',
        !checks.environment.hasPublicKey && '❌ 请设置 NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY', 
        !checks.environment.secretKeyFormat && checks.environment.hasSecretKey && '❌ Secret Key 应该以 sk_ 开头',
        !checks.environment.publicKeyFormat && checks.environment.hasPublicKey && '❌ Public Key 应该以 pk_ 开头',
        !checks.liveblocks.nodePackageAvailable && '❌ 请安装 @liveblocks/node 包',
      ].filter(Boolean)
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
