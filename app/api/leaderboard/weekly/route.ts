import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // 计算本周的开始时间（周一 00:00:00）
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // 获取本周的积分记录，按用户分组并求和
    const { data: weeklyPoints, error: pointsError } = await supabase
      .rpc('get_weekly_leaderboard', {
        week_start: weekStart.toISOString(),
        result_limit: limit
      });

    if (pointsError) {
      console.error('Error fetching weekly leaderboard:', pointsError);
      
      // 如果RPC函数不存在，使用备用查询
      const { data: pointsData, error: fallbackError } = await supabase
        .from('community_points_ledger')
        .select(`
          user_id,
          points,
          profiles!inner(
            id,
            public_id,
            display_name,
            avatar_url
          )
        `)
        .gte('created_at', weekStart.toISOString())
        .gt('points', 0)
        .eq('is_deleted', false);

      if (fallbackError) {
        throw fallbackError;
      }

      // 手动聚合数据
      const userPointsMap = new Map<number, {
        userId: number;
        publicId: string;
        displayName: string;
        avatarUrl: string;
        totalPoints: number;
      }>();

      pointsData?.forEach((record: any) => {
        const userId = record.user_id;
        const profile = record.profiles;
        
        if (!userPointsMap.has(userId)) {
          userPointsMap.set(userId, {
            userId,
            publicId: profile.public_id,
            displayName: profile.display_name || 'Anonymous',
            avatarUrl: profile.avatar_url || '/api/placeholder/32/32',
            totalPoints: 0
          });
        }
        
        const userEntry = userPointsMap.get(userId)!;
        userEntry.totalPoints += record.points;
      });

      // 转换为数组并排序
      const sortedUsers = Array.from(userPointsMap.values())
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, limit);

      // 添加排名和徽章
      const leaderboardUsers = sortedUsers.map((userEntry, index) => ({
        rank: index + 1,
        userId: userEntry.userId,
        publicId: userEntry.publicId,
        displayName: userEntry.displayName,
        avatarUrl: userEntry.avatarUrl,
        points: userEntry.totalPoints,
        isCurrentUser: String(userEntry.userId) === String(user.id),
        badge: index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''
      }));

      // 查找当前用户的排名
      const currentUserEntry = Array.from(userPointsMap.values())
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .findIndex(u => String(u.userId) === String(user.id));

      const currentUserRank = currentUserEntry >= 0 ? {
        rank: currentUserEntry + 1,
        points: Array.from(userPointsMap.values())[currentUserEntry]?.totalPoints || 0,
        percentile: Math.round((1 - currentUserEntry / userPointsMap.size) * 100)
      } : undefined;

      return NextResponse.json({
        success: true,
        data: {
          period: 'weekly',
          users: leaderboardUsers,
          currentUserRank,
          totalParticipants: userPointsMap.size,
          updatedAt: new Date().toISOString()
        }
      });
    }

    // 使用RPC函数的结果
    const leaderboardUsers = weeklyPoints.map((entry: any, index: number) => ({
      rank: index + 1,
      userId: entry.user_id,
      publicId: entry.public_id,
      displayName: entry.display_name || 'Anonymous',
      avatarUrl: entry.avatar_url || '/api/placeholder/32/32',
      points: entry.total_points,
      isCurrentUser: String(entry.user_id) === String(user.id),
      badge: index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''
    }));

    // 查找当前用户的排名
    const currentUserIndex = weeklyPoints.findIndex((entry: any) => String(entry.user_id) === String(user.id));
    const currentUserRank = currentUserIndex >= 0 ? {
      rank: currentUserIndex + 1,
      points: weeklyPoints[currentUserIndex].total_points,
      percentile: Math.round((1 - currentUserIndex / weeklyPoints.length) * 100)
    } : undefined;

    return NextResponse.json({
      success: true,
      data: {
        period: 'weekly',
        users: leaderboardUsers,
        currentUserRank,
        totalParticipants: weeklyPoints.length,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in weekly leaderboard API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch weekly leaderboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
