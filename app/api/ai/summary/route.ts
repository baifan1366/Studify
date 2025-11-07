import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@/utils/supabase/server';
import { aiSummarySystem, Post, Comment } from '@/lib/langChain/ai-summary';
import { apiKeyManager } from '@/lib/langChain/api-key-manager';
import { contextManager } from '@/lib/langChain/context-manager';
import { z } from 'zod';

// Request validation schema
const summaryRequestSchema = z.object({
  mode: z.enum(['search', 'post']),
  locale: z.enum(['en', 'zh']).default('en'),
  includeCitations: z.boolean().default(true),
  stream: z.boolean().default(false),
  // Search mode specific
  query: z.string().optional(),
  resultIds: z.array(z.union([z.string(), z.number()])).optional(),
  maxItems: z.number().min(1).max(20).default(10),
  // Post mode specific
  postId: z.number().optional(),
  postSlug: z.string().optional(),
  includeComments: z.boolean().default(false),
  includeRelatedContext: z.boolean().default(true)
});

// Helper function to save AI interaction to history
async function saveToHistory({
  featureType,
  inputData,
  result,
  executionTimeMs = 0,
  metadata = {}
}: {
  featureType: string;
  inputData: any;
  result: any;
  executionTimeMs?: number;
  metadata?: any;
}) {
  try {
    await fetch('/api/ai/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featureType,
        inputData,
        result,
        executionTimeMs,
        metadata
      })
    });
  } catch (error) {
    console.warn('Failed to save AI interaction to history:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;
    const userId = parseInt(authResult.payload.sub);

    // Parse and validate request
    const body = await request.json();
    const validatedData = summaryRequestSchema.parse(body);

    const userLanguage = user.profile?.language;
    const requestLocale = validatedData.locale;

    // Determine final locale: prioritize user profile language
    let locale: 'en' | 'zh' = 'en';
    if (userLanguage) {
      // User has a language preference in their profile
      locale = (userLanguage === 'zh' || userLanguage === 'zh-CN' || userLanguage.startsWith('zh')) ? 'zh' : 'en';
    } else if (requestLocale) {
      // No user preference, use request locale
      locale = requestLocale;
    }

    console.log(`📊 AI Summary request from user ${userId}: ${validatedData.mode} mode (locale: ${locale}, user language: ${userLanguage || 'not set'}, request locale: ${requestLocale || 'not provided'})`);

    const {
      mode,
      includeCitations,
      stream,
      query,
      resultIds,
      maxItems,
      postId,
      postSlug,
      includeComments,
      includeRelatedContext
    } = validatedData;

    const supabase = await createClient();
    const startTime = Date.now();
    let result;

    // Preflight: ensure at least one OpenRouter key is available
    try {
      const { name } = await apiKeyManager.getAvailableKey();
      console.log(`🔑 AI Summary will use OpenRouter key: ${name}`);
    } catch (keyErr) {
      console.error('❌ No OpenRouter API key available for AI Summary:', keyErr);
      return NextResponse.json(
        {
          error: 'AI unavailable',
          message: 'No OpenRouter API key configured. Set OPEN_ROUTER_KEY_1 or OPEN_ROUTER_KEYS and restart the server.'
        },
        { status: 503 }
      );
    }

    if (mode === 'search') {
      // Search mode: summarize multiple posts
      if (!query) {
        return NextResponse.json(
          { error: 'Query is required for search mode' },
          { status: 400 }
        );
      }

      let posts: Post[];

      if (resultIds && resultIds.length > 0) {
        // Determine whether resultIds are UUIDs (public_id) or numeric ids
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const areUUIDs = resultIds.every((id) => typeof id === 'string' && uuidRegex.test(id));

        // Fetch specific posts by IDs
        const { data: fetchedPosts, error } = await supabase
          .from('community_post')
          .select(`
            id,
            public_id,
            title,
            body,
            slug,
            created_at,
            is_deleted,
            author:profiles!inner(display_name),
            group:community_group!inner(slug)
          `)
          .in(areUUIDs ? 'public_id' : 'id', resultIds as any)
          .eq('is_deleted', false)
          .limit(maxItems);

        if (error) {
          throw new Error(`Failed to fetch posts: ${error.message}`);
        }

        // Transform the data to match our Post interface
        posts = (fetchedPosts || []).map((post: any) => ({
          id: post.id,
          public_id: post.public_id,
          title: post.title,
          content: post.body,
          slug: post.slug,
          created_at: post.created_at,
          author: Array.isArray(post.author) ? post.author[0] : post.author,
          group: Array.isArray(post.group) ? post.group[0] : post.group
        }));
      } else {
        // Search for posts using the query
        const { data: searchedPosts, error } = await supabase
          .from('community_post')
          .select(`
            id,
            public_id,
            title,
            body,
            slug,
            created_at,
            is_deleted,
            author:profiles!inner(display_name),
            group:community_group!inner(slug)
          `)
          .or(`title.ilike.%${query}%,body.ilike.%${query}%`)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(maxItems);

        if (error) {
          throw new Error(`Failed to search posts: ${error.message}`);
        }

        // Transform the data to match our Post interface
        posts = (searchedPosts || []).map((post: any) => ({
          id: post.id,
          public_id: post.public_id,
          title: post.title,
          content: post.body,
          slug: post.slug,
          created_at: post.created_at,
          author: Array.isArray(post.author) ? post.author[0] : post.author,
          group: Array.isArray(post.group) ? post.group[0] : post.group
        }));
      }

      if (posts.length === 0) {
        return NextResponse.json({
          success: true,
          bullets: [],
          themes: [],
          citations: [],
          meta: {
            mode: 'search',
            itemCount: 0,
            processingTimeMs: Date.now() - startTime,
            model: process.env.OPEN_ROUTER_MODEL || 'z-ai/glm-4.5-air:free',
            locale
          }
        });
      }

      // Generate summary
      result = await aiSummarySystem.summarizeSearch(posts, query, {
        locale,
        includeCitations,
        userId
      });

      // Save to history
      await saveToHistory({
        featureType: 'community_summary_search',
        inputData: {
          query,
          postCount: posts.length,
          hasResultIds: !!resultIds,
          locale
        },
        result,
        executionTimeMs: result.meta.processingTimeMs,
        metadata: { locale, mode: 'search' }
      });

    } else {
      // Post mode: summarize single post
      if (!postId && !postSlug) {
        return NextResponse.json(
          { error: 'Either postId or postSlug is required for post mode' },
          { status: 400 }
        );
      }

      // Fetch the post
      const postSelectQuery = `
        id,
        public_id,
        title,
        body,
        slug,
        created_at,
        is_deleted,
        author:profiles!inner(display_name),
        group:community_group!inner(slug)
      `;

      let postQueryBuilder = supabase
        .from('community_post')
        .select(postSelectQuery)
        .eq('is_deleted', false);

      if (postId) {
        postQueryBuilder = postQueryBuilder.eq('id', postId);
      } else if (postSlug) {
        postQueryBuilder = postQueryBuilder.eq('slug', postSlug);
      }

      const { data: fetchedPost, error: postError } = await postQueryBuilder.single();

      if (postError || !fetchedPost) {
        return NextResponse.json(
          { error: 'Post not found or not accessible' },
          { status: 404 }
        );
      }

      // Transform the post data to match our Post interface
      const post: Post = {
        id: fetchedPost.id,
        public_id: fetchedPost.public_id,
        title: fetchedPost.title,
        content: fetchedPost.body,
        slug: fetchedPost.slug,
        created_at: fetchedPost.created_at,
        author: Array.isArray(fetchedPost.author) ? fetchedPost.author[0] : fetchedPost.author,
        group: Array.isArray(fetchedPost.group) ? fetchedPost.group[0] : fetchedPost.group
      };

      // Fetch comments if requested
      let comments: Comment[] = [];
      if (includeComments) {
        const { data: fetchedComments } = await supabase
          .from('community_comment')
          .select(`
            id,
            body,
            created_at,
            is_deleted,
            author:profiles!inner(display_name)
          `)
          .eq('post_id', post.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(10);

        // Transform comments data
        comments = (fetchedComments || []).map((comment: any) => ({
          id: comment.id,
          content: comment.body,
          created_at: comment.created_at,
          author: Array.isArray(comment.author) ? comment.author[0] : comment.author
        }));
      }

      // Generate summary
      result = await aiSummarySystem.summarizePost(post, {
        locale,
        includeCitations,
        includeComments,
        includeRelatedContext,
        comments,
        userId
      });

      // Save to history
      await saveToHistory({
        featureType: 'community_summary_post',
        inputData: {
          postId: post.id,
          postTitle: post.title,
          includeComments,
          includeRelatedContext,
          locale
        },
        result,
        executionTimeMs: result.meta.processingTimeMs,
        metadata: { locale, mode: 'post' }
      });
    }

    const processingTime = Date.now() - startTime;

    console.log(`✅ AI Summary completed in ${processingTime}ms for ${mode} mode`);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ AI Summary error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'AI Summary failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve summary capabilities and options
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    return NextResponse.json({
      success: true,
      capabilities: {
        modes: ['search', 'post'],
        locales: ['en', 'zh'],
        features: {
          citations: true,
          themes: true,
          relatedContext: true,
          comments: true,
          streaming: false // Phase 1: not implemented yet
        },
        limits: {
          maxItems: 20,
          maxCitations: 5,
          maxBullets: 6
        }
      },
      examples: {
        search: {
          mode: 'search',
          query: 'machine learning',
          locale: 'en',
          maxItems: 10
        },
        post: {
          mode: 'post',
          postId: 123,
          includeComments: false,
          includeRelatedContext: true,
          locale: 'en'
        }
      }
    });

  } catch (error) {
    console.error('❌ AI Summary capabilities error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get capabilities',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
