"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase/client";
import {
  usePopularPosts,
  useSearchPosts,
} from "@/hooks/community/use-community";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Search } from "lucide-react";
import Link from "next/link";
import PostCard from "./post-card";
import CommunitySidebar from "./community-sidebar";
import CompactRecommendations from "./recommendations/compact-recommendations";
import AISummaryCard from "./ai-summary-card";
import { useUser } from "@/hooks/profile/use-user";

export default function CommunityContent() {
  const t = useTranslations("CommunityContent");
  const th = useTranslations("Header");
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  
  // Debounce the query to avoid excessive API calls
  const debouncedQuery = useDebouncedValue(query, 500);
  
  // Determine user role for routing
  const { data: currentUser } = useUser();
  const isTutor = currentUser?.profile?.role === 'tutor';
  const createGroupPath = isTutor ? '/tutor/community/create' : '/community/create';

  // Fetch user for header
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 数据来源：热门 or 搜索
  const {
    posts: popularPosts,
    isLoading: isPopularLoading,
    isError: isPopularError,
    error: popularError,
  } = usePopularPosts();

  const {
    posts: searchPosts,
    isLoading: isSearchLoading,
    isError: isSearchError,
    error: searchError,
  } = useSearchPosts(debouncedQuery);

  const posts = debouncedQuery.trim().length > 0 ? searchPosts : popularPosts;
  const isLoading =
    debouncedQuery.trim().length > 0 ? isSearchLoading : isPopularLoading;
  const isError = debouncedQuery.trim().length > 0 ? isSearchError : isPopularError;
  const error = debouncedQuery.trim().length > 0 ? searchError : popularError;

  // Derive search intent for recommendations (extract hashtags and keyword)
  const { qForRec, hashtagsForRec } = useMemo(() => {
    const hashtagMatches = debouncedQuery.match(/#([A-Za-z0-9_]+)/g) || [];
    const hashtags = Array.from(
      new Set(
        hashtagMatches.map((t) => t.slice(1).toLowerCase())
      )
    );
    const q = debouncedQuery.replace(/#([A-Za-z0-9_]+)/g, "").trim();
    return {
      qForRec: q.length ? q : undefined,
      hashtagsForRec: hashtags.length ? hashtags : undefined,
    };
  }, [debouncedQuery]);

  // Top result IDs for AI summary (use public_id if available)
  const topIds = useMemo(
    () => (posts || []).slice(0, 8).map((p: any) => p.public_id ?? p.id),
    [posts]
  );

  return (
    <>
        <div className="flex h-full">
          {/* Main Feed */}
          <div className="flex-1 min-w-0 p-6 overflow-y-auto max-w-4xl mx-auto">
            <div className="max-w-full">
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  {debouncedQuery.trim().length > 0 ? (
                    <Search className="w-8 h-8 text-green-400" />
                  ) : (
                    <TrendingUp className="w-8 h-8 text-blue-400" />
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-white">
                      {debouncedQuery.trim().length > 0
                        ? t('search_results')
                        : t('community_feed_title')}
                    </h1>
                    <p className="text-gray-400">
                      {debouncedQuery.trim().length > 0
                        ? t('posts_matching_search')
                        : t('discover_popular_posts')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Post & Hashtag Search Bar */}
              <div className="w-full mb-8">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* AI Summary (based on current search results) */}
              {debouncedQuery.trim().length > 0 && (
                <AISummaryCard query={debouncedQuery} resultIds={topIds} locale="en" />
              )}

              {/* Recommendations Section (driven by current search intent) */}
              <CompactRecommendations limit={3} q={qForRec} hashtags={hashtagsForRec} />

              {/* Posts Feed */}
              {isLoading && (
                <div className="space-y-6">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-48 w-full rounded-xl bg-white/10"
                    />
                  ))}
                </div>
              )}

              {isError && (
                <div className="text-center py-12">
                  <p className="text-red-400 mb-4">Failed to load posts</p>
                  <p className="text-gray-400">{error?.message}</p>
                </div>
              )}

              {!isLoading && !isError && posts && posts.length > 0 && (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}

              {!isLoading && !isError && (!posts || posts.length === 0) && (
                <div className="text-center py-12">
                  <div className="bg-white/5 rounded-xl p-8 border border-white/10">
                    <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {debouncedQuery.trim().length > 0
                        ? t('no_results_found')
                        : t('no_posts_yet')}
                    </h3>
                    <p className="text-gray-400 mb-6">
                      {debouncedQuery.trim().length > 0
                        ? t('try_different_keywords')
                        : t('be_first_to_share')}
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Link href={createGroupPath}>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Plus className="w-4 h-4 mr-2" />
                          {debouncedQuery.trim().length > 0
                            ? t('create_post')
                            : t('create_group')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-96 flex-shrink-0 p-6 border-l border-white/10 overflow-y-auto">
            <CommunitySidebar />
          </div>
        </div>
    </>
  );
}
