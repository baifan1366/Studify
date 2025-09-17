"use client";

import React, { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase/client";
import {
  usePopularPosts,
  useSearchPosts,
} from "@/hooks/community/use-community";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Search } from "lucide-react";
import Link from "next/link";
import PostCard from "./post-card";
import CommunitySidebar from "./community-sidebar";

export default function CommunityContent() {
  const t = useTranslations("CommunityContent");
  const th = useTranslations("Header");
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");

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
  } = useSearchPosts(query);

  const posts = query.trim().length > 0 ? searchPosts : popularPosts;
  const isLoading =
    query.trim().length > 0 ? isSearchLoading : isPopularLoading;
  const isError = query.trim().length > 0 ? isSearchError : isPopularError;
  const error = query.trim().length > 0 ? searchError : popularError;

  return (
    <>
        <div className="flex h-full">
          {/* Main Feed */}
          <div className="flex-1 min-w-0 p-6 overflow-y-auto max-w-4xl mx-auto">
            <div className="max-w-full">
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  {query.trim().length > 0 ? (
                    <Search className="w-8 h-8 text-green-400" />
                  ) : (
                    <TrendingUp className="w-8 h-8 text-blue-400" />
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-white">
                      {query.trim().length > 0
                        ? "Search Results"
                        : "Community Feed"}
                    </h1>
                    <p className="text-gray-400">
                      {query.trim().length > 0
                        ? "Posts matching your search"
                        : "Discover popular posts from all groups"}
                    </p>
                  </div>
                </div>
                <Link href="/community/create">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Post
                  </Button>
                </Link>
              </div>

              {/* Post & Hashtag Search Bar */}
              <div className="w-full mb-8">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search posts or hashtags..."
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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
                      {query.trim().length > 0
                        ? "No results found"
                        : "No posts yet"}
                    </h3>
                    <p className="text-gray-400 mb-6">
                      {query.trim().length > 0
                        ? "Try searching with different keywords or hashtags."
                        : "Be the first to share something with the community!"}
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Link href="/community/create">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Plus className="w-4 h-4 mr-2" />
                          {query.trim().length > 0
                            ? "Create Post"
                            : "Create Group"}
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
