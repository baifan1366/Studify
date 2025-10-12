import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import { generateEmbedding } from '@/lib/langChain/embedding';
import { 
  CommunityRecommendations, 
  RecommendedPost, 
  UserActivitySignals, 
  PostScoringFactors,
  RecommendationFilters 
} from '@/interface/community/recommendation-interface';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('🚀 [Community Recommendations API] Starting hybrid recommendation generation');
  
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
      since: searchParams.get('since') || undefined,
      groups_only: searchParams.get('groupsOnly') === 'true',
      exclude_own_posts: searchParams.get('excludeOwnPosts') !== 'false', // default true
      min_score: parseFloat(searchParams.get('minScore') || '0'),
      q: searchParams.get('q') || undefined,
      hashtags: hashtagsParam ? hashtagsParam.split(',').map(h => h.trim()).filter(Boolean) : undefined
    };
    
    console.log('📋 [Community Recommendations API] Filters:', filters);

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

          return NextResponse.json({
            recommendations: hybridResults.recommendations.slice(0, filters.limit),
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

    return NextResponse.json({
      recommendations: hybridResults.recommendations.slice(0, filters.limit),
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
    interests: parsedInterests
  };

  console.log('📈 [collectUserActivitySignals] Collected signals:', {
    liked_posts_count: signals.liked_posts.length,
    commented_posts_count: signals.commented_posts.length,
    authored_posts_count: signals.authored_posts.length,
    frequent_authors_count: signals.frequent_authors.length,
    joined_groups_count: signals.joined_groups.length,
    used_hashtags_count: signals.used_hashtags.length,
    interests_count: signals.interests.length
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
  console.log('🎣 [getCandidatePosts] Fetching candidate posts');

  let query = supabase
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
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(200); // Get more candidates for better filtering

  // Apply time filter
  if (filters.since) {
    query = query.gte('created_at', filters.since);
  }

  // Exclude own posts if requested
  if (filters.exclude_own_posts) {
    query = query.neq('author_id', profileId);
  }

  const { data: posts, error } = await query;

  if (error) {
    console.error('❌ [getCandidatePosts] Query error:', error);
    return [];
  }

  const postList = posts || [];

  // Fetch related authors, groups, and hashtags
  const authorIds = Array.from(new Set(postList.map((p: any) => p.author_id).filter(Boolean)));
  const groupIds = Array.from(new Set(postList.map((p: any) => p.group_id).filter(Boolean)));
  const publicIds = Array.from(new Set(postList.map((p: any) => p.public_id).filter(Boolean)));

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
  const enrichedPosts = postList.map((p: any) => ({
    ...p,
    profiles: authorMap.get(p.author_id) || null,
    community_group: groupMap.get(p.group_id) || null,
    post_hashtags: (hashtagsMap.get(p.public_id) || []).map((r: any) => ({ hashtags: r.hashtags }))
  }));

  // Apply keyword and hashtag filters if present
  let filtered = enrichedPosts;
  if (filters.q) {
    const q = filters.q.toLowerCase();
    filtered = filtered.filter((post: any) => {
      const inTitle = (post.title || '').toLowerCase().includes(q);
      const inBody = (post.body || '').toLowerCase().includes(q);
      const inTags = (post.post_hashtags || []).some((ph: any) => (ph.hashtags?.name || '').toLowerCase().includes(q));
      return inTitle || inBody || inTags;
    });
  }
  if (filters.hashtags && filters.hashtags.length > 0) {
    const wanted = filters.hashtags.map(h => h.toLowerCase());
    filtered = filtered.filter((post: any) => {
      const tags = (post.post_hashtags || []).map((ph: any) => (ph.hashtags?.name || '').toLowerCase());
      return tags.some((t: string) => wanted.includes(t));
    });
  }

  // Filter by visibility (public groups or user's groups)
  const visiblePosts = filtered.filter((post: any) => {
    if (!post.group_id) return true; // Posts without group are visible
    const group = post.community_group;
    if (!group) return false;
    if (group.visibility === 'public') return true;
    // Check if user is member of private group
    return userSignals.joined_groups.includes(post.group_id);
  });

  // If groups_only filter is enabled, only return posts from user's groups
  if (filters.groups_only) {
    return visiblePosts.filter((post: any) => 
      post.group_id && userSignals.joined_groups.includes(post.group_id)
    );
  }

  console.log(`✅ [getCandidatePosts] Filtered to ${visiblePosts.length} visible posts`);
  return visiblePosts;
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

function calculateScoringFactors(post: any, userSignals: UserActivitySignals, filters: RecommendationFilters): PostScoringFactors {
  // Interest overlap (标签和兴趣匹配)
  const postHashtags = (post.post_hashtags || []).map((ph: any) => ph.hashtags?.name).filter(Boolean);
  const interestOverlap = calculateInterestOverlap(postHashtags, post.body, userSignals.interests, userSignals.used_hashtags);

  // Group membership
  const groupMembership = post.group_id ? userSignals.joined_groups.includes(post.group_id) : false;

  // Author affinity
  const authorAffinity = userSignals.frequent_authors.includes(post.author_id) ? 1 : 0;

  // Hashtag relevance
  const hashtagRelevance = calculateHashtagRelevance(postHashtags, userSignals.used_hashtags);

  // Interaction count (mock - would need actual data)
  const interactionCount = Math.random() * 20; // TODO: Replace with actual reaction/comment counts

  // Freshness factor
  const postAge = Date.now() - new Date(post.created_at).getTime();
  const daysSincePost = postAge / (1000 * 60 * 60 * 24);
  const freshnessFactor = Math.exp(-daysSincePost / 7); // 7-day half-life

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

  return {
    interest_overlap: interestOverlap,
    group_membership: groupMembership,
    author_affinity: authorAffinity,
    hashtag_relevance: hashtagRelevance,
    interaction_count: interactionCount,
    freshness_factor: freshnessFactor,
    semantic_similarity: Math.min(1, semanticSimilarity)
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
    interest_overlap: 25,
    group_membership: 20,
    author_affinity: 15,
    hashtag_relevance: 15,
    freshness_factor: 10,
    semantic_similarity: 15
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

  if (factors.interest_overlap > 0.3) {
    const matchingInterests = userSignals.interests.filter(interest => {
      const il = interest.toLowerCase();
      return post.body?.toLowerCase().includes(il) || (post.title || '').toLowerCase().includes(il);
    });
    if (matchingInterests.length > 0) {
      reasons.push(`Your interests match："${matchingInterests.slice(0, 2).join(', ')}"`);
    }
  }

  if (factors.group_membership) {
    reasons.push(`From groups you are in："${post.community_group?.name}"`);
  }

  if (factors.author_affinity > 0) {
    reasons.push(`You interact with this author："${post.profiles?.display_name}"`);
  }

  if (factors.hashtag_relevance > 0.5) {
    const postHashtags = (post.post_hashtags || []).map((ph: any) => ph.hashtags?.name).filter(Boolean);
    const matchingTags = postHashtags.filter((tag: any) => 
      userSignals.used_hashtags.some(userTag => userTag.toLowerCase() === tag.toLowerCase())
    );
    if (matchingTags.length > 0) {
      reasons.push(`Hashtags match：#${matchingTags.slice(0, 2).join(' #')}`);
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

  // Fallback reason
  if (reasons.length === 0) {
    reasons.push('Recommended quality content for you');
  }

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

  // Step 4: Get embedding-based scores from taste and/or intent vectors
  const tasteScores: Map<number, number> = new Map();
  const intentScores: Map<number, number> = new Map();
  let embeddingSearchResults = 0;

  if (tasteVector) {
    console.log('🧠 [Hybrid Recommendations] Using taste vector for semantic search');
    const tasteResults = await performSemanticSearch(supabase, tasteVector, candidatePosts.length * 2);
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

  // Step 6: Calculate hybrid scores (60% rules + 40% embedding)
  const RULES_WEIGHT = 0.6;
  const EMBEDDING_WEIGHT = 0.4;
  
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
      recommendation_score: Math.round(hybridScore * 100),
      recommendation_reasons: reasons,
      interaction_score: factors.interaction_count,
      freshness_score: factors.freshness_factor,
      relevance_score: hybridScore
    } as RecommendedPost;
  });

  // Sort by hybrid score
  hybridRecommendations.sort((a, b) => b.relevance_score! - a.relevance_score!);

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
    avg_hybrid_score: hybridRecommendations.reduce((sum, r) => sum + r.relevance_score!, 0) / hybridRecommendations.length,
    intent_embedding_used: !!intentVector,
    taste_embedding_used: !!tasteVector,
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
    recommendations: hybridRecommendations,
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
