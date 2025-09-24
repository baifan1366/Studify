import { NextRequest, NextResponse } from 'next/server';
import { generateCommunityGroupRecommendations } from '@/lib/langChain/tools/course-recommendation-tool';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const maxResults = parseInt(searchParams.get('maxResults') || '10');
    const excludeJoinedGroups = searchParams.get('excludeJoinedGroups') !== 'false';
    const visibilityFilter = searchParams.get('visibility') as 'public' | 'private' | undefined;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const recommendations = await generateCommunityGroupRecommendations(parseInt(userId), {
      maxResults,
      excludeJoinedGroups,
      visibilityFilter: visibilityFilter || 'public'
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
    console.error('Group recommendations API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
