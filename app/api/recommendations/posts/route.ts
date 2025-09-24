import { NextRequest, NextResponse } from 'next/server';
import { generateCommunityPostRecommendations } from '@/lib/langChain/tools/course-recommendation-tool';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const maxResults = parseInt(searchParams.get('maxResults') || '10');
    const excludeOwnPosts = searchParams.get('excludeOwnPosts') !== 'false';
    const groupFilter = searchParams.get('groupId');
    const includePrivateGroups = searchParams.get('includePrivateGroups') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const recommendations = await generateCommunityPostRecommendations(parseInt(userId), {
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
