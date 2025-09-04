'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@/hooks/profile/use-user';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import AnimatedSidebar from '@/components/sidebar';
import AnimatedBackground from '@/components/ui/animated-background';
import { useTranslations } from 'next-intl';
import { MSidebar } from './list-bar';

// Tabs
import { PostsTab } from './tabs/posts-tab';
import { ChatTab } from './tabs/chat-tab';
import { AssignmentsTab } from './tabs/assignments-tab';
import { MembersTab } from './tabs/members-tab';
import { DocsTab } from './tabs/docs-tab';

// Hooks
import { useClassroomDetail } from '@/hooks/classroom/use-classroom-detail';

export function ClassroomDetailPage({ classroomId }: { classroomId: string }) {
  const { data: user } = useUser();
  const t = useTranslations('ClassroomDetailPage');
  const { toast } = useToast();

  const [activeMenuItem, setActiveMenuItem] = useState('classroom');
  const [isPermanentlyExpanded, setSidebarExpanded] = useState(false);
  const [sidebarExpanded, setSidebarState] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [activeChannel, setActiveChannel] = useState('General');

  const { data: classroom, isLoading } = useClassroomDetail(classroomId);

  return (
    <AnimatedBackground className="min-h-screen flex">
      {/* 左侧主导航 */}
      <AnimatedSidebar
        activeItem={activeMenuItem}
        onItemClick={setActiveMenuItem}
        onExpansionChange={setSidebarState}
        isPermanentlyExpanded={isPermanentlyExpanded}
      />

      {/* 中间侧栏 */}
      <MSidebar
        onSelectChannel={setActiveChannel}
        activeChannel={activeChannel}
      />

      {/* 主内容 */}
      <motion.div
        className="flex-1 px-6 py-4 relative min-h-screen z-10 overflow-y-auto flex flex-col"
      >
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="h-12">
              <Skeleton className="h-full w-full" />
            </div>
            <div className="h-64">
              <Skeleton className="h-full w-full" />
            </div>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white/90 mb-2">{classroom?.title}</h1>
              <p className="text-white/70">{classroom?.description}</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList className="flex space-x-6 border-b border-gray-700">
                <TabsTrigger value="posts">{t('tabs.posts')}</TabsTrigger>
                <TabsTrigger value="chat">{t('tabs.chat')}</TabsTrigger>
                <TabsTrigger value="assignments">{t('tabs.assignments')}</TabsTrigger>
                <TabsTrigger value="members">{t('tabs.members')}</TabsTrigger>
                <TabsTrigger value="docs">{t('tabs.docs')}</TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="mt-6">
                <PostsTab classroomId={classroomId} />
              </TabsContent>
              <TabsContent value="chat" className="mt-6">
                <ChatTab classroomId={classroomId} />
              </TabsContent>
              <TabsContent value="assignments" className="mt-6">
                <AssignmentsTab classroomId={classroomId} />
              </TabsContent>
              <TabsContent value="members" className="mt-6">
                <MembersTab classroomId={classroomId} />
              </TabsContent>
              <TabsContent value="docs" className="mt-6">
                <DocsTab classroomId={classroomId} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </motion.div>
    </AnimatedBackground>
  );
}
