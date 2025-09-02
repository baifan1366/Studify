'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase/client';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import { useCommunity } from '@/hooks/community/use-community';
import PostCard from '@/components/community/post-card';
import { NewPostForm } from '@/components/community/new-post-form';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';

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

  const { posts, isLoading, isError, addPost, isAddingPost } = useCommunity();

  const handleCreatePost = ({ title, body }: { title: string; body: string }) => {
    addPost({ title, body });
  };

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
        className="relative z-10 mt-16 p-6 h-full overflow-y-auto"
        style={{
          marginLeft: sidebarExpanded ? '280px' : '80px',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: `calc(100vw - ${sidebarExpanded ? '280px' : '80px'})`
        }}
      >
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-8">{t('community_feed_title')}</h1>
            
            <div className="mb-8">
                <NewPostForm onSubmit={handleCreatePost} isLoading={isAddingPost} />
            </div>

            {isLoading && (
                <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-lg bg-white/10" />
                <Skeleton className="h-32 w-full rounded-lg bg-white/10" />
                <Skeleton className="h-32 w-full rounded-lg bg-white/10" />
                </div>
            )}

            {isError && <p className="text-white">{t('error_loading_posts')}</p>}

            {!isLoading && !isError && (
                <div className="space-y-4">
                {posts?.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))}
                </div>
            )}
        </div>
      </motion.div>
    </>
  );
}
