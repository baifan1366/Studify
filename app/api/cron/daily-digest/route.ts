import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { digestService } from '@/lib/notifications/digest-service';

/**
 * 每日学习日报定时任务 API
 * 使用 Upstash QStash Schedule 调用
 * 
 * QStash Schedule 配置：
 * - URL: https://your-domain.com/api/cron/daily-digest
 * - Schedule: 0 20 * * * (每天晚上 20:00)
 * - Method: POST
 */

async function handler(request: NextRequest) {
  try {
    console.log('🕐 Starting daily digest cron job...');
    
    const result = await digestService.sendDailyDigestToAll();
    
    console.log(`✅ Daily digest sent: ${result.success} success, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      message: 'Daily digest sent successfully',
      stats: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in daily digest cron:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send daily digest',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// QStash 签名验证
export const POST = verifySignatureAppRouter(handler);
