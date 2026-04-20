import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Debug API: Test recommendation keyword matching
 * 
 * This endpoint shows:
 * - User's AI activity keywords
 * - Available posts with their keywords
 * - Matching scores between user keywords and posts
 */
export async function GET(request: NextRequest) {
  try {
    // Authorize using app JWT and role guard
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const supabase = await createServerClient();

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authResult.sub)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const userId = profile.id;

    // 1. Get user's AI keywords (simplified extraction)
    const { data: qaMessages } = await supabase
      .from('ai_quick_qa_messages')
      .select(`
        content,
        ai_quick_qa_sessions!inner(user_id)
      `)
      .eq('ai_quick_qa_sessions.user_id', userId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(20);

    const userKeywords = new Set<string>();
    qaMessages?.forEach((message: any) => {
      if (message.content) {
        const words = message.content
          .toLowerCase()
          .split(/\s+/)
          .filter((word: string) => word.length > 3);
        words.forEach((word: string) => userKeywords.add(word));
      }
    });

    const userKeywordArray = Array.from(userKeywords).slice(0, 30);

    // 2. Get recent posts
    const { data: posts } = await supabase
      .from('community_post')
      .select(`
        id,
        public_id,
        title,
        body,
        author_id,
        group_id,
        created_at,
        community_group(id, name)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20);

    // 3. Calculate keyword matches for each post
    const postsWithMatches = posts?.map((post: any) => {
      const postText = `${post.title || ''} ${post.body || ''}`.toLowerCase();
      const postWords = postText.split(/\s+/).filter((word: string) => word.length > 3);
      const postKeywords = new Set(postWords);

      // Find matching keywords
      const matchingKeywords = userKeywordArray.filter(keyword => 
        postKeywords.has(keyword) || postText.includes(keyword)
      );

      // Calculate match score
      const matchScore = matchingKeywords.length / Math.max(userKeywordArray.length, 1);

      return {
        id: post.id,
        public_id: post.public_id,
        title: post.title,
        body_preview: post.body?.substring(0, 150) + '...',
        group: post.community_group?.name || 'No group',
        created_at: post.created_at,
        matching_keywords: matchingKeywords.slice(0, 10),
        match_count: matchingKeywords.length,
        match_score: (matchScore * 100).toFixed(1) + '%',
        has_embedding: false // Will check separately
      };
    }) || [];

    // 4. Check which posts have embeddings
    if (posts && posts.length > 0) {
      const postIds = posts.map((p: any) => p.id);
      const { data: embeddings } = await supabase
        .from('embeddings')
        .select('content_id')
        .eq('content_type', 'post')
        .in('content_id', postIds)
        .eq('has_e5_embedding', true)
        .eq('status', 'completed');

      const embeddingIds = new Set(embeddings?.map((e: any) => e.content_id) || []);
      postsWithMatches.forEach((post: any) => {
        post.has_embedding = embeddingIds.has(post.id);
      });
    }

    // Sort by match score
    postsWithMatches.sort((a: any, b: any) => b.match_count - a.match_count);

    return NextResponse.json({
      success: true,
      userId,
      userKeywords: {
        total: userKeywordArray.length,
        keywords: userKeywordArray.slice(0, 20),
        source: 'AI Q&A messages'
      },
      posts: {
        total: postsWithMatches.length,
        with_embeddings: postsWithMatches.filter((p: any) => p.has_embedding).length,
        with_matches: postsWithMatches.filter((p: any) => p.match_count > 0).length,
        items: postsWithMatches
      },
      recommendations: {
        top_matches: postsWithMatches.filter((p: any) => p.match_count > 0).slice(0, 5),
        posts_without_embeddings: postsWithMatches.filter((p: any) => !p.has_embedding).length
      },
      next_steps: {
        create_test_posts: postsWithMatches.filter((p: any) => p.match_count > 0).length === 0 
          ? 'No matching posts found. Consider creating test posts with keywords: ' + userKeywordArray.slice(0, 5).join(', ')
          : null,
        generate_embeddings: postsWithMatches.filter((p: any) => !p.has_embedding).length > 0
          ? `${postsWithMatches.filter((p: any) => !p.has_embedding).length} posts need embeddings. Run: POST /api/embeddings/backfill?content_type=post`
          : null,
        test_recommendations: 'GET /api/community/recommendations?limit=10'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Test Recommendations] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to test recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
