import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// GET /api/profile/points - 获取用户积分余额和历史记录
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const client = await createServerClient();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const userId = user.profile?.id || user.id;

    // 获取当前积分余额
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const currentPoints = profile.points || 0;

    // 获取积分历史记录（从积分账本表）
    const { data: pointsHistory, error: historyError } = await client
      .from('community_points_ledger')
      .select(`
        id,
        public_id,
        points,
        reason,
        ref,
        created_at
      `)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (historyError) {
      console.error('Error fetching points history:', historyError);
      return NextResponse.json({ error: 'Failed to fetch points history' }, { status: 500 });
    }

    // 获取积分兑换记录
    const { data: redemptionHistory, error: redemptionError } = await client
      .from('point_redemption')
      .select(`
        id,
        public_id,
        points_spent,
        original_price_cents,
        status,
        redemption_date,
        completion_date,
        course:course_id (
          id,
          title,
          thumbnail_url
        )
      `)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('redemption_date', { ascending: false })
      .limit(limit);

    if (redemptionError) {
      console.error('Error fetching redemption history:', redemptionError);
      return NextResponse.json({ error: 'Failed to fetch redemption history' }, { status: 500 });
    }

    // 计算总计获得积分和总计消费积分
    const { data: earnedStats, error: earnedError } = await client
      .from('community_points_ledger')
      .select('points')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('points', 0);

    const { data: spentStats, error: spentError } = await client
      .from('point_redemption')
      .select('points_spent')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .eq('is_deleted', false);

    const totalEarned = earnedStats?.reduce((sum, record) => sum + record.points, 0) || 0;
    const totalSpent = spentStats?.reduce((sum, record) => sum + record.points_spent, 0) || 0;

    return NextResponse.json({
      success: true,
      data: {
        currentPoints,
        totalEarned,
        totalSpent,
        pointsHistory: pointsHistory || [],
        redemptionHistory: redemptionHistory || [],
        pagination: {
          page,
          limit,
          hasMore: (pointsHistory?.length || 0) === limit
        }
      }
    });

  } catch (error) {
    console.error('Error in GET /api/profile/points:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
