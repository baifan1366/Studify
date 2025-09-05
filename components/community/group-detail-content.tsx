'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase/client';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import { useGroup, useGroupPosts, useGroupMembers } from '@/hooks/community/use-community';
import PostCard from '@/components/community/post-card';
import { NewPostForm } from '@/components/community/new-post-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import { Users, Lock, Globe, Plus, Settings, UserPlus, UserMinus, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface GroupDetailContentProps {
  groupSlug: string;
}

export default function GroupDetailContent({ groupSlug }: GroupDetailContentProps) {
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

  const { group, isLoading: groupLoading, isError: groupError, error: groupErrorMessage } = useGroup(groupSlug);
  const { posts, isLoading: postsLoading, isError: postsError, createPost, isCreatingPost, createPostError } = useGroupPosts(groupSlug);
  const { members, joinGroup, isJoining, leaveGroup, isLeaving } = useGroupMembers(groupSlug);

  const handleCreatePost = ({ title, body, files }: { title: string; body: string; files: File[] }) => {
    createPost({ title, body, files });
  };

  const handleJoinGroup = () => {
    joinGroup();
  };

  const handleLeaveGroup = () => {
    leaveGroup();
  };

  const handleMenuToggle = () => {
    setIsPermanentlyExpanded(!isPermanentlyExpanded);
    setSidebarExpanded(!isPermanentlyExpanded);
  };

  // Handle access denied for private groups
  if (groupError && groupErrorMessage?.message.includes('Access denied')) {
    return (
      <>
        <ClassroomHeader
          title="Community"
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
            <div className="text-center py-12">
              <Lock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-4">Private Group</h1>
              <p className="text-gray-400 mb-6">This is a private group. You need to join to view its content.</p>
              
              {group && (
                <Card className="bg-white/5 border-white/10 max-w-md mx-auto mb-6">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 justify-center">
                      <Lock className="w-5 h-5 text-yellow-400" />
                      {group.name}
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-center">
                      {group.description || 'No description available'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {group.member_count || 0} members
                      </div>
                    </div>
                    <Button 
                      onClick={handleJoinGroup}
                      disabled={isJoining}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {isJoining ? 'Joining...' : 'Request to Join'}
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              <Link href="/community">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Back to Community
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <ClassroomHeader
        title={group?.name || 'Loading...'}
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
          {groupLoading && (
            <div className="space-y-6">
              <Skeleton className="h-32 w-full rounded-lg bg-white/10" />
              <Skeleton className="h-24 w-full rounded-lg bg-white/10" />
              <Skeleton className="h-48 w-full rounded-lg bg-white/10" />
            </div>
          )}

          {groupError && !groupErrorMessage?.message.includes('Access denied') && (
            <Alert className="border-red-400 bg-red-400/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                Failed to load group: {groupErrorMessage?.message}
              </AlertDescription>
            </Alert>
          )}

          {group && (
            <>
              {/* Group Header */}
              <Card className="bg-white/5 border-white/10 mb-6">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white flex items-center gap-2 text-2xl">
                        {group.visibility === 'private' ? (
                          <Lock className="w-6 h-6 text-yellow-400" />
                        ) : (
                          <Globe className="w-6 h-6 text-green-400" />
                        )}
                        {group.name}
                      </CardTitle>
                      <CardDescription className="text-gray-300 mt-2 text-base">
                        {group.description || 'No description available'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={group.visibility === 'private' ? 'secondary' : 'default'}>
                        {group.visibility}
                      </Badge>
                      {group.user_membership?.role === 'owner' && (
                        <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                          <Settings className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {group.member_count || 0} members
                      </div>
                      <div>
                        {group.post_count || 0} posts
                      </div>
                      {group.owner && (
                        <div>
                          Owner: {group.owner.display_name}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {group.user_membership ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-green-400 text-green-400">
                            {group.user_membership.role}
                          </Badge>
                          {group.user_membership.role !== 'owner' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={handleLeaveGroup}
                              disabled={isLeaving}
                              className="border-red-400 text-red-400 hover:bg-red-400/10"
                            >
                              <UserMinus className="w-4 h-4 mr-1" />
                              {isLeaving ? 'Leaving...' : 'Leave'}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={handleJoinGroup}
                          disabled={isJoining}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          {isJoining ? 'Joining...' : 'Join Group'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* New Post Form - only for members */}
              {group.user_membership && (
                <div className="mb-8">
                  <NewPostForm onSubmit={handleCreatePost} isLoading={isCreatingPost} />
                  {createPostError && (
                    <Alert className="border-red-400 bg-red-400/10 mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-red-400">
                        Failed to create post: {createPostError.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Posts */}
              {postsLoading && (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full rounded-lg bg-white/10" />
                  <Skeleton className="h-32 w-full rounded-lg bg-white/10" />
                  <Skeleton className="h-32 w-full rounded-lg bg-white/10" />
                </div>
              )}

              {postsError && (
                <Alert className="border-red-400 bg-red-400/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-400">
                    Failed to load posts. Please try again.
                  </AlertDescription>
                </Alert>
              )}

              {!postsLoading && !postsError && (
                <div className="space-y-4">
                  {posts && posts.length > 0 ? (
                    posts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-400 mb-4">No posts yet</p>
                      {group.user_membership && (
                        <p className="text-gray-500">Be the first to start a discussion!</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}
