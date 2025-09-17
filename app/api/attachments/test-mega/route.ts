import { NextRequest, NextResponse } from 'next/server'
import { testMegaConnection } from '@/lib/mega'

/**
 * GET /api/attachments/test-mega
 * Test MEGA connection from server-side (for debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const result = await testMegaConnection()
    
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
