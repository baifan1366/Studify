import { NextResponse } from 'next/server'
import { authorize } from '@/utils/auth/server-guard'

/**
 * Get MEGA credentials for authenticated users
 * This endpoint provides MEGA credentials from environment variables
 * Only accessible to authenticated users
 */
export async function GET() {
  try {
    // Authorize user (must be authenticated)
    const user = await authorize('tutor')
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get MEGA credentials from environment variables
    const email = process.env.MEGA_EMAIL
    const password = process.env.MEGA_PASSWORD

    if (!email || !password) {
      console.error('MEGA credentials not configured in environment variables')
      return NextResponse.json(
        { error: 'MEGA storage not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      email,
      password
    })
  } catch (error) {
    console.error('Failed to get MEGA credentials:', error)
    return NextResponse.json(
      { error: 'Failed to get storage credentials' },
      { status: 500 }
    )
  }
}
