import { NextRequest, NextResponse } from 'next/server';
import { generateCourseRecommendations } from '@/lib/langChain/tools/course-recommendation-tool';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(request: NextRequest) {
  try {
    const auth = await authorize('student');
    if (auth instanceof NextResponse) return auth;
    const { searchParams } = new URL(request.url);
    const userId = auth.user.profile?.id;
    const maxResults = Math.min(Math.max(parseInt(searchParams.get('maxResults') || '10'), 1), 20);
    const includeEnrolled = searchParams.get('includeEnrolled') === 'true';
    const categoryFilter = searchParams.get('category');
    const levelFilter = searchParams.get('level');
    const freeOnly = searchParams.get('freeOnly') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const recommendations = await generateCourseRecommendations(Number(userId), {
      maxResults,
      includeEnrolled,
      categoryFilter: categoryFilter || undefined,
      levelFilter: levelFilter || undefined,
      freeOnly
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
    console.error('Course recommendations API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
