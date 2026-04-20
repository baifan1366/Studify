import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import { generateEmbedding } from '@/lib/langChain/embedding';
import redis from '@/utils/redis/redis';
import {
  CommunityRecommendations,
  RecommendedPost,
  UserActivitySignals,
  PostScoringFactors,
  RecommendationFilters
} from '@/interface/community/recommendation-interface';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n' + '🚀'.repeat(40));
  console.log('🚀 [Community Recommendations API] Starting hybrid recommendation generation');
  console.log('🚀'.repeat(40) + '\n');

  try {
    // Authorize using app JWT and role guard
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const supabase = await createServerClient();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const hashtagsParam = searchParams.get('hashtags');
    const filters: RecommendationFilters = {
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'), // 新增 offset 参数
      since: searchParams.get('since') || undefined,
      groups_only: searchParams.get('groupsOnly') === 'true',
      exclude_own_posts: searchParams.get('excludeOwnPosts') !== 'false', // default true
      min_score: parseFloat(searchParams.get('minScore') || '0'),
      q: searchParams.get('q') || undefined,
      hashtags: hashtagsParam ? hashtagsParam.split(',').map(h => h.trim()).filter(Boolean) : undefined
    };

    console.log('📋 [Filters]');
    console.log('  ├─ Limit:', filters.limit);
    console.log('  ├─ Offset:', filters.offset);
    console.log('  ├─ Groups Only:', filters.groups_only);
    console.log('  ├─ Min Score:', filters.min_score);
    console.log('  ├─ Query:', filters.q || 'none');
    console.log('  └─ Hashtags:', filters.hashtags?.join(', ') || 'none');

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authResult.sub)
      .single();

    if (profileError || !profile) {
      console.log('❌ [Community Recommendations API] Profile not found');
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    console.log('👤 [Community Recommendations API] User profile:', {
      profile_id: profile.id
    });

    // Get user activity signals
    const userSignals = await collectUserActivitySignals(supabase, profile.id);
    console.log('📊 [Community Recommendations API] User signals:', {
      liked_posts: userSignals.liked_posts.length,
      frequent_authors: userSignals.frequent_authors.length,
      joined_groups: userSignals.joined_groups.length,
      used_hashtags: userSignals.used_hashtags.length,
      interests: userSignals.interests.length
    });

    // Get candidate posts
    const candidatePosts = await getCandidatePosts(supabase, profile.id, userSignals, filters);
    console.log('📝 [Community Recommendations API] Candidate posts:', candidatePosts.length);

    if (candidatePosts.length === 0) {
      console.log('⚠️ [Community Recommendations API] No candidate posts found from rules/filters');

      // Semantic fallback: if user provided q/hashtags, try intent embedding to fetch semantically similar posts
      if ((filters.q && filters.q.trim().length > 0) || (filters.hashtags && filters.hashtags.length > 0)) {
        try {
          const parts: string[] = [];
          if (filters.q) parts.push(filters.q);
          if (filters.hashtags && filters.hashtags.length > 0) {
            parts.push(filters.hashtags.map(h => `#${h}`).join(' '));
          }
          const text = parts.join(' ');
          const { embedding } = await generateEmbedding(text, 'e5');
          const semResults = await performSemanticSearch(supabase, embedding, 100);
          const ids = semResults.map(r => r.content_id);

          console.log('🧭 [Community Recommendations API] Semantic fallback results:', ids.length);

          const fallbackPosts = await fetchAndEnrichPostsByIds(supabase, ids, userSignals);

          // Apply groups_only if requested
          const visibleFallback = filters.groups_only
            ? fallbackPosts.filter((p: any) => p.group_id && userSignals.joined_groups.includes(p.group_id))
            : fallbackPosts;

          if (visibleFallback.length === 0) {
            return NextResponse.json({
              recommendations: [],
              categories: { from_groups: [], authors_you_like: [], trending: [], for_you: [] },
              debug_info: {
                user_profile_id: profile.id,
                user_interests: userSignals.interests,
                user_groups: userSignals.joined_groups,
                candidate_posts_count: 0,
                processing_time_ms: Date.now() - startTime,
                scoring_breakdown: {
                  interest_matches: 0,
                  group_matches: 0,
                  author_affinity: 0,
                  trending_boost: 0,
                  query_matches: 0,
                  hashtag_matches: 0,
                  taste_vector_posts: 0,
                  embedding_search_results: 0,
                  rules_weight: 0.6,
                  embedding_weight: 0.4,
                  avg_rules_score: 0,
                  avg_embedding_score: 0,
                  avg_hybrid_score: 0
                }
              }
            });
          }

          // Run hybrid scoring on the semantic fallback set
          const hybridResults = await calculateHybridRecommendations(
            supabase,
            visibleFallback,
            userSignals,
            filters,
            profile.id
          );

          const categories = generateCategoryRecommendations(visibleFallback, userSignals, hybridResults.recommendations);
          const processingTime = Date.now() - startTime;

          // Apply offset and limit for pagination
          const offset = filters.offset || 0;
          const limit = filters.limit || 20;
          const paginatedRecommendations = hybridResults.recommendations.slice(offset, offset + limit);
          const hasMore = hybridResults.recommendations.length > offset + limit;

          return NextResponse.json({
            recommendations: paginatedRecommendations,
            has_more: hasMore,
            total_count: hybridResults.recommendations.length,
            categories,
            debug_info: {
              user_profile_id: profile.id,
              user_interests: userSignals.interests,
              user_groups: userSignals.joined_groups,
              candidate_posts_count: visibleFallback.length,
              processing_time_ms: processingTime,
              scoring_breakdown: {
                ...hybridResults.debugStats
              }
            }
          });

        } catch (e) {
          console.warn('⚠️ [Community Recommendations API] Semantic fallback failed:', e);
        }
      }

      // Still nothing: return empty
      return NextResponse.json({
        recommendations: [],
        categories: {
          from_groups: [],
          authors_you_like: [],
          trending: [],
          for_you: []
        },
        debug_info: {
          user_profile_id: profile.id,
          user_interests: userSignals.interests,
          user_groups: userSignals.joined_groups,
          candidate_posts_count: 0,
          processing_time_ms: Date.now() - startTime,
          scoring_breakdown: {
            interest_matches: 0,
            group_matches: 0,
            author_affinity: 0,
            trending_boost: 0,
            query_matches: 0,
            hashtag_matches: 0,
            taste_vector_posts: 0,
            embedding_search_results: 0,
            rules_weight: 0.6,
            embedding_weight: 0.4,
            avg_rules_score: 0,
            avg_embedding_score: 0,
            avg_hybrid_score: 0
          }
        }
      });
    }

    // HYBRID SCORING: Calculate both rules-based and embedding-based scores
    const hybridResults = await calculateHybridRecommendations(
      supabase,
      candidatePosts,
      userSignals,
      filters,
      profile.id
    );

    // Generate category recommendations
    const categories = generateCategoryRecommendations(candidatePosts, userSignals, hybridResults.recommendations);

    const processingTime = Date.now() - startTime;
    console.log('✅ [Community Recommendations API] Hybrid processing completed in', processingTime, 'ms');

    // Apply offset and limit for pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 20;
    const paginatedRecommendations = hybridResults.recommendations.slice(offset, offset + limit);
    const hasMore = hybridResults.recommendations.length > offset + limit;

    console.log(`📄 [Community Recommendations API] Pagination: offset=${offset}, limit=${limit}, returned=${paginatedRecommendations.length}, hasMore=${hasMore}`);

    return NextResponse.json({
      recommendations: paginatedRecommendations,
      has_more: hasMore,
      total_count: hybridResults.recommendations.length,
      categories,
      debug_info: {
        user_profile_id: profile.id,
        user_interests: userSignals.interests,
        user_groups: userSignals.joined_groups,
        candidate_posts_count: candidatePosts.length,
        processing_time_ms: processingTime,
        scoring_breakdown: {
          ...hybridResults.debugStats,
          interest_matches: hybridResults.debugStats.interest_matches || 0,
          group_matches: hybridResults.debugStats.group_matches || 0,
          author_affinity: hybridResults.debugStats.author_affinity || 0,
          trending_boost: hybridResults.debugStats.trending_boost || 0,
          query_matches: hybridResults.debugStats.query_matches || 0,
          hashtag_matches: hybridResults.debugStats.hashtag_matches || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ [Community Recommendations API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch community recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to collect user activity signals

async function collectUserActivitySignals(
  supabase: any,
  profileId: number
): Promise<UserActivitySignals> {
  console.log('🔍 [collectUserActivitySignals] Collecting signals for profile:', profileId);

  // Get user's posts (need public_id for post_hashtags mapping)
  const { data: authoredPosts } = await supabase
    .from('community_post')
    .select('id, public_id')
    .eq('author_id', profileId)
    .eq('is_deleted', false);

  // Get posts user reacted to
  const { data: reactions } = await supabase
    .from('community_reaction')
    .select('target_id')
    .eq('user_id', profileId)
    .eq('target_type', 'post');

  // Get posts user commented on
  const { data: comments } = await supabase
    .from('community_comment')
    .select('post_id')
    .eq('author_id', profileId)
    .eq('is_deleted', false);

  // Get user's group memberships
  const { data: groupMemberships } = await supabase
    .from('community_group_member')
    .select('group_id')
    .eq('user_id', profileId)
    .eq('is_deleted', false);

  // Get user's interests from profile (robust parsing)
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferences, interests')
    .eq('id', profileId)
    .single();

  //AI activity vector
  const aiActivityVector = await createUserAIActivityVector(supabase, profileId);

  // Get hashtags from user's posts (only if there are posts)
  let userHashtags: any[] = [];
  const authoredPublicIds = (authoredPosts || []).map((p: any) => p.public_id).filter(Boolean);
  if (authoredPublicIds.length > 0) {
    const { data: _userHashtags, error: userHashtagsError } = await supabase
      .from('post_hashtags')
      .select(`
        hashtags!inner(name)
      `)
      .in('post_id', authoredPublicIds);
    if (userHashtagsError) {
      console.warn('⚠️ [collectUserActivitySignals] Failed to fetch user hashtags:', userHashtagsError);
    } else {
      userHashtags = _userHashtags || [];
    }
  } else {
    console.log('ℹ️ [collectUserActivitySignals] No authored posts, skipping user hashtags fetch');
  }

  // Get frequent authors (from reactions and comments)
  const frequentAuthors = await getFrequentAuthors(supabase, profileId);

  const parsedInterests = extractUserInterests(profile?.preferences, profile?.interests);

  const signals: UserActivitySignals = {
    liked_posts: (reactions || []).map((r: any) => r.target_id),
    commented_posts: (comments || []).map((c: any) => c.post_id),
    authored_posts: (authoredPosts || []).map((p: any) => p.id),
    frequent_authors: frequentAuthors,
    joined_groups: (groupMemberships || []).map((m: any) => m.group_id),
    used_hashtags: (userHashtags || []).map((h: any) => h.hashtags.name),
    interests: parsedInterests,
    aiActivityVector: aiActivityVector,
    aiActivityKeywords: await extractAIActivityKeywords(supabase, profileId)
  };

  console.log('📈 [collectUserActivitySignals] Collected signals:', {
    liked_posts_count: signals.liked_posts.length,
    commented_posts_count: signals.commented_posts.length,
    authored_posts_count: signals.authored_posts.length,
    frequent_authors_count: signals.frequent_authors.length,
    joined_groups_count: signals.joined_groups.length,
    used_hashtags_count: signals.used_hashtags.length,
    interests_count: signals.interests.length,
    ai_keywords_count: signals.aiActivityKeywords?.length || 0
  });

  return signals;
}

// Robust extractor for user interests; supports multiple storage formats
function extractUserInterests(preferences: any, directInterests: any): string[] {
  const result: string[] = [];

  // 1) direct interests column (text[] or string)
  if (Array.isArray(directInterests)) {
    result.push(
      ...directInterests
        .map((s: any) => String(s))
        .map((s: string) => s.trim())
        .filter(Boolean)
    );
  } else if (typeof directInterests === 'string') {
    result.push(
      ...directInterests
        .split(/[,;\s]+/)
        .map((s: string) => s.trim())
        .filter(Boolean)
    );
  }

  // 2) preferences.interests (array|string|object{subFields})
  const prefInterests = preferences?.interests;
  if (Array.isArray(prefInterests)) {
    result.push(
      ...prefInterests
        .map((s: any) => String(s))
        .map((s: string) => s.trim())
        .filter(Boolean)
    );
  } else if (typeof prefInterests === 'string') {
    result.push(
      ...prefInterests
        .split(/[,;\s]+/)
        .map((s: string) => s.trim())
        .filter(Boolean)
    );
  } else if (prefInterests && Array.isArray(prefInterests.subFields)) {
    result.push(
      ...prefInterests.subFields
        .map((s: any) => String(s))
        .map((s: string) => s.trim())
        .filter(Boolean)
    );
  }

  // Normalize: lowercase + dedupe
  const normalized = Array.from(new Set(result.map((s: string) => s.toLowerCase())));
  return normalized;
}

async function getFrequentAuthors(supabase: any, profileId: number): Promise<number[]> {
  // Try RPC first
  let authorInteractions = null;
  try {
    const { data } = await supabase.rpc('get_frequent_authors', {
      user_profile_id: profileId,
      min_interactions: 2
    });
    authorInteractions = data;
  } catch (error) {
    console.warn('⚠️ [getFrequentAuthors] RPC failed, using fallback:', error);
    authorInteractions = null;
  }

  if (authorInteractions && authorInteractions.length > 0) {
    return authorInteractions.map((a: any) => a.author_id);
  }

  // Fallback: manual aggregation without relying on FK relationships
  const { data: reactionRows } = await supabase
    .from('community_reaction')
    .select('target_id')
    .eq('user_id', profileId)
    .eq('target_type', 'post');

  const { data: commentRows } = await supabase
    .from('community_comment')
    .select('post_id')
    .eq('author_id', profileId)
    .eq('is_deleted', false);

  const postIds = Array.from(new Set([...
    (reactionRows || []).map((r: any) => r.target_id),
  (commentRows || []).map((c: any) => c.post_id),
  ].filter(Boolean)));

  if (postIds.length === 0) return [];

  const { data: posts } = await supabase
    .from('community_post')
    .select('id, author_id')
    .in('id', postIds);

  const authorCounts: Record<number, number> = {};
  (posts || []).forEach((p: any) => {
    if (!p?.author_id) return;
    authorCounts[p.author_id] = (authorCounts[p.author_id] || 0) + 1;
  });

  return Object.entries(authorCounts)
    .filter(([_, count]) => (count as number) >= 2)
    .map(([authorId]) => parseInt(authorId));
}

async function getCandidatePosts(
  supabase: any,
  profileId: number,
  userSignals: UserActivitySignals,
  filters: RecommendationFilters
): Promise<any[]> {
  console.log('🎣 [getCandidatePosts] Fetching candidate posts with balanced group sampling');

  // Strategy: Get posts from multiple groups to ensure diversity
  // 1. Get user's groups
  // 2. Get all public groups
  // 3. Sample posts from each group

  // Get all accessible groups (user's groups + public groups)
  const { data: accessibleGroups } = await supabase
    .from('community_group')
    .select('id, name, visibility')
    .or(`visibility.eq.public,id.in.(${userSignals.joined_groups.join(',') || '0'})`)
    .eq('is_deleted', false)
    .limit(50); // Get up to 50 groups

  console.log(`📚 [getCandidatePosts] Found ${accessibleGroups?.length || 0} accessible groups`);

  // Get posts from each group (max 15 per group to ensure diversity)
  const postsPerGroup = 15;
  const allPosts: any[] = [];

  if (accessibleGroups && accessibleGroups.length > 0) {
    for (const group of accessibleGroups) {
      // Fetch posts without embedding (will join manually later)
      const { data: groupPosts, error: postError } = await supabase
        .from('community_post')
        .select(`
          id,
          public_id,
          title,
          body,
          slug,
          author_id,
          group_id,
          created_at,
          updated_at
        `)
        .eq('group_id', group.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(postsPerGroup);

      if (postError) {
        console.error(`❌ [getCandidatePosts] Error fetching posts for group ${group.id}:`, postError);
        continue;
      }

      if (groupPosts && groupPosts.length > 0) {
        allPosts.push(...groupPosts);
      }
    }
  }

  // Fetch embeddings for all posts in one batch
  if (allPosts.length > 0) {
    const postIds = allPosts.map(p => p.id);
    console.log(`📊 [getCandidatePosts] Fetching embeddings for ${postIds.length} posts...`);

    const { data: embeddings } = await supabase
      .from('embeddings')
      .select('content_id, embedding_e5_small, has_e5_embedding, status')
      .eq('content_type', 'post')
      .in('content_id', postIds)
      .eq('has_e5_embedding', true);

    // Attach embeddings to posts
    const embeddingMap = new Map(embeddings?.map((e: any) => [e.content_id, e]) || []);
    allPosts.forEach(post => {
      post.embedding = embeddingMap.get(post.id) || null;
    });

    console.log(`✅ [getCandidatePosts] Attached embeddings: ${embeddings?.length || 0}/${allPosts.length} posts have embeddings`);
  }

  // Also get posts without group
  const { data: noGroupPosts } = await supabase
    .from('community_post')
    .select(`
      id,
      public_id,
      title,
      body,
      slug,
      author_id,
      group_id,
      created_at,
      updated_at
    `)
    .is('group_id', null)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(20);

  if (noGroupPosts && noGroupPosts.length > 0) {
    allPosts.push(...noGroupPosts);
  }

  console.log(`📝 [getCandidatePosts] Collected ${allPosts.length} posts from balanced sampling`);

  // Apply time filter
  let filtered = allPosts;
  if (filters.since) {
    filtered = filtered.filter((p: any) => new Date(p.created_at) >= new Date(filters.since!));
  }

  // Exclude own posts if requested
  if (filters.exclude_own_posts) {
    filtered = filtered.filter((p: any) => p.author_id !== profileId);
  }

  // Remove duplicates (in case a post appears in multiple queries)
  const uniquePosts = Array.from(
    new Map(filtered.map((p: any) => [p.id, p])).values()
  );

  console.log(`🔍 [getCandidatePosts] After filtering: ${uniquePosts.length} unique posts`);

  console.log(`🔍 [getCandidatePosts] After filtering: ${uniquePosts.length} unique posts`);

  // Fetch related authors, groups, and hashtags
  const authorIds = Array.from(new Set(uniquePosts.map((p: any) => p.author_id).filter(Boolean)));
  const groupIds = Array.from(new Set(uniquePosts.map((p: any) => p.group_id).filter(Boolean)));
  const publicIds = Array.from(new Set(uniquePosts.map((p: any) => p.public_id).filter(Boolean)));

  console.log('🔗 [getCandidatePosts] Related IDs:', { author_count: authorIds.length, group_count: groupIds.length, public_count: publicIds.length });

  // Profiles
  let authorRows: any[] = [];
  if (authorIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', authorIds);
    authorRows = data || [];
  }
  const authorMap = new Map<number, any>((authorRows || []).map((a: any) => [a.id, a]));

  // Groups
  let groupRows: any[] = [];
  if (groupIds.length > 0) {
    const { data } = await supabase
      .from('community_group')
      .select('id, name, slug, visibility')
      .in('id', groupIds);
    groupRows = data || [];
  }
  const groupMap = new Map<number, any>((groupRows || []).map((g: any) => [g.id, g]));

  // Hashtags per post (via post_hashtags -> hashtags)
  const hashtagsMap = new Map<string, any[]>();
  if (publicIds.length > 0) {
    const { data: phRows, error: phError } = await supabase
      .from('post_hashtags')
      .select('post_id, hashtags!inner(name, id)')
      .in('post_id', publicIds);
    if (phError) {
      console.warn('⚠️ [getCandidatePosts] Failed to fetch post hashtags:', phError);
    }
    (phRows || []).forEach((row: any) => {
      const arr = hashtagsMap.get(row.post_id) || [];
      if (row.hashtags) arr.push(row);
      hashtagsMap.set(row.post_id, arr);
    });
  } else {
    console.log('ℹ️ [getCandidatePosts] No candidate public_ids, skipping hashtags fetch');
  }

  // Attach related data
  const enrichedPosts = uniquePosts.map((p: any) => ({
    ...p,
    profiles: authorMap.get(p.author_id) || null,
    community_group: groupMap.get(p.group_id) || null,
    post_hashtags: (hashtagsMap.get(p.public_id) || []).map((r: any) => ({ hashtags: r.hashtags }))
  }));

  // Apply keyword and hashtag filters if present
  let keywordFiltered = enrichedPosts;
  if (filters.q) {
    const q = filters.q.toLowerCase();
    keywordFiltered = keywordFiltered.filter((post: any) => {
      const inTitle = (post.title || '').toLowerCase().includes(q);
      const inBody = (post.body || '').toLowerCase().includes(q);
      const inTags = (post.post_hashtags || []).some((ph: any) => (ph.hashtags?.name || '').toLowerCase().includes(q));
      return inTitle || inBody || inTags;
    });
  }
  if (filters.hashtags && filters.hashtags.length > 0) {
    const wanted = filters.hashtags.map(h => h.toLowerCase());
    keywordFiltered = keywordFiltered.filter((post: any) => {
      const tags = (post.post_hashtags || []).map((ph: any) => (ph.hashtags?.name || '').toLowerCase());
      return tags.some((t: string) => wanted.includes(t));
    });
  }

  // All posts are already from accessible groups, no need to filter visibility again
  const visiblePosts = keywordFiltered;

  // If groups_only filter is enabled, only return posts from user's groups
  const finalPosts = filters.groups_only
    ? visiblePosts.filter((post: any) => post.group_id && userSignals.joined_groups.includes(post.group_id))
    : visiblePosts;

  console.log(`✅ [getCandidatePosts] Filtered to ${finalPosts.length} visible posts`);

  // Debug: Log group distribution
  const groupDistribution = finalPosts.reduce((acc: any, post: any) => {
    const groupName = post.community_group?.name || 'No Group';
    acc[groupName] = (acc[groupName] || 0) + 1;
    return acc;
  }, {});
  console.log('📊 [getCandidatePosts] Group distribution in candidates:', groupDistribution);

  return finalPosts;
}

// Fetch and enrich posts by IDs, attaching profiles, group, and hashtags similarly to getCandidatePosts
async function fetchAndEnrichPostsByIds(
  supabase: any,
  ids: number[],
  _userSignals?: UserActivitySignals
): Promise<any[]> {
  if (!ids || ids.length === 0) return [];

  const { data: posts, error } = await supabase
    .from('community_post')
    .select(`
      id,
      public_id,
      title,
      body,
      slug,
      author_id,
      group_id,
      created_at,
      updated_at
    `)
    .in('id', ids)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error || !posts) return [];

  const postList = posts || [];

  // Fetch embeddings for these posts
  if (postList.length > 0) {
    const postIds = postList.map((p: any) => p.id);
    const { data: embeddings } = await supabase
      .from('embeddings')
      .select('content_id, embedding_e5_small, has_e5_embedding, status')
      .eq('content_type', 'post')
      .in('content_id', postIds)
      .eq('has_e5_embedding', true);

    // Attach embeddings to posts
    const embeddingMap = new Map(embeddings?.map((e: any) => [e.content_id, e]) || []);
    postList.forEach((post: any) => {
      post.embedding = embeddingMap.get(post.id) || null;
    });
  }

  const authorIds = Array.from(new Set(postList.map((p: any) => p.author_id).filter(Boolean)));
  const groupIds = Array.from(new Set(postList.map((p: any) => p.group_id).filter(Boolean)));
  const publicIds = Array.from(new Set(postList.map((p: any) => p.public_id).filter(Boolean)));

  // Profiles
  let authorRows: any[] = [];
  if (authorIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', authorIds);
    authorRows = data || [];
  }
  const authorMap = new Map<number, any>((authorRows || []).map((a: any) => [a.id, a]));

  // Groups
  let groupRows: any[] = [];
  if (groupIds.length > 0) {
    const { data } = await supabase
      .from('community_group')
      .select('id, name, slug, visibility')
      .in('id', groupIds);
    groupRows = data || [];
  }
  const groupMap = new Map<number, any>((groupRows || []).map((g: any) => [g.id, g]));

  // Hashtags per post (via post_hashtags -> hashtags)
  const hashtagsMap = new Map<string, any[]>();
  if (publicIds.length > 0) {
    const { data: phRows } = await supabase
      .from('post_hashtags')
      .select('post_id, hashtags!inner(name, id)')
      .in('post_id', publicIds);
    (phRows || []).forEach((row: any) => {
      const arr = hashtagsMap.get(row.post_id) || [];
      if (row.hashtags) arr.push(row);
      hashtagsMap.set(row.post_id, arr);
    });
  }

  // Attach related data
  const enrichedPosts = postList.map((p: any) => ({
    ...p,
    profiles: authorMap.get(p.author_id) || null,
    community_group: groupMap.get(p.group_id) || null,
    post_hashtags: (hashtagsMap.get(p.public_id) || []).map((r: any) => ({ hashtags: r.hashtags }))
  }));

  return enrichedPosts;
}

function calculateRecommendations(
  candidatePosts: any[],
  userSignals: UserActivitySignals,
  filters: RecommendationFilters
): RecommendedPost[] {
  console.log('🧮 [calculateRecommendations] Calculating scores for posts');

  const scoredPosts = candidatePosts.map(post => {
    const factors = calculateScoringFactors(post, userSignals, filters);
    const score = calculateFinalScore(factors);
    const reasons = generateRecommendationReasons(post, factors, userSignals, filters);

    console.log(`📊 [calculateRecommendations] Post ${post.id} score: ${score}`, {
      title: post.title?.substring(0, 50) + '...',
      factors: {
        interest_overlap: factors.interest_overlap,
        group_membership: factors.group_membership,
        author_affinity: factors.author_affinity,
        hashtag_relevance: factors.hashtag_relevance,
        freshness_factor: factors.freshness_factor
      },
      reasons
    });

    return {
      ...post,
      author: post.profiles ? {
        id: post.profiles.id,
        display_name: post.profiles.display_name,
        avatar_url: post.profiles.avatar_url
      } : undefined,
      group: post.community_group ? {
        id: post.community_group.id,
        name: post.community_group.name,
        slug: post.community_group.slug,
        visibility: post.community_group.visibility
      } : undefined,
      hashtags: post.post_hashtags?.map((ph: any) => ph.hashtags) || [],
      recommendation_score: Math.round(score),
      recommendation_reasons: reasons,
      recommendation_details: {
        ai_similarity: factors.ai_activity_similarity,
        interest_overlap: factors.interest_overlap,
        hashtag_relevance: factors.hashtag_relevance,
        group_relevance: factors.group_content_relevance || 0,
        author_affinity: factors.author_affinity,
        freshness: factors.freshness_factor,
        semantic_similarity: factors.semantic_similarity || 0
      },
      relevance_score: Math.round(factors.interest_overlap * 100),
      freshness_score: Math.round(factors.freshness_factor * 100),
      interaction_score: Math.round((factors.interaction_count / 10) * 100) // Normalize
    } as RecommendedPost;
  });

  // Filter by minimum score
  const filteredPosts = scoredPosts.filter(post =>
    post.recommendation_score >= (filters.min_score || 0)
  );

  // Sort by score descending
  return filteredPosts.sort((a, b) => b.recommendation_score - a.recommendation_score);
}

// 计算群组活跃度分数
async function calculateGroupActivityScore(supabase: any, groupId: number, userId: string): Promise<number> {
  try {
    // 查询用户在该群组的活跃度（发帖、评论、点赞等）- 30天内
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: activities, error } = await supabase
      .from('community_post')
      .select('id, created_at')
      .eq('group_id', groupId)
      .eq('author_id', userId)
      .gte('created_at', thirtyDaysAgo);

    if (error || !activities || activities.length === 0) return 0;

    // 根据活跃度返回分数 (10个活动得满分)
    const recentCount = activities.length;
    return Math.min(recentCount / 10, 1);
  } catch (error) {
    console.error('Error calculating group activity score:', error);
    return 0;
  }
}

// 计算群组内容相关性
function calculateGroupContentRelevance(post: any, userSignals: UserActivitySignals): number {
  try {
    // 基于用户兴趣和帖子内容计算相关性
    const postHashtags = (post.post_hashtags || []).map((ph: any) => ph.hashtags?.name).filter(Boolean);

    const matchingInterests = userSignals.interests.filter(interest => {
      const interestLower = interest.toLowerCase();
      return postHashtags.some((tag: string) => tag.toLowerCase().includes(interestLower)) ||
        (post.body || '').toLowerCase().includes(interestLower) ||
        (post.title || '').toLowerCase().includes(interestLower);
    });

    if (matchingInterests.length === 0) return 0;

    return Math.min(matchingInterests.length / Math.max(userSignals.interests.length, 1), 1);
  } catch (error) {
    console.error('Error calculating group content relevance:', error);
    return 0;
  }
}

function calculateScoringFactors(post: any, userSignals: UserActivitySignals, filters: RecommendationFilters): PostScoringFactors {
  // 🔍 DEBUG: 输入数据检查
  console.log('\n🔧 [calculateScoringFactors] Input Data Check:');
  console.log(`  • Post ID: ${post.id}`);
  console.log(`  • Post Title: "${post.title?.substring(0, 50) || 'No title'}"`);
  console.log(`  • Post Created At: ${post.created_at}`);
  console.log(`  • Post Group ID: ${post.group_id || 'none'}`);
  console.log(`  • Post Author ID: ${post.author_id}`);
  console.log(`  • User Interests Count: ${userSignals.interests.length}`);
  console.log(`  • User Interests: [${userSignals.interests.slice(0, 3).join(', ')}${userSignals.interests.length > 3 ? '...' : ''}]`);
  console.log(`  • User Hashtags Count: ${userSignals.used_hashtags.length}`);
  console.log(`  • User Groups Count: ${userSignals.joined_groups.length}`);
  console.log(`  • User AI Activity Vector: ${userSignals.aiActivityVector ? 'EXISTS' : 'NULL'}`);

  // Interest overlap (标签和兴趣匹配)
  const postHashtags = (post.post_hashtags || []).map((ph: any) => ph.hashtags?.name).filter(Boolean);
  console.log(`  • Post Hashtags: [${postHashtags.join(', ') || 'none'}]`);

  const interestOverlap = calculateInterestOverlap(postHashtags, post.body, userSignals.interests, userSignals.used_hashtags);
  console.log(`  • Interest Overlap Result: ${interestOverlap.toFixed(3)}`);

  // Group membership
  const groupMembership = post.group_id ? userSignals.joined_groups.includes(post.group_id) : false;
  console.log(`  • Group Membership: ${groupMembership} (post.group_id: ${post.group_id}, in user groups: ${userSignals.joined_groups.includes(post.group_id)})`);

  // Author affinity
  const authorAffinity = userSignals.frequent_authors.includes(post.author_id) ? 1 : 0;
  console.log(`  • Author Affinity: ${authorAffinity} (author ${post.author_id} in frequent list: ${userSignals.frequent_authors.includes(post.author_id)})`);

  // Hashtag relevance
  const hashtagRelevance = calculateHashtagRelevance(postHashtags, userSignals.used_hashtags);
  console.log(`  • Hashtag Relevance: ${hashtagRelevance.toFixed(3)}`);

  // Interaction count (mock - would need actual data)
  const interactionCount = Math.random() * 20; // TODO: Replace with actual reaction/comment counts

  // Freshness factor
  const postAge = Date.now() - new Date(post.created_at).getTime();
  const daysSincePost = postAge / (1000 * 60 * 60 * 24);
  const freshnessFactor = Math.exp(-daysSincePost / 7); // 7-day half-life
  console.log(`  • Post Age: ${daysSincePost.toFixed(2)} days`);
  console.log(`  • Freshness Factor: ${freshnessFactor.toFixed(3)}`);

  // Query relevance (keyword and explicit hashtag filters)
  let semanticSimilarity = 0;
  if (filters.q) {
    const q = filters.q.toLowerCase();
    const inTitle = (post.title || '').toLowerCase().includes(q) ? 1 : 0;
    const inBody = (post.body || '').toLowerCase().includes(q) ? 1 : 0;
    const inTags = postHashtags.some((t: string) => t.toLowerCase().includes(q)) ? 1 : 0;
    semanticSimilarity += (inTitle * 0.5 + inBody * 0.3 + inTags * 0.2);
  }
  if (filters.hashtags && filters.hashtags.length > 0) {
    const wanted = filters.hashtags.map(h => h.toLowerCase());
    const matchCount = postHashtags.filter((t: string) => wanted.includes(t.toLowerCase())).length;
    if (matchCount > 0) {
      semanticSimilarity += Math.min(1, matchCount / wanted.length);
    }
  }
  console.log(`  • Semantic Similarity: ${semanticSimilarity.toFixed(3)}`);

  //AI activities similarity calculation
  console.log(`\n🤖 [AI Activity Similarity] Calculating...`);
  let aiActivitySimilarity = 0;

  if (userSignals.aiActivityVector) {
    console.log(`  ✅ User AI Activity Vector: EXISTS (length: ${userSignals.aiActivityVector.length})`);
    console.log(`     First 5 values: [${userSignals.aiActivityVector.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);

    // Get post embedding from embeddings table (joined in query)
    const postEmbeddingData = post.embedding; // This is the joined embeddings record
    const postEmbedding = postEmbeddingData?.embedding_e5_small;

    if (postEmbedding && postEmbeddingData?.has_e5_embedding) {
      console.log(`  ✅ Post Embedding: EXISTS (from embeddings table)`);
      console.log(`     Post ID: ${post.id}`);
      console.log(`     Post Title: "${post.title?.substring(0, 50) || 'No title'}"`);
      console.log(`     Embedding Status: ${postEmbeddingData.status || 'unknown'}`);
      // Parse post embedding if it's a string
      let parsedPostEmbedding: number[] | null = null;

      if (Array.isArray(postEmbedding)) {
        parsedPostEmbedding = postEmbedding;
        console.log(`     Embedding Type: Array (length: ${postEmbedding.length})`);
      } else if (typeof postEmbedding === 'string') {
        console.log(`     Embedding Type: String (length: ${postEmbedding.length})`);
        try {
          const cleaned = postEmbedding.trim().replace(/^\[|\]$/g, '');
          parsedPostEmbedding = cleaned.split(',').map((v: string) => parseFloat(v.trim()));
          console.log(`     Parsed to Array (length: ${parsedPostEmbedding.length})`);
        } catch (error) {
          console.error(`     ❌ Failed to parse embedding:`, error);
        }
      } else {
        console.log(`     ⚠️  Unknown embedding type: ${typeof postEmbedding}`);
      }

      if (parsedPostEmbedding && parsedPostEmbedding.length === 384) {
        // Calculate cosine similarity
        aiActivitySimilarity = cosineSimilarity(userSignals.aiActivityVector, parsedPostEmbedding);

        console.log(`\n  📊 Similarity Calculation:`);
        console.log(`     • User AI Vector: [${userSignals.aiActivityVector.slice(0, 3).map(v => v.toFixed(4)).join(', ')}...]`);
        console.log(`     • Post Embedding: [${parsedPostEmbedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}...]`);
        console.log(`     • Cosine Similarity: ${aiActivitySimilarity.toFixed(4)} (${(aiActivitySimilarity * 100).toFixed(2)}%)`);

        if (aiActivitySimilarity > 0.7) {
          console.log(`     ✅ HIGH similarity - Strong match!`);
        } else if (aiActivitySimilarity > 0.5) {
          console.log(`     ✅ MEDIUM similarity - Good match`);
        } else if (aiActivitySimilarity > 0.3) {
          console.log(`     ⚠️  LOW similarity - Weak match`);
        } else {
          console.log(`     ❌ VERY LOW similarity - Poor match`);
        }
      } else {
        console.log(`     ❌ Invalid embedding length: ${parsedPostEmbedding?.length || 0}, expected 384`);
      }
    } else {
      console.log(`  ❌ Post Embedding: NULL`);
      console.log(`     Post ID: ${post.id} has no embedding in embeddings table`);
      if (postEmbeddingData) {
        console.log(`     Embedding record exists but:`);
        console.log(`       - has_e5_embedding: ${postEmbeddingData.has_e5_embedding}`);
        console.log(`       - status: ${postEmbeddingData.status}`);
      } else {
        console.log(`     No embedding record found in embeddings table`);
      }
      console.log(`     Action: Run embedding backfill for content_type='post'`);
    }
  } else {
    console.log(`  ❌ User AI Activity Vector: NULL`);
    console.log(`     User has no AI activity data (Q&A, notes, mistakes, workflows)`);
  }

  // 计算群组活跃度和内容相关性
  const groupActivityScore = post.group_id ? 0 : 0; // 将在异步版本中实现
  const groupContentRelevance = post.group_id ? calculateGroupContentRelevance(post, userSignals) : 0;
  console.log(`  • Group Activity Score: ${groupActivityScore.toFixed(3)} (not implemented yet)`);
  console.log(`  • Group Content Relevance: ${groupContentRelevance.toFixed(3)}`);

  return {
    interest_overlap: interestOverlap,
    group_membership: groupMembership,
    author_affinity: authorAffinity,
    hashtag_relevance: hashtagRelevance,
    interaction_count: interactionCount,
    freshness_factor: freshnessFactor,
    semantic_similarity: Math.min(1, semanticSimilarity),
    ai_activity_similarity: aiActivitySimilarity,
    group_activity_score: groupActivityScore,
    group_content_relevance: groupContentRelevance
  };
}

function calculateInterestOverlap(
  postHashtags: string[],
  postBody: string,
  userInterests: string[],
  userHashtags: string[]
): number {
  if (!userInterests.length && !userHashtags.length) return 0;

  let matches = 0;
  let total = userInterests.length + userHashtags.length;

  // Check hashtag matches
  postHashtags.forEach(tag => {
    if (userHashtags.some(userTag =>
      userTag.toLowerCase().includes(tag.toLowerCase()) ||
      tag.toLowerCase().includes(userTag.toLowerCase())
    )) {
      matches++;
    }
  });

  // Check interest matches in content
  userInterests.forEach(interest => {
    const interestLower = interest.toLowerCase();
    if (postBody?.toLowerCase().includes(interestLower) ||
      postHashtags.some(tag => tag.toLowerCase().includes(interestLower))) {
      matches++;
    }
  });

  return Math.min(matches / total, 1); // Cap at 1.0
}

function calculateHashtagRelevance(postHashtags: string[], userHashtags: string[]): number {
  if (!postHashtags.length || !userHashtags.length) return 0;

  const matches = postHashtags.filter(tag =>
    userHashtags.some(userTag =>
      userTag.toLowerCase() === tag.toLowerCase()
    )
  ).length;

  return matches / postHashtags.length;
}

function calculateFinalScore(factors: PostScoringFactors): number {
  // Weighted scoring formula
  const weights = {
    interest_overlap: 10,
    group_membership: 28,      // 提升到和 AI activity 同等权重
    author_affinity: 12,
    hashtag_relevance: 12,
    freshness_factor: 8,
    semantic_similarity: 20,
    ai_activity_similarity: 28
  };

  let score = 0;
  score += factors.interest_overlap * weights.interest_overlap;
  score += (factors.group_membership ? 1 : 0) * weights.group_membership;
  score += factors.author_affinity * weights.author_affinity;
  score += factors.hashtag_relevance * weights.hashtag_relevance;
  score += factors.freshness_factor * weights.freshness_factor;
  if (typeof factors.semantic_similarity === 'number') {
    score += factors.semantic_similarity * weights.semantic_similarity;
  }
  if (typeof factors.ai_activity_similarity === 'number') {
    score += factors.ai_activity_similarity * weights.ai_activity_similarity;
  }

  // Add interaction boost (normalized)
  score += Math.min(factors.interaction_count / 10, 1) * 10;

  return Math.min(score, 100); // Cap at 100
}

function generateRecommendationReasons(
  post: any,
  factors: PostScoringFactors,
  userSignals: UserActivitySignals,
  filters: RecommendationFilters
): string[] {
  const reasons: string[] = [];

  // 🔍 DEBUG: 详细的因子分析
  console.log('\n' + '='.repeat(80));
  console.log(`📊 POST DEBUG: "${post.title?.substring(0, 50) || 'No title'}..." (ID: ${post.id})`);
  console.log('='.repeat(80));

  // console.log('\n📈 SCORING FACTORS:');
  // console.log('┌─────────────────────────────────┬─────────┬───────────┬────────┐');
  // console.log('│ Factor                          │ Value   │ Threshold │ Status │');
  // console.log('├─────────────────────────────────┼─────────┼───────────┼────────┤');
  // console.log(`│ Interest Overlap                │ ${factors.interest_overlap.toFixed(3)}   │ > 0.3     │ ${factors.interest_overlap > 0.3 ? '✅ PASS' : '❌ FAIL'} │`);
  // console.log(`│ Group Membership                │ ${factors.group_membership ? 'true   ' : 'false  '} │ true      │ ${factors.group_membership ? '✅ PASS' : '❌ FAIL'} │`);
  // console.log(`│   ├─ Activity Score             │ ${(factors.group_activity_score || 0).toFixed(3)}   │ > 0.3     │ ${(factors.group_activity_score || 0) > 0.3 ? '✅ PASS' : '❌ FAIL'} │`);
  // console.log(`│   └─ Content Relevance          │ ${(factors.group_content_relevance || 0).toFixed(3)}   │ > 0.4     │ ${(factors.group_content_relevance || 0) > 0.4 ? '✅ PASS' : '❌ FAIL'} │`);
  // console.log(`│ Author Affinity                 │ ${factors.author_affinity.toFixed(3)}   │ > 0       │ ${factors.author_affinity > 0 ? '✅ PASS' : '❌ FAIL'} │`);
  // console.log(`│ Hashtag Relevance               │ ${factors.hashtag_relevance.toFixed(3)}   │ > 0.5     │ ${factors.hashtag_relevance > 0.5 ? '✅ PASS' : '❌ FAIL'} │`);
  // console.log(`│ AI Activity Similarity          │ ${factors.ai_activity_similarity.toFixed(3)}   │ > 0.5     │ ${factors.ai_activity_similarity > 0.5 ? '✅ PASS' : '❌ FAIL'} │`);
  // console.log(`│   └─ (Lower threshold)          │ ${factors.ai_activity_similarity.toFixed(3)}   │ > 0.3     │ ${factors.ai_activity_similarity > 0.3 ? '✅ PASS' : '❌ FAIL'} │`);
  // console.log(`│ Embedding Score                 │ ${(factors.embedding_score || 0).toFixed(3)}   │ > 0       │ ${(factors.embedding_score || 0) > 0 ? '✅ PASS' : '❌ FAIL'} │`);
  // console.log(`│ Freshness Factor                │ ${factors.freshness_factor.toFixed(3)}   │ > 0.8     │ ${factors.freshness_factor > 0.8 ? '✅ PASS' : '❌ FAIL'} │`);
  // console.log(`│ Semantic Similarity             │ ${(factors.semantic_similarity || 0).toFixed(3)}   │ > 0       │ ${(factors.semantic_similarity || 0) > 0 ? '✅ PASS' : '❌ FAIL'} │`);
  // console.log('└─────────────────────────────────┴─────────┴───────────┴────────┘');

  // console.log('\n🔍 FILTER CONDITIONS:');
  // console.log(`  • Keyword Query (q): ${filters.q || 'none'}`);
  // console.log(`  • Hashtag Filter: ${filters.hashtags?.join(', ') || 'none'}`);

  // console.log('\n📝 USER SIGNALS:');
  // console.log(`  • Interests: [${userSignals.interests.slice(0, 3).join(', ')}${userSignals.interests.length > 3 ? '...' : ''}]`);
  // console.log(`  • Used Hashtags: [${userSignals.used_hashtags.slice(0, 3).join(', ')}${userSignals.used_hashtags.length > 3 ? '...' : ''}]`);
  // console.log(`  • Joined Groups: ${userSignals.joined_groups.length} groups`);
  // console.log(`  • Frequent Authors: ${userSignals.frequent_authors.length} authors`);

  // 🎯 检测用户数据完整度
  const hasInterests = userSignals.interests.length > 0;
  const hasHashtags = userSignals.used_hashtags.length > 0;
  const hasAIActivity = factors.ai_activity_similarity > 0;
  const dataCompleteness = (hasInterests ? 1 : 0) + (hasHashtags ? 1 : 0) + (hasAIActivity ? 1 : 0);

  // console.log(`\n⚠️  DATA COMPLETENESS: ${dataCompleteness}/3`);
  // console.log(`  • Has Interests: ${hasInterests ? '✅' : '❌'}`);
  // console.log(`  • Has Hashtags: ${hasHashtags ? '✅' : '❌'}`);
  // console.log(`  • Has AI Activity: ${hasAIActivity ? '✅' : '❌'}`);

  // 根据数据完整度调整阈值
  const interestThreshold = hasInterests ? 0.3 : 0.1; // 如果没有兴趣，降低阈值
  const hashtagThreshold = hasHashtags ? 0.5 : 0.2;   // 如果没有标签，降低阈值

  console.log(`\n🔧 ADJUSTED THRESHOLDS (based on data completeness):`);
  console.log(`  • Interest Overlap: > ${interestThreshold} (${hasInterests ? 'normal' : 'lowered'})`);
  console.log(`  • Hashtag Relevance: > ${hashtagThreshold} (${hasHashtags ? 'normal' : 'lowered'})`);

  if (factors.interest_overlap > interestThreshold) {
    const matchingInterests = userSignals.interests.filter(interest => {
      const il = interest.toLowerCase();
      return post.body?.toLowerCase().includes(il) || (post.title || '').toLowerCase().includes(il);
    });
    if (matchingInterests.length > 0) {
      reasons.push(`Your interests match："${matchingInterests.slice(0, 2).join(', ')}"`);
    } else if (!hasInterests && factors.interest_overlap > 0.1) {
      // 如果用户没有设置兴趣，但有一些 hashtag 匹配
      reasons.push(`Matches your activity patterns`);
    }
  }

  if (factors.group_membership) {
    // 添加群组活跃度和内容相关性条件
    const groupActivityScore = factors.group_activity_score || 0;
    const contentRelevance = factors.group_content_relevance || 0;

    // 如果数据不完整，降低群组推荐的要求
    const groupThreshold = dataCompleteness >= 2 ? 0.4 : 0.1;

    if (groupActivityScore > 0.3 || contentRelevance > groupThreshold) {
      reasons.push(`From groups you are in："${post.community_group?.name}"`);
    } else if (dataCompleteness < 2 && factors.group_membership) {
      // 数据不足时，群组成员身份本身就是一个理由
      reasons.push(`From groups you are in："${post.community_group?.name}"`);
    }
  }

  if (factors.author_affinity > 0) {
    reasons.push(`You interact with this author："${post.profiles?.display_name}"`);
  }

  if (factors.hashtag_relevance > hashtagThreshold) {
    const postHashtags = (post.post_hashtags || []).map((ph: any) => ph.hashtags?.name).filter(Boolean);
    const matchingTags = postHashtags.filter((tag: any) =>
      userSignals.used_hashtags.some(userTag => userTag.toLowerCase() === tag.toLowerCase())
    );
    if (matchingTags.length > 0) {
      reasons.push(`Hashtags match：#${matchingTags.slice(0, 2).join(' #')}`);
    }
  }

  // AI activity similarity with tiered messaging and specific keywords
  if (factors.ai_activity_similarity > 0.5) {
    // Extract keywords from user's AI activities to show why this post matches
    const aiKeywords = userSignals.aiActivityKeywords || [];
    const postKeywords = extractKeywordsFromPost(post);
    const matchingKeywords = aiKeywords.filter(keyword =>
      postKeywords.some(pk => pk.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(pk.toLowerCase()))
    ).slice(0, 3);

    if (matchingKeywords.length > 0) {
      reasons.unshift(`Matches your AI questions about: ${matchingKeywords.join(', ')}`);
    } else {
      reasons.unshift('Based on your AI learning activities');
    }
  } else if (factors.ai_activity_similarity > 0.3) {
    const aiKeywords = userSignals.aiActivityKeywords || [];
    const postKeywords = extractKeywordsFromPost(post);
    const matchingKeywords = aiKeywords.filter(keyword =>
      postKeywords.some(pk => pk.toLowerCase().includes(keyword.toLowerCase()))
    ).slice(0, 2);

    if (matchingKeywords.length > 0) {
      reasons.push(`Related to your questions about: ${matchingKeywords.join(', ')}`);
    } else {
      reasons.push('Related to your AI interactions');
    }
  }

  // Explicit keyword query reason
  if (filters.q) {
    const q = filters.q.toLowerCase();
    const hits: string[] = [];
    if ((post.title || '').toLowerCase().includes(q)) hits.push('标题');
    if ((post.body || '').toLowerCase().includes(q)) hits.push('正文');
    const postHashtags = (post.post_hashtags || []).map((ph: any) => ph.hashtags?.name).filter(Boolean);
    if (postHashtags.some((t: string) => t.toLowerCase().includes(q))) hits.push('标签');
    if (hits.length > 0) {
      reasons.push(`Keywords match：${hits.join(', ')}`);
    }
  }

  // Explicit hashtag filter reason
  if (filters.hashtags && filters.hashtags.length > 0) {
    const postHashtags = (post.post_hashtags || []).map((ph: any) => ph.hashtags?.name).filter(Boolean);
    const wanted = filters.hashtags.map(h => h.toLowerCase());
    const matching = postHashtags.filter((t: string) => wanted.includes(t.toLowerCase()));
    if (matching.length > 0) {
      reasons.push(`Hashtags match：#${matching.slice(0, 3).join(' #')}`);
    }
  }

  // Embedding-based reason: explicitly surface semantic similarity and weight (40%)
  if (typeof factors.embedding_score === 'number' && factors.embedding_score > 0) {
    const pct = Math.round(factors.embedding_score * 100);
    // Keep concise and informative; this also educates that embedding contributes 40%
    reasons.push(`语义相似度：${pct}%（嵌入权重 40%）`);
  }

  if (factors.freshness_factor > 0.8) {
    reasons.push('Latest trending content');
  }

  // Fallback reason - provide more context
  if (reasons.length === 0) {
    // Try to give a more specific fallback based on available factors
    if (factors.interest_overlap > 0.1) {
      reasons.push('Matches your general interests');
    } else if (factors.freshness_factor > 0.5) {
      reasons.push('Recent popular content');
    } else if (factors.group_membership) {
      reasons.push('From a group you joined');
    } else {
      reasons.push('Recommended quality content for you');
    }
  }

  // 🎯 DEBUG: 生成的推荐理由
  console.log('\n💡 GENERATED REASONS:');
  if (reasons.length > 0) {
    reasons.forEach((reason, idx) => {
      console.log(`  ${idx + 1}. ${reason}`);
    });
  } else {
    console.log('  ⚠️  No reasons generated (using fallback)');
  }

  console.log('\n📊 FINAL OUTPUT:');
  console.log(`  • Total reasons: ${reasons.length}`);
  console.log(`  • Returned (after slice): ${Math.min(reasons.length, 3)}`);
  console.log('='.repeat(80) + '\n');

  return reasons.slice(0, 3); // Limit to 3 reasons for richer context
}

function generateCategoryRecommendations(
  candidatePosts: any[],
  userSignals: UserActivitySignals,
  allRecommendations: RecommendedPost[]
): CommunityRecommendations['categories'] {
  console.log('🏷️ [generateCategoryRecommendations] Generating category recommendations');

  // From groups - posts from user's joined groups
  const fromGroups = allRecommendations
    .filter(post => post.group_id && userSignals.joined_groups.includes(post.group_id))
    .slice(0, 5);

  // Authors you like - posts from frequently interacted authors
  const authorsYouLike = allRecommendations
    .filter(post => userSignals.frequent_authors.includes(post.author_id))
    .slice(0, 5);

  // Trending - highest interaction posts (mock for now)
  const trending = allRecommendations
    .sort((a, b) => (b.interaction_score || 0) - (a.interaction_score || 0))
    .slice(0, 5);

  // For you - highest relevance score
  const forYou = allRecommendations
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .slice(0, 5);

  console.log('📊 [generateCategoryRecommendations] Category counts:', {
    from_groups: fromGroups.length,
    authors_you_like: authorsYouLike.length,
    trending: trending.length,
    for_you: forYou.length
  });

  return {
    from_groups: fromGroups,
    authors_you_like: authorsYouLike,
    trending: trending,
    for_you: forYou
  };
}

// HYBRID RECOMMENDATION SYSTEM
// Combines rules-based scoring (60%) with embedding-based scoring (40%)
async function calculateHybridRecommendations(
  supabase: any,
  candidatePosts: any[],
  userSignals: UserActivitySignals,
  filters: RecommendationFilters,
  userId: number
): Promise<{
  recommendations: RecommendedPost[];
  debugStats: any;
}> {
  console.log('🔬 [Hybrid Recommendations] Starting hybrid scoring process');

  // Step 1: Calculate rules-based scores for all posts
  const rulesBasedScores = candidatePosts.map(post => {
    const factors = calculateScoringFactors(post, userSignals, filters);
    const score = calculateFinalScore(factors);
    return { post, score, factors };
  });

  // Step 2: Create user taste vector from liked (and later: commented/authored) posts
  const tasteVector = await createUserTasteVector(supabase, userSignals.liked_posts);

  // Step 2b: Create AI activity vector from user's AI interactions
  const aiActivityVector = await createUserAIActivityVector(supabase, userId);
  console.log('🤖 [Hybrid Recommendations] AI activity vector:', aiActivityVector ? 'available' : 'not available');

  // Step 3: Build intent vector from current query/hashtags as fallback or complement
  let intentVector: number[] | null = null;
  if ((filters.q && filters.q.trim().length > 0) || (filters.hashtags && filters.hashtags.length > 0)) {
    try {
      const parts: string[] = [];
      if (filters.q) parts.push(filters.q);
      if (filters.hashtags && filters.hashtags.length > 0) {
        parts.push(filters.hashtags.map(h => `#${h}`).join(' '));
      }
      const text = parts.join(' ');
      const { embedding } = await generateEmbedding(text, 'e5');
      intentVector = embedding;
      console.log('🧭 [Hybrid Recommendations] Built intent embedding from query/hashtags');
    } catch (e) {
      console.warn('⚠️ [Hybrid Recommendations] Failed to build intent embedding:', e);
      intentVector = null;
    }
  }

  // Merge taste vector and AI activity vector
  // Weights: 40% taste (liked posts), 60% AI activity (Q&A, notes, mistakes, workflows)
  let combinedVector: number[] | null = null;
  if (tasteVector && aiActivityVector) {
    combinedVector = tasteVector.map((val, idx) =>
      val * 0.4 + aiActivityVector[idx] * 0.6
    );
    console.log('🔀 [Hybrid Recommendations] Combined taste + AI activity vectors (40/60)');
  } else {
    combinedVector = tasteVector || aiActivityVector;
    console.log('🔀 [Hybrid Recommendations] Using single vector:', tasteVector ? 'taste only' : 'AI activity only');
  }

  // Step 4: Get embedding-based scores from taste and/or intent vectors
  const tasteScores: Map<number, number> = new Map();
  const intentScores: Map<number, number> = new Map();
  let embeddingSearchResults = 0;

  if (combinedVector) {
    console.log('🧠 [Hybrid Recommendations] Using combined vector for semantic search');
    const tasteResults = await performSemanticSearch(supabase, combinedVector, candidatePosts.length * 2);
    embeddingSearchResults += tasteResults.length;
    tasteResults.forEach(r => tasteScores.set(r.content_id, r.similarity));
  }

  if (intentVector) {
    console.log('🔎 [Hybrid Recommendations] Using intent vector for semantic search');
    const intentResults = await performSemanticSearch(supabase, intentVector, candidatePosts.length * 2);
    embeddingSearchResults += intentResults.length;
    intentResults.forEach(r => intentScores.set(r.content_id, r.similarity));
  }

  // Step 5: Normalize rules-based scores to 0-1 scale
  const maxRulesScore = Math.max(...rulesBasedScores.map(r => r.score));
  const minRulesScore = Math.min(...rulesBasedScores.map(r => r.score));
  const rulesScoreRange = maxRulesScore - minRulesScore || 1;

  // Step 6: Calculate hybrid scores (50% rules + 50% embedding)
  const RULES_WEIGHT = 0.5;
  const EMBEDDING_WEIGHT = 0.5;

  const hybridRecommendations = rulesBasedScores.map(({ post, score, factors }) => {
    // Normalize rules score to 0-1
    const normalizedRulesScore = (score - minRulesScore) / rulesScoreRange;

    // Get embedding score from taste and intent (choose max by default)
    const taste = tasteScores.get(post.id) || 0;
    const intent = intentScores.get(post.id) || 0;
    const embeddingScore = Math.max(taste, intent);

    // Calculate hybrid score
    const hybridScore = (normalizedRulesScore * RULES_WEIGHT) + (embeddingScore * EMBEDDING_WEIGHT);

    // Update factors with hybrid components
    const enhancedFactors = {
      ...factors,
      rules_based_score: normalizedRulesScore,
      embedding_score: embeddingScore,
      hybrid_score: hybridScore
    };

    // Extract matching AI keywords for this post
    const aiKeywords = userSignals.aiActivityKeywords || [];
    const postKeywords = extractKeywordsFromPost(post);
    const matchingAIKeywords = aiKeywords.filter(keyword =>
      postKeywords.some(pk =>
        pk.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(pk.toLowerCase())
      )
    ).slice(0, 5); // Top 5 matching keywords

    // If no matching keywords but user has AI keywords, show top AI keywords anyway
    const displayAIKeywords = matchingAIKeywords.length > 0
      ? matchingAIKeywords
      : (aiKeywords.length > 0 ? aiKeywords.slice(0, 5) : []);

    console.log(`🔑 [Hybrid] Post ${post.id} AI keywords:`, {
      user_ai_keywords_count: aiKeywords.length,
      user_ai_keywords_sample: aiKeywords.slice(0, 5),
      post_keywords_count: postKeywords.length,
      post_keywords_sample: postKeywords.slice(0, 5),
      matching_keywords: matchingAIKeywords,
      display_keywords: displayAIKeywords,
      post_title: post.title?.substring(0, 50)
    });

    // Generate reasons (including embedding-based reasons if applicable)
    const reasons = generateRecommendationReasons(post, enhancedFactors, userSignals, filters);
    if (embeddingScore > 0.7) {
      if (intent >= taste) {
        reasons.unshift('Semantic match with your current intent');
      } else {
        reasons.unshift('Similar to content you liked');
      }
    }

    return {
      ...post,
      author: post.profiles ? {
        id: post.profiles.id,
        display_name: post.profiles.display_name,
        avatar_url: post.profiles.avatar_url
      } : undefined,
      group: post.community_group ? {
        id: post.community_group.id,
        name: post.community_group.name,
        slug: post.community_group.slug,
        visibility: post.community_group.visibility
      } : undefined,
      hashtags: post.post_hashtags?.map((ph: any) => ph.hashtags) || [],
      recommendation_score: Math.round(hybridScore * 100),
      recommendation_reasons: reasons,
      recommendation_details: {
        ai_similarity: enhancedFactors.ai_activity_similarity,
        ai_keywords: displayAIKeywords.length > 0 ? displayAIKeywords : undefined,
        interest_overlap: enhancedFactors.interest_overlap,
        hashtag_relevance: enhancedFactors.hashtag_relevance,
        group_relevance: enhancedFactors.group_content_relevance || 0,
        author_affinity: enhancedFactors.author_affinity,
        freshness: enhancedFactors.freshness_factor,
        semantic_similarity: embeddingScore
      },
      interaction_score: factors.interaction_count,
      freshness_score: factors.freshness_factor,
      relevance_score: hybridScore
    } as RecommendedPost;
  });

  // Sort by hybrid score
  hybridRecommendations.sort((a, b) => b.relevance_score! - a.relevance_score!);

  // Apply diversity penalty to avoid over-representation of single groups
  const applyDiversityPenalty = (recommendations: RecommendedPost[]) => {
    const groupCounts = new Map<number, number>();

    return recommendations.map(post => {
      if (post.group_id) {
        const count = groupCounts.get(post.group_id) || 0;
        groupCounts.set(post.group_id, count + 1);

        // Apply penalty starting from the 3rd post from same group
        if (count >= 2) {
          const penalty = Math.pow(0.80, count - 1); // 20% reduction per additional post
          const newScore = Math.round(post.recommendation_score * penalty);
          console.log(`🎲 [Diversity Penalty] Group ${post.group?.name}: post #${count + 1}, score ${post.recommendation_score} → ${newScore}`);
          return {
            ...post,
            recommendation_score: newScore,
            relevance_score: post.relevance_score! * penalty
          };
        }
      }
      return post;
    });
  };

  // Apply diversity penalty and re-sort
  let diverseRecommendations = applyDiversityPenalty(hybridRecommendations);
  diverseRecommendations.sort((a, b) => b.relevance_score! - a.relevance_score!);

  // Debug: Log final group distribution
  const finalGroupDistribution = diverseRecommendations.slice(0, 20).reduce((acc: any, post: any) => {
    const groupName = post.group?.name || 'No Group';
    acc[groupName] = (acc[groupName] || 0) + 1;
    return acc;
  }, {});
  console.log('📊 [Hybrid Recommendations] Final group distribution (top 20):', finalGroupDistribution);

  // Calculate debug statistics
  const combinedEmbeddingKeys = new Set<number>([...tasteScores.keys(), ...intentScores.keys()]);
  let embSum = 0;
  let embCount = 0;
  combinedEmbeddingKeys.forEach((id) => {
    const v = Math.max(tasteScores.get(id) || 0, intentScores.get(id) || 0);
    embSum += v;
    embCount += 1;
  });
  const avgEmbeddingScore = embCount ? (embSum / embCount) : 0;

  const debugStats = {
    taste_vector_posts: userSignals.liked_posts.length,
    embedding_search_results: embeddingSearchResults,
    rules_weight: RULES_WEIGHT,
    embedding_weight: EMBEDDING_WEIGHT,
    avg_rules_score: rulesBasedScores.reduce((sum, r) => sum + ((r.score - minRulesScore) / rulesScoreRange), 0) / rulesBasedScores.length,
    avg_embedding_score: avgEmbeddingScore,
    avg_hybrid_score: diverseRecommendations.reduce((sum, r) => sum + r.relevance_score!, 0) / diverseRecommendations.length,
    intent_embedding_used: !!intentVector,
    taste_embedding_used: !!tasteVector,
    ai_activity_vector_available: aiActivityVector !== null,
    taste_vector_available: tasteVector !== null,
    // Legacy stats for compatibility
    interest_matches: rulesBasedScores.filter(r => r.factors.interest_overlap > 0.3).length,
    group_matches: rulesBasedScores.filter(r => r.factors.group_membership).length,
    author_affinity: rulesBasedScores.filter(r => r.factors.author_affinity > 0).length,
    trending_boost: rulesBasedScores.filter(r => r.factors.freshness_factor > 0.8).length,
    query_matches: filters.q ? rulesBasedScores.filter(r => r.factors.semantic_similarity && r.factors.semantic_similarity > 0).length : 0,
    hashtag_matches: filters.hashtags ? rulesBasedScores.filter(r => r.factors.hashtag_relevance > 0.5).length : 0
  };

  console.log('🎯 [Hybrid Recommendations] Hybrid scoring completed:', {
    total_posts: candidatePosts.length,
    taste_vector_available: !!tasteVector,
    embedding_matches: combinedEmbeddingKeys.size,
    avg_hybrid_score: debugStats.avg_hybrid_score
  });

  return {
    recommendations: diverseRecommendations,
    debugStats
  };
}

// Create user taste vector from their liked posts
async function createUserTasteVector(supabase: any, likedPostIds: number[]): Promise<number[] | null> {
  if (likedPostIds.length === 0) {
    console.log('⚠️ [Taste Vector] No liked posts found for user');
    return null;
  }

  // Take the most recent 5-10 liked posts for taste vector
  const recentLikedPosts = likedPostIds.slice(0, Math.min(10, likedPostIds.length));

  try {
    // Get embeddings for liked posts
    const { data: embeddings, error } = await supabase
      .from('embeddings')
      .select('embedding_e5_small')
      .eq('content_type', 'post')
      .in('content_id', recentLikedPosts)
      .eq('has_e5_embedding', true)
      .eq('status', 'completed')
      .eq('is_deleted', false);

    if (error || !embeddings || embeddings.length === 0) {
      console.log('⚠️ [Taste Vector] No embeddings found for liked posts');
      return null;
    }

    // Calculate average vector
    const validEmbeddings = embeddings
      .map((e: any) => e.embedding_e5_small)
      .filter((emb: any) => emb && Array.isArray(emb) && emb.length === 384);

    if (validEmbeddings.length === 0) {
      console.log('⚠️ [Taste Vector] No valid embeddings found');
      return null;
    }

    // Average the embeddings to create taste vector
    const tasteVector = new Array(384).fill(0);
    validEmbeddings.forEach((embedding: any) => {
      embedding.forEach((val: number, idx: number) => {
        tasteVector[idx] += val;
      });
    });

    // Normalize by count
    tasteVector.forEach((val, idx) => {
      tasteVector[idx] = val / validEmbeddings.length;
    });

    console.log('✅ [Taste Vector] Created from', validEmbeddings.length, 'embeddings');
    return tasteVector;

  } catch (error) {
    console.error('❌ [Taste Vector] Error creating taste vector:', error);
    return null;
  }
}

// Perform semantic search using taste vector
async function performSemanticSearch(
  supabase: any,
  tasteVector: number[],
  maxResults: number = 50
): Promise<Array<{ content_id: number; similarity: number }>> {
  try {
    // Use the E5 search function with the taste vector
    const { data: results, error } = await supabase.rpc('search_embeddings_e5', {
      query_embedding: tasteVector,
      content_types: ['post'],
      match_threshold: 0.3,
      match_count: maxResults
    });

    if (error) {
      console.error('❌ [Semantic Search] Error:', error);
      return [];
    }

    return (results || []).map((r: any) => ({
      content_id: r.content_id,
      similarity: r.similarity
    }));

  } catch (error) {
    console.error('❌ [Semantic Search] Error performing search:', error);
    return [];
  }


}

// Create user AI activity vector with Redis caching
async function createUserAIActivityVector(supabase: any, userId: number): Promise<number[] | null> {
  // Redis cache logic
  const cacheKey = `user_ai_activity_vector:${userId}`;

  try {
    const cachedVector = await redis.get(cacheKey);
    if (cachedVector) {
      console.log(`✅ [AI Activity Vector] Cache hit for user ${userId}`);
      const parsed = typeof cachedVector === 'string' ? JSON.parse(cachedVector) : cachedVector;
      // Validate it's an array
      if (Array.isArray(parsed)) {
        return parsed as number[];
      }
    }
  } catch (error) {
    console.warn('⚠️ [AI Activity Vector] Redis cache read failed:', error);
    // Continue to calculate if cache fails
  }

  console.log(`🔄 [AI Activity Vector] Cache miss, calculating for user ${userId}`);

  // Calculate vector
  const vector = await calculateAIActivityVector(supabase, userId);

  // Cache result with 24 hours TTL (increased from 1 hour for better performance)
  if (vector) {
    try {
      await redis.set(cacheKey, JSON.stringify(vector), { ex: 86400 });
      console.log(`💾 [AI Activity Vector] Cached for user ${userId} (24h TTL)`);
    } catch (error) {
      console.warn('⚠️ [AI Activity Vector] Redis cache write failed:', error);
      // Continue even if caching fails
    }
  }

  return vector;
}

// Extract original calculation logic to separate function
async function calculateAIActivityVector(supabase: any, userId: number): Promise<number[] | null> {
  console.log('\n' + '🤖'.repeat(40));
  console.log(`🤖 [AI Activity Vector] Calculating for User ID: ${userId}`);
  console.log('🤖'.repeat(40));

  // 1. 获取用户在四个AI功能中的最新活动  
  console.log('\n📋 Step 1: Fetching AI activities from 4 sources...');

  const [qaSessions, mistakeBooks, courseNotes, workflowTemplates] = await Promise.all([
    // AI Quick Q&A sessions (session-level)
    supabase.from('ai_quick_qa_sessions')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3),

    // Upload & Solve mistakes    
    supabase.from('mistake_book')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Smart Notes  
    supabase.from('course_notes')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Learning Path templates  
    supabase.from('ai_workflow_templates')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3)
  ]);

  // Get Q&A messages separately (after we have session IDs)
  let qaMessages = { data: null, error: null };
  if (qaSessions.data && qaSessions.data.length > 0) {
    const sessionIds = qaSessions.data.map((s: any) => s.id);
    qaMessages = await supabase
      .from('ai_quick_qa_messages')
      .select('id, session_id, created_at')
      .eq('role', 'user')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false })
      .limit(10);
  }

  // Debug: Check for errors in queries
  console.log('\n🔍 Query Results:');
  console.log('┌─────────────────────────┬───────┬─────────┬────────────────┐');
  console.log('│ Source                  │ Count │ Status  │ IDs            │');
  console.log('├─────────────────────────┼───────┼─────────┼────────────────┤');
  console.log(`│ AI Q&A Sessions         │ ${String(qaSessions.data?.length || 0).padEnd(5)} │ ${qaSessions.error ? '❌ ERROR' : '✅ OK   '} │ ${qaSessions.data?.map((s: any) => s.id).join(', ') || 'none'} │`);
  console.log(`│ AI Q&A Messages (NEW)   │ ${String(qaMessages.data?.length || 0).padEnd(5)} │ ${qaMessages.error ? '❌ ERROR' : '✅ OK   '} │ ${qaMessages.data?.map((m: any) => m.id).join(', ') || 'none'} │`);
  console.log(`│ Mistake Book            │ ${String(mistakeBooks.data?.length || 0).padEnd(5)} │ ${mistakeBooks.error ? '❌ ERROR' : '✅ OK   '} │ ${mistakeBooks.data?.map((m: any) => m.id).join(', ') || 'none'} │`);
  console.log(`│ Course Notes            │ ${String(courseNotes.data?.length || 0).padEnd(5)} │ ${courseNotes.error ? '❌ ERROR' : '✅ OK   '} │ ${courseNotes.data?.map((n: any) => n.id).join(', ') || 'none'} │`);
  console.log(`│ Workflow Templates      │ ${String(workflowTemplates.data?.length || 0).padEnd(5)} │ ${workflowTemplates.error ? '❌ ERROR' : '✅ OK   '} │ ${workflowTemplates.data?.map((w: any) => w.id).join(', ') || 'none'} │`);
  console.log('└─────────────────────────┴───────┴─────────┴────────────────┘');

  // Log any errors
  if (qaSessions.error) console.error('❌ [AI Q&A] Error:', qaSessions.error);
  if (qaMessages.error) console.error('❌ [AI Q&A Messages] Error:', qaMessages.error);
  if (mistakeBooks.error) console.error('❌ [Mistake Book] Error:', mistakeBooks.error);
  if (courseNotes.error) console.error('❌ [Course Notes] Error:', courseNotes.error);
  if (workflowTemplates.error) {
    console.error('❌ [Workflow Templates] Error:', workflowTemplates.error);
    console.log('⚠️  Continuing without workflow templates data...');
  }

  // 2. 获取对应的embeddings (now including individual Q&A messages)
  const allIds = [
    ...(Array.isArray(qaSessions.data) ? qaSessions.data.map((s: any) => ({ type: 'ai_quick_qa_session', id: s.id })) : []),
    ...(Array.isArray(qaMessages.data) ? qaMessages.data.map((m: any) => ({ type: 'ai_qa_message', id: m.id })) : []),
    ...(Array.isArray(mistakeBooks.data) ? mistakeBooks.data.map((m: any) => ({ type: 'mistake_book', id: m.id })) : []),
    ...(Array.isArray(courseNotes.data) ? courseNotes.data.map((n: any) => ({ type: 'course_note', id: n.id })) : []),
    ...(Array.isArray(workflowTemplates.data) ? workflowTemplates.data.map((w: any) => ({ type: 'ai_workflow_template', id: w.id })) : [])
  ];


  if (allIds.length === 0) {
    console.log(`\n⚠️  [AI Activity Vector] No AI activity found for user ${userId}`);
    console.log(`   Possible reasons:`);
    console.log(`   1. User has not used any AI features yet`);
    console.log(`   2. User ID mismatch (check profile_id vs user_id)`);
    console.log(`   3. Data not synced from AI feature tables`);
    console.log('🤖'.repeat(40) + '\n');
    return null;
  }

  // 3. 聚合embedding向量 (with importance_score weighting)
  console.log(`\n📋 Step 2: Fetching embeddings for ${allIds.length} activities...`);
  console.log(`   Query: embeddings table`);
  console.log(`   Filters:`);
  console.log(`     • content_type IN (ai_quick_qa_session, ai_qa_message, mistake_book, course_note, ai_workflow_template)`);
  console.log(`     • has_e5_embedding = true`);
  console.log(`     • status = 'completed'`);

  // Build OR conditions for each content type + content_id pair
  const orConditions = allIds.map((item: any) => 
    `and(content_type.eq.${item.type},content_id.eq.${item.id})`
  ).join(',');

  const { data: embeddings, error: embeddingError } = await supabase
    .from('embeddings')
    .select('embedding_e5_small, content_type, content_id, status, has_e5_embedding, importance_score')
    .or(orConditions)
    .eq('has_e5_embedding', true)
    .eq('status', 'completed');

  if (embeddingError) {
    console.error(`\n❌ [AI Activity Vector] Error fetching embeddings for user ${userId}:`);
    console.error(`   Error:`, embeddingError);
    console.log('🤖'.repeat(40) + '\n');
    return null;
  }

  console.log(`\n✅ Embeddings Query Result: ${embeddings?.length || 0} found`);

  if (!embeddings || embeddings.length === 0) {
    console.log(`\n⚠️  [AI Activity Vector] No embeddings found for user ${userId}'s AI activities`);
    console.log(`   Diagnosis:`);
    console.log(`   • Found ${allIds.length} AI activities`);
    console.log(`   • But 0 embeddings in embeddings table`);
    console.log(`\n   Possible reasons:`);
    console.log(`   1. Embeddings not generated yet (run backfill API)`);
    console.log(`   2. Embedding status is not 'completed'`);
    console.log(`   3. has_e5_embedding flag is false`);
    console.log(`   4. content_type mismatch in embeddings table`);

    // Additional diagnostic query
    console.log(`\n🔍 Running diagnostic query...`);
    const { data: diagnosticData } = await supabase
      .from('embeddings')
      .select('content_type, content_id, status, has_e5_embedding')
      .in('content_id', allIds);

    if (diagnosticData && diagnosticData.length > 0) {
      console.log(`\n📊 Found ${diagnosticData.length} embedding records (without filters):`);
      console.log('┌──────────────────────────┬────────────┬────────────┬──────────────────┐');
      console.log('│ Content Type             │ Content ID │ Status     │ Has E5 Embedding │');
      console.log('├──────────────────────────┼────────────┼────────────┼──────────────────┤');
      diagnosticData.forEach((d: any) => {
        console.log(`│ ${String(d.content_type).padEnd(24)} │ ${String(d.content_id).padEnd(10)} │ ${String(d.status).padEnd(10)} │ ${d.has_e5_embedding ? '✅ true' : '❌ false'}         │`);
      });
      console.log('└──────────────────────────┴────────────┴────────────┴──────────────────┘');

      console.log(`\n💡 Action needed:`);
      const needsEmbedding = diagnosticData.filter((d: any) => !d.has_e5_embedding || d.status !== 'completed');
      if (needsEmbedding.length > 0) {
        console.log(`   • ${needsEmbedding.length} records need embedding generation`);
        console.log(`   • Run: POST /api/embeddings/backfill`);
      }
    } else {
      console.log(`\n❌ No embedding records found at all for these content IDs`);
      console.log(`   • This means embeddings were never created`);
      console.log(`   • Check if embedding triggers are working`);
      console.log(`   • Or run manual backfill: POST /api/embeddings/backfill`);
    }

    console.log('🤖'.repeat(40) + '\n');
    return null;
  }

  // Debug: Log embedding format details
  console.log(`\n📋 Step 3: Analyzing embedding formats...`);
  console.log('┌──────────────────────────┬────────────┬──────────────┬─────────┬────────────┬──────────────┐');
  console.log('│ Content Type             │ Content ID │ Type         │ Is Array│ Length     │ Importance   │');
  console.log('├──────────────────────────┼────────────┼──────────────┼─────────┼────────────┼──────────────┤');

  embeddings.slice(0, 5).forEach((emb: any) => {
    const embData = emb.embedding_e5_small;
    const embType = typeof embData;
    const isArray = Array.isArray(embData);
    const length = isArray ? embData.length : (embType === 'string' ? embData.length : 'N/A');
    const importance = emb.importance_score || 1.0;

    console.log(`│ ${String(emb.content_type).padEnd(24)} │ ${String(emb.content_id).padEnd(10)} │ ${embType.padEnd(12)} │ ${isArray ? '✅ Yes ' : '❌ No  '} │ ${String(length).padEnd(10)} │ ${importance.toFixed(2).padEnd(12)} │`);
  });

  if (embeddings.length > 5) {
    console.log(`│ ... and ${embeddings.length - 5} more embeddings`);
  }
  console.log('└──────────────────────────┴────────────┴──────────────┴─────────┴────────────┴──────────────┘');

  if (embeddings.length > 0) {
    const firstEmb = embeddings[0];
    console.log(`\n🔍 First embedding detailed sample:`);
    console.log(`   • Content Type: ${firstEmb.content_type}`);
    console.log(`   • Content ID: ${firstEmb.content_id}`);
    console.log(`   • Data Type: ${typeof firstEmb.embedding_e5_small}`);
    console.log(`   • Is Array: ${Array.isArray(firstEmb.embedding_e5_small)}`);

    if (Array.isArray(firstEmb.embedding_e5_small)) {
      console.log(`   • Array Length: ${firstEmb.embedding_e5_small.length}`);
      console.log(`   • First 5 values: [${firstEmb.embedding_e5_small.slice(0, 5).join(', ')}...]`);
    } else if (typeof firstEmb.embedding_e5_small === 'string') {
      console.log(`   • String Length: ${firstEmb.embedding_e5_small.length}`);
      console.log(`   • First 100 chars: ${firstEmb.embedding_e5_small.substring(0, 100)}...`);
    } else {
      console.log(`   • Value: ${firstEmb.embedding_e5_small}`);
    }
  }

  // 4. 计算加权平均向量 (using importance_score)
  console.log(`\n📋 Step 4: Calculating weighted average embedding vector...`);
  const avgVector = calculateWeightedAverageEmbedding(embeddings);

  if (avgVector) {
    console.log(`\n✅ [AI Activity Vector] Successfully created weighted vector for user ${userId}`);
    console.log(`   • Input embeddings: ${embeddings.length}`);
    console.log(`   • Output vector length: ${avgVector.length}`);
    console.log(`   • First 5 values: [${avgVector.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log(`   • Vector magnitude: ${Math.sqrt(avgVector.reduce((sum, v) => sum + v * v, 0)).toFixed(4)}`);
  } else {
    console.log(`\n❌ [AI Activity Vector] Failed to create vector for user ${userId}`);
  }

  console.log('🤖'.repeat(40) + '\n');
  return avgVector;
}

// ✨ NEW: Calculate weighted average embedding using importance_score
function calculateWeightedAverageEmbedding(embeddings: any[]): number[] | null {
  console.log(`\n🔢 [calculateWeightedAverageEmbedding] Processing ${embeddings.length} embeddings with importance weighting...`);

  if (!embeddings || embeddings.length === 0) {
    console.log('⚠️  No embeddings provided to average');
    return null;
  }

  let parsedCount = 0;
  let failedCount = 0;
  let totalImportanceWeight = 0;

  // 提取有效的embedding向量及其权重
  const validEmbeddingsWithWeights = embeddings
    .map((e: any, index: number) => {
      let emb = e.embedding_e5_small;
      const importance = e.importance_score || 1.0;

      // Handle different formats
      if (!emb) {
        console.warn(`⚠️  Embedding ${index + 1}/${embeddings.length}: null or undefined`);
        failedCount++;
        return null;
      }

      // If it's already an array, validate and return
      if (Array.isArray(emb)) {
        if (emb.length === 384) {
          parsedCount++;
          totalImportanceWeight += importance;
          return { embedding: emb, weight: importance, contentType: e.content_type };
        } else {
          console.warn(`⚠️  Embedding ${index + 1}: Array has wrong length: ${emb.length}, expected 384`);
          failedCount++;
          return null;
        }
      }

      // If it's a string (PostgreSQL vector format like "[0.1,0.2,...]"), parse it
      if (typeof emb === 'string') {
        try {
          // Remove brackets and whitespace, then split by comma
          const cleaned = emb.trim().replace(/^\[|\]$/g, '');
          const values = cleaned.split(',').map((v: string) => {
            const num = parseFloat(v.trim());
            if (isNaN(num)) {
              throw new Error(`Invalid number: ${v}`);
            }
            return num;
          });

          if (values.length === 384) {
            parsedCount++;
            totalImportanceWeight += importance;
            return { embedding: values, weight: importance, contentType: e.content_type };
          } else {
            console.warn(`⚠️  Embedding ${index + 1}: Parsed array has wrong length: ${values.length}, expected 384`);
            failedCount++;
            return null;
          }
        } catch (error) {
          console.warn(`⚠️  Embedding ${index + 1}: Failed to parse string:`, error);
          failedCount++;
          return null;
        }
      }

      // If it's an object (might be pgvector format), try to extract array
      if (typeof emb === 'object' && emb !== null) {
        // Try common property names
        const possibleArrays = [emb.data, emb.values, emb.vector, emb.embedding];
        for (const arr of possibleArrays) {
          if (Array.isArray(arr) && arr.length === 384) {
            parsedCount++;
            totalImportanceWeight += importance;
            return { embedding: arr, weight: importance, contentType: e.content_type };
          }
        }
        console.warn(`⚠️  Embedding ${index + 1}: Object format not recognized. Keys:`, Object.keys(emb));
        failedCount++;
        return null;
      }

      console.warn(`⚠️  Embedding ${index + 1}: Unknown format: ${typeof emb}`);
      failedCount++;
      return null;
    })
    .filter((item: any) => item !== null);

  console.log(`\n📊 Parsing Results:`);
  console.log(`   • Total embeddings: ${embeddings.length}`);
  console.log(`   • Successfully parsed: ${parsedCount} ✅`);
  console.log(`   • Failed to parse: ${failedCount} ❌`);
  console.log(`   • Valid embeddings: ${validEmbeddingsWithWeights.length}`);
  console.log(`   • Total importance weight: ${totalImportanceWeight.toFixed(2)}`);

  // Log weight distribution by content type
  const weightByType: Record<string, { count: number; totalWeight: number }> = {};
  validEmbeddingsWithWeights.forEach((item: any) => {
    if (!weightByType[item.contentType]) {
      weightByType[item.contentType] = { count: 0, totalWeight: 0 };
    }
    weightByType[item.contentType].count++;
    weightByType[item.contentType].totalWeight += item.weight;
  });

  console.log(`\n📊 Weight Distribution by Content Type:`);
  Object.entries(weightByType).forEach(([type, stats]) => {
    const avgWeight = stats.totalWeight / stats.count;
    const percentage = (stats.totalWeight / totalImportanceWeight * 100).toFixed(1);
    console.log(`   • ${type}: ${stats.count} items, avg weight ${avgWeight.toFixed(2)}, ${percentage}% of total`);
  });

  if (validEmbeddingsWithWeights.length === 0) {
    console.log('⚠️ [AI Activity Vector] No valid 384-dim embeddings found');
    return null;
  }

  // 计算加权平均向量
  const weightedAverageVector = new Array(384).fill(0);
  validEmbeddingsWithWeights.forEach((item: any) => {
    item.embedding.forEach((val: number, idx: number) => {
      weightedAverageVector[idx] += val * item.weight;
    });
  });

  // 标准化：除以总权重
  weightedAverageVector.forEach((val, idx) => {
    weightedAverageVector[idx] = val / totalImportanceWeight;
  });

  console.log(`✅ [AI Activity Vector] Successfully calculated weighted average vector from ${validEmbeddingsWithWeights.length} embeddings`);
  console.log(`   • Weighting method: importance_score based`);
  console.log(`   • Total weight: ${totalImportanceWeight.toFixed(2)}`);
  console.log(`   • Average weight per embedding: ${(totalImportanceWeight / validEmbeddingsWithWeights.length).toFixed(2)}`);
  
  return weightedAverageVector;
}

// Keep the old function for backward compatibility
function calculateAverageEmbedding(embeddings: any[]): number[] | null {
  console.log(`\n🔢 [calculateAverageEmbedding] Processing ${embeddings.length} embeddings...`);

  if (!embeddings || embeddings.length === 0) {
    console.log('⚠️  No embeddings provided to average');
    return null;
  }

  let parsedCount = 0;
  let failedCount = 0;

  // 提取有效的embedding向量  
  const validEmbeddings = embeddings
    .map((e: any, index: number) => {
      let emb = e.embedding_e5_small;

      // Handle different formats
      if (!emb) {
        console.warn(`⚠️  Embedding ${index + 1}/${embeddings.length}: null or undefined`);
        failedCount++;
        return null;
      }

      // If it's already an array, validate and return
      if (Array.isArray(emb)) {
        if (emb.length === 384) {
          parsedCount++;
          return emb;
        } else {
          console.warn(`⚠️  Embedding ${index + 1}: Array has wrong length: ${emb.length}, expected 384`);
          failedCount++;
          return null;
        }
      }

      // If it's a string (PostgreSQL vector format like "[0.1,0.2,...]"), parse it
      if (typeof emb === 'string') {
        try {
          // Remove brackets and whitespace, then split by comma
          const cleaned = emb.trim().replace(/^\[|\]$/g, '');
          const values = cleaned.split(',').map((v: string) => {
            const num = parseFloat(v.trim());
            if (isNaN(num)) {
              throw new Error(`Invalid number: ${v}`);
            }
            return num;
          });

          if (values.length === 384) {
            parsedCount++;
            return values;
          } else {
            console.warn(`⚠️  Embedding ${index + 1}: Parsed array has wrong length: ${values.length}, expected 384`);
            failedCount++;
            return null;
          }
        } catch (error) {
          console.warn(`⚠️  Embedding ${index + 1}: Failed to parse string:`, error);
          failedCount++;
          return null;
        }
      }

      // If it's an object (might be pgvector format), try to extract array
      if (typeof emb === 'object' && emb !== null) {
        // Try common property names
        const possibleArrays = [emb.data, emb.values, emb.vector, emb.embedding];
        for (const arr of possibleArrays) {
          if (Array.isArray(arr) && arr.length === 384) {
            parsedCount++;
            return arr;
          }
        }
        console.warn(`⚠️  Embedding ${index + 1}: Object format not recognized. Keys:`, Object.keys(emb));
        failedCount++;
        return null;
      }

      console.warn(`⚠️  Embedding ${index + 1}: Unknown format: ${typeof emb}`);
      failedCount++;
      return null;
    })
    .filter((emb: any) => emb !== null);

  console.log(`\n📊 Parsing Results:`);
  console.log(`   • Total embeddings: ${embeddings.length}`);
  console.log(`   • Successfully parsed: ${parsedCount} ✅`);
  console.log(`   • Failed to parse: ${failedCount} ❌`);
  console.log(`   • Valid embeddings: ${validEmbeddings.length}`);

  if (validEmbeddings.length === 0) {
    console.log('⚠️ [AI Activity Vector] No valid 384-dim embeddings found');
    return null;
  }

  // 计算平均向量  
  const averageVector = new Array(384).fill(0);
  validEmbeddings.forEach((embedding: any) => {
    embedding.forEach((val: number, idx: number) => {
      averageVector[idx] += val;
    });
  });

  // 标准化：除以向量数量  
  averageVector.forEach((val, idx) => {
    averageVector[idx] = val / validEmbeddings.length;
  });

  console.log(`✅ [AI Activity Vector] Successfully calculated average vector from ${validEmbeddings.length} embeddings`);
  return averageVector;
}


// Calculate cosine similarity between two vectors
function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    console.error(`❌ [Cosine Similarity] Vector length mismatch: ${vectorA.length} vs ${vectorB.length}`);
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    console.warn(`⚠️  [Cosine Similarity] Zero magnitude vector detected`);
    return 0;
  }

  const similarity = dotProduct / (magnitudeA * magnitudeB);

  // Cosine similarity should be between -1 and 1, but for embeddings it's typically 0 to 1
  return Math.max(0, Math.min(1, similarity));
}


// Extract keywords from post for matching with AI activities
function extractKeywordsFromPost(post: any): string[] {
  const keywords: string[] = [];

  // Extract from title
  if (post.title) {
    const titleWords = post.title
      .toLowerCase()
      .split(/\s+/)
      .filter((word: string) => word.length > 3); // Only words longer than 3 chars
    keywords.push(...titleWords);
  }

  // Extract from hashtags
  if (post.post_hashtags && Array.isArray(post.post_hashtags)) {
    const hashtags = post.post_hashtags
      .map((ph: any) => ph.hashtags?.name)
      .filter(Boolean);
    keywords.push(...hashtags);
  }

  // Extract from body (first 100 words)
  if (post.body) {
    const bodyWords = post.body
      .toLowerCase()
      .split(/\s+/)
      .slice(0, 100)
      .filter((word: string) => word.length > 4); // Only words longer than 4 chars
    keywords.push(...bodyWords.slice(0, 20)); // Limit to 20 words
  }

  return [...new Set(keywords)]; // Remove duplicates
}


// Extract keywords from user's AI activities
async function extractAIActivityKeywords(supabase: any, userId: number): Promise<string[]> {
  const keywords: Set<string> = new Set();

  try {
    console.log(`🔍 [extractAIActivityKeywords] Extracting keywords for user ${userId}`);

    // Get recent AI Q&A messages (user questions) - 直接从 messages 表获取
    const { data: qaMessages, error: qaError } = await supabase
      .from('ai_quick_qa_messages')
      .select(`
        content,
        session_id,
        ai_quick_qa_sessions!inner(user_id)
      `)
      .eq('ai_quick_qa_sessions.user_id', userId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(30);

    console.log(`  ├─ AI Q&A messages: ${qaMessages?.length || 0} found`, qaError ? `(error: ${qaError.message})` : '');

    // Extract keywords from user questions
    qaMessages?.forEach((message: any) => {
      if (message.content) {
        const words = message.content
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 3 && !isCommonWord(word));
        words.slice(0, 10).forEach((word: string) => keywords.add(word)); // 每条消息取前 10 个词
      }
    });

    // Get recent mistake book entries - 获取title和subject
    const { data: mistakes, error: mistakeError } = await supabase
      .from('mistake_book')
      .select('title, subject, question_text')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`  ├─ Mistake book entries: ${mistakes?.length || 0} found`, mistakeError ? `(error: ${mistakeError.message})` : '');

    mistakes?.forEach((mistake: any) => {
      if (mistake.title) {
        const words = mistake.title
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 3 && !isCommonWord(word));
        words.slice(0, 3).forEach((word: string) => keywords.add(word));
      }
      if (mistake.subject) {
        keywords.add(mistake.subject.toLowerCase());
      }
      if (mistake.question_text) {
        const words = mistake.question_text
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 3 && !isCommonWord(word));
        words.slice(0, 3).forEach((word: string) => keywords.add(word));
      }
    });

    // Get recent course notes - 获取title和tags
    const { data: notes, error: notesError } = await supabase
      .from('course_notes')
      .select('title, tags, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    console.log(`  ├─ Course notes: ${notes?.length || 0} found`, notesError ? `(error: ${notesError.message})` : '');

    // Filter out auto-generated error notes
    const validNotes = notes?.filter((note: any) => {
      // Skip notes with error messages
      if (note.content?.includes('Content analysis failed') || 
          note.content?.includes('Provider returned error') ||
          note.content?.includes('429') ||
          note.content?.includes('rate limit')) {
        console.log(`  │  ⚠️  Skipping error note: ${note.title}`);
        return false;
      }
      // Skip notes with only ai_generated tag and no real content
      if (note.tags?.includes('ai_generated') && 
          (!note.content || note.content.length < 50)) {
        console.log(`  │  ⚠️  Skipping auto-generated note with no content: ${note.title}`);
        return false;
      }
      return true;
    }) || [];

    console.log(`  ├─ Valid notes (after filtering): ${validNotes.length}`);

    validNotes?.forEach((note: any) => {
      if (note.title) {
        const words = note.title
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 3 && !isCommonWord(word));
        words.slice(0, 3).forEach((word: string) => keywords.add(word));
      }
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach((tag: string) => keywords.add(tag.toLowerCase()));
      }
      // Extract from content (first 50 words)
      if (note.content) {
        const words = note.content
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 4 && !isCommonWord(word));
        words.slice(0, 5).forEach((word: string) => keywords.add(word));
      }
    });

    // Get AI workflow templates - 获取name和description
    const { data: workflows, error: workflowError } = await supabase
      .from('ai_workflow_templates')
      .select('name, description')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`  ├─ AI workflow templates: ${workflows?.length || 0} found`, workflowError ? `(error: ${workflowError.message})` : '');

    workflows?.forEach((workflow: any) => {
      if (workflow.name) {
        const words = workflow.name
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 3 && !isCommonWord(word));
        words.slice(0, 3).forEach((word: string) => keywords.add(word));
      }
      if (workflow.description) {
        const words = workflow.description
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 4 && !isCommonWord(word));
        words.slice(0, 3).forEach((word: string) => keywords.add(word));
      }
    });

    const finalKeywords = Array.from(keywords).slice(0, 30); // Increase to 30 keywords
    console.log(`  └─ Total keywords extracted: ${finalKeywords.length}`, finalKeywords.slice(0, 10));

    return finalKeywords;
  } catch (error) {
    console.error('Error extracting AI activity keywords:', error);
    return [];
  }
}

// Check if a word is too common to be useful as a keyword
function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how',
    'this', 'that', 'these', 'those', 'the', 'and', 'but', 'for', 'with',
    'from', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own',
    'same', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now',
    'have', 'has', 'had', 'having', 'does', 'did', 'doing', 'would', 'could',
    'ought', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their',
    'what', 'which', 'who', 'whom', 'this', 'that', 'am', 'is', 'are', 'was',
    'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could'
  ]);
  return commonWords.has(word.toLowerCase());
}
