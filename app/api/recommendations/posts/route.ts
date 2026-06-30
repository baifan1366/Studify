import { NextRequest, NextResponse } from 'next/server';
import { generateCommunityPostRecommendations } from '@/lib/langChain/tools/course-recommendation-tool';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(request: NextRequest) {
  try {
    const auth = await authorize('student');
    if (auth instanceof NextResponse) return auth;
    const { searchParams } = new URL(request.url);
    const userId = auth.user.profile?.id;
    const maxResults = Math.min(Math.max(parseInt(searchParams.get('maxResults') || '10'), 1), 20);
    const excludeOwnPosts = searchParams.get('excludeOwnPosts') !== 'false';
    const groupFilter = searchParams.get('groupId');
    const includePrivateGroups = searchParams.get('includePrivateGroups') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const recommendations = await generateCommunityPostRecommendations(Number(userId), {
      maxResults,
      excludeOwnPosts,
      groupFilter: groupFilter ? parseInt(groupFilter) : undefined,
      includePrivateGroups
    });

    if (!recommendations.success) {
      return NextResponse.json(
        { error: recommendations.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recommendations: recommendations.recommendations,
      totalRecommendations: recommendations.totalRecommendations,
      userProfile: recommendations.userProfile
    });

  } catch (error) {
    console.error('Post recommendations API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
