'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase/client';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import { usePopularPosts } from '@/hooks/community/use-community';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import PostCard from './post-card';
import CommunitySidebar from './community-sidebar';

export default function CommunityContent() {
  const t = useTranslations('CommunityContent');
  const th = useTranslations('Header');
  const [user, setUser] = useState<User | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPermanentlyExpanded, setIsPermanentlyExpanded] = useState(false);

  // Fetch user for header
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const { posts, isLoading, isError, error } = usePopularPosts();

  const handleMenuToggle = () => {
    setIsPermanentlyExpanded(!isPermanentlyExpanded);
    setSidebarExpanded(!isPermanentlyExpanded);
  };

  return (
    <>
      <ClassroomHeader
        title={t('community_header_title')}
        userName={user?.email?.split('@')[0] || th('default_user_name')}
        sidebarExpanded={isPermanentlyExpanded}
        onMenuToggle={handleMenuToggle}
      />

      <AnimatedSidebar
        activeItem="community"
        onExpansionChange={setSidebarExpanded}
        isPermanentlyExpanded={isPermanentlyExpanded}
      />

      <motion.div
        className="relative z-10 mt-16 h-full overflow-hidden"
        style={{
          marginLeft: sidebarExpanded ? '280px' : '80px',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: `calc(100vw - ${sidebarExpanded ? '280px' : '80px'})`
        }}
      >
        <div className="flex h-full">
          {/* Main Feed */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                  <div>
                    <h1 className="text-3xl font-bold text-white">Community Feed</h1>
                    <p className="text-gray-400">Discover popular posts from all groups</p>
                  </div>
                </div>
                <Link href="/community/create">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Post
                  </Button>
                </Link>
              </div>

              {/* Posts Feed */}
              {isLoading && (
                <div className="space-y-6">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full rounded-xl bg-white/10" />
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
                    <h3 className="text-xl font-semibold text-white mb-2">No posts yet</h3>
                    <p className="text-gray-400 mb-6">Be the first to share something with the community!</p>
                    <div className="flex gap-3 justify-center">
                      <Link href="/community/create">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Group
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex-shrink-0 p-6 border-l border-white/10 overflow-y-auto">
            <CommunitySidebar />
          </div>
        </div>
      </motion.div>
    </>
  );
}
