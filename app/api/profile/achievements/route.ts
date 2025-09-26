import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// GET /api/profile/achievements - 获取用户成就数据
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { payload } = authResult;
    const client = await createServerClient();
    const url = new URL(request.url);
    const category = url.searchParams.get('category'); // 成就分类筛选

    // 获取用户的profile ID
    const { data: userProfile, error: profileLookupError } = await client
      .from('profiles')
      .select('id')
      .eq('user_id', payload.sub)
      .single();

    if (profileLookupError || !userProfile) {
      console.error('Profile lookup error:', profileLookupError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userId = userProfile.id;

    // 获取所有成就和用户的解锁状态
    let query = client
      .from('community_achievement')
      .select(`
        id,
        public_id,
        code,
        name,
        description,
        rule,
        created_at,
        user_achievement:community_user_achievement!achievement_id (
          unlocked,
          current_value,
          unlocked_at
        )
      `)
      .eq('is_deleted', false);

    if (category) {
      // 如果有分类筛选，可以基于code前缀或rule中的类型
      query = query.ilike('code', `${category}%`);
    }

    const { data: achievementsData, error: achievementsError } = await query
      .order('created_at', { ascending: true });

    if (achievementsError) {
      console.error('Error fetching achievements:', achievementsError);
      return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
    }

    // 获取用户具体的成就进度
    const { data: userAchievements, error: userAchievementsError } = await client
      .from('community_user_achievement')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (userAchievementsError) {
      console.error('Error fetching user achievements:', userAchievementsError);
    }

    // 创建用户成就映射
    const userAchievementMap = new Map();
    userAchievements?.forEach(ua => {
      userAchievementMap.set(ua.achievement_id, ua);
    });

    // 处理成就数据
    const processedAchievements = achievementsData?.map(achievement => {
      const userProgress = userAchievementMap.get(achievement.id);
      const rule = achievement.rule || {};
      const targetValue = rule.target || 1;
      const pointsReward = rule.points || 0;
      
      return {
        id: achievement.id,
        public_id: achievement.public_id,
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        category: getCategoryFromCode(achievement.code),
        targetValue,
        pointsReward,
        currentValue: userProgress?.current_value || 0,
        isUnlocked: userProgress?.unlocked || false,
        unlockedAt: userProgress?.unlocked_at,
        progress: Math.min(((userProgress?.current_value || 0) / targetValue) * 100, 100),
        rule: achievement.rule
      };
    }) || [];

    // 按分类分组
    const categories = groupAchievementsByCategory(processedAchievements);

    // 计算统计信息
    const stats = {
      total: processedAchievements.length,
      unlocked: processedAchievements.filter(a => a.isUnlocked).length,
      inProgress: processedAchievements.filter(a => !a.isUnlocked && a.currentValue > 0).length,
      totalPointsEarned: processedAchievements
        .filter(a => a.isUnlocked)
        .reduce((sum, a) => sum + a.pointsReward, 0),
      recentUnlocks: processedAchievements
        .filter(a => a.isUnlocked && a.unlockedAt)
        .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
        .slice(0, 5)
    };

    return NextResponse.json({
      success: true,
      data: {
        achievements: processedAchievements,
        categories,
        stats
      }
    });

  } catch (error) {
    console.error('Error in GET /api/profile/achievements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 辅助函数：从代码推断分类
function getCategoryFromCode(code: string): string {
  if (code.startsWith('study_') || code.includes('course') || code.includes('lesson')) {
    return 'learning';
  }
  if (code.includes('streak') || code.includes('time')) {
    return 'consistency';
  }
  if (code.includes('post') || code.includes('comment') || code.includes('social')) {
    return 'social';
  }
  if (code.includes('quiz') || code.includes('test') || code.includes('exam')) {
    return 'mastery';
  }
  if (code.includes('point') || code.includes('redeem')) {
    return 'rewards';
  }
  return 'general';
}

// 辅助函数：按分类分组成就
function groupAchievementsByCategory(achievements: any[]) {
  const categories = {
    learning: { name: '学习里程碑', achievements: [], icon: '📚' },
    consistency: { name: '坚持不懈', achievements: [], icon: '🔥' },
    social: { name: '社交达人', achievements: [], icon: '👥' },
    mastery: { name: '技能掌握', achievements: [], icon: '🎯' },
    rewards: { name: '积分专家', achievements: [], icon: '💎' },
    general: { name: '综合成就', achievements: [], icon: '⭐' }
  };

  achievements.forEach(achievement => {
    const category = achievement.category;
    if (categories[category as keyof typeof categories]) {
      (categories[category as keyof typeof categories].achievements as any[]).push(achievement);
    }
  });

  return categories;
}
