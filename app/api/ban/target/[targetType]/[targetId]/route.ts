import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { targetType: string; targetId: string } }
) {
  try {
    // Authentication check with student role requirement
    await authorize('student');
    
    const targetType = params.targetType;
    const targetId = parseInt(params.targetId);
    
    // Validate parameters
    if (isNaN(targetId)) {
      return NextResponse.json(
        { error: 'Invalid target ID' },
        { status: 400 }
      );
    }

    // Validate target type
    const validTargetTypes = ['post', 'chat', 'comment', 'course', 'user', 'other'];
    if (!validTargetTypes.includes(targetType)) {
      return NextResponse.json(
        { error: 'Invalid target type' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createAdminClient();

    // Get all bans for the target (active bans only)
    const { data: bans, error } = await supabase
      .from('ban')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('status', 'approved')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[BanAPI] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch ban information' },
        { status: 500 }
      );
    }

    // Filter active bans (not expired)
    const activeBans = bans?.filter((ban: any) => {
      if (!ban.expires_at) return true; // Permanent ban
      return new Date(ban.expires_at) > new Date(); // Not expired
    }) || [];

    return NextResponse.json(activeBans);
  } catch (error: any) {
    console.error('[BanAPI] Error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
