'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@/hooks/use-user';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import AnimatedBackground from '@/components/ui/animated-background';
import { useTranslations } from 'next-intl';

// 导入各个标签页组件（稍后实现）
import { PostsTab } from './tabs/posts-tab';
import { ChatTab } from './tabs/chat-tab';
import { AssignmentsTab } from './tabs/assignments-tab';
import { MembersTab } from './tabs/members-tab';
import { DocsTab } from './tabs/docs-tab';

// 导入课程详情hook（稍后实现）
import { useClassroomDetail } from '@/hooks/use-classroom-detail';

export function ClassroomDetailPage({ classroomId }: { classroomId: string }) {
  const { data: user } = useUser();
  const t = useTranslations('ClassroomDetailPage');
  const { toast } = useToast();
  
  // 侧边栏状态
  const [activeMenuItem, setActiveMenuItem] = useState('classroom');
  const [isPermanentlyExpanded, setSidebarExpanded] = useState(false);
  const [sidebarExpanded, setSidebarState] = useState(false);
  
  // 标签页状态
  const [activeTab, setActiveTab] = useState('posts');
  
  // 获取课程详情
  const { data: classroom, isLoading } = useClassroomDetail(classroomId);
  
  // 处理菜单项点击
  const handleMenuItemClick = (item: string) => {
    setActiveMenuItem(item);
  };
  
  // 处理菜单切换
  const handleMenuToggle = () => {
    setSidebarState(!sidebarExpanded);
  };
  
  // 处理头部操作
  const handleHeaderAction = (action: string) => {
    if (action === 'profile') {
      // 处理个人资料点击
    }
  };
  
  return (
    <AnimatedBackground>
      {/* 头部 */}
      <ClassroomHeader
        title={classroom?.title || t('loading')}
        userName={user?.email?.split('@')[0] || t('default_user_name')}
        onProfileClick={() => handleHeaderAction('profile')}
        sidebarExpanded={isPermanentlyExpanded}
        onMenuToggle={handleMenuToggle}
      />
      
      {/* 侧边栏 */}
      <AnimatedSidebar
        activeItem={activeMenuItem}
        onItemClick={handleMenuItemClick}
        onExpansionChange={setSidebarExpanded}
        isPermanentlyExpanded={isPermanentlyExpanded}
      />
      
      {/* 主内容区域 */}
      <motion.div
        className="relative z-10 mt-16 p-6 h-full overflow-y-auto"
        style={{
          marginLeft: sidebarExpanded ? '280px' : '80px',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: `calc(100vw - ${sidebarExpanded ? '280px' : '80px'})`
        }}
      >
        {/* 课程内容 */}
        <motion.div
          className="relative z-10 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
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
                <h1 className="text-2xl font-bold text-white/90 mb-2 dark:text-white/90">
                  {classroom?.title}
                </h1>
                <p className="text-white/70 dark:text-white/70">
                  {classroom?.description}
                </p>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
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
      </motion.div>
    </AnimatedBackground>
  );
}