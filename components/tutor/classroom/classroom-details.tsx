'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  BookOpen, 
  FileText, 
  Brain, 
  Video, 
  Settings, 
  Copy,
  ExternalLink,
  Plus,
  Play,
  MessageSquare,
  Blocks,
  FolderOpen
} from 'lucide-react';
import { useClassrooms, useClassroomMembers } from '@/hooks/tutor-classroom/use-classroom';
import { ChatTabs } from './tabs/chat-tabs';
import { Assignment as AssignmentInterface } from '@/interface/classroom/asg-interface';
import { Quiz } from '@/interface/classroom/quiz-interface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger as OriginalTabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MembersTab } from './tabs/members-tab';
import { QuizTab } from './tabs/quiz-tab';
import { getCardStyling, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';

interface ClassroomDashboardProps {
  classroomSlug: string;
}

// Animated TabsTrigger component with moving border
const AnimatedTabsTrigger = ({ children, value, className = "", isActive = false, ...props }: any) => {
  return (
    <OriginalTabsTrigger
      value={value}
      className={`relative overflow-hidden border-b-2 border-transparent transition-colors duration-200 ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {isActive && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
          layoutId="activeTabBorder"
          initial={false}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            duration: 0.3
          }}
        />
      )}
    </OriginalTabsTrigger>
  );
};

// Animated TabsContent component
const AnimatedTabsContent = ({ children, value, className = "", ...props }: any) => {
  return (
    <TabsContent
      value={value}
      className={className}
      {...props}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </TabsContent>
  );
};

export default function ClassroomDashboard({ classroomSlug }: ClassroomDashboardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('TutorClassroom');
  const [activeTab, setActiveTab] = useState("overview");  
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const lastActiveTabRef = useRef<string>("overview");
  const { data: classroomsData, isLoading: isClassroomLoading } = useClassrooms();
  const { data: membersData, isLoading: isMembersLoading } = useClassroomMembers(classroomSlug);
  const sampleQuizzes: Quiz[] = []; // Placeholder for future quiz data
  
  // Example usage of AssignmentInterface for type checking
  const validateAssignmentInterface = (assignment: AssignmentInterface) => {
    return assignment.id && assignment.title;
  };
  
  // useEffect for tab change tracking and scroll behavior
  useEffect(() => {
    if (activeTab !== lastActiveTabRef.current) {
      // Scroll to top when tab changes
      if (tabsContainerRef.current) {
        tabsContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      // Track tab analytics or perform cleanup
      console.log(`Tab changed from ${lastActiveTabRef.current} to ${activeTab}`);
      lastActiveTabRef.current = activeTab;
    }
  }, [activeTab]);
  
  // Find the specific classroom from the list
  const classroom = classroomsData?.classrooms?.find(c => c.slug === classroomSlug);

  const handleCopyClassCode = () => {
    if (classroom?.class_code) {
      navigator.clipboard.writeText(classroom.class_code);
      toast({
        title: t('copied'),
        description: t('class_code_copied'),
      });
    }
  };

  const navigateToSection = (section: string) => {
    router.push(`/tutor/classroom/${classroomSlug}/${section}`);
  };

  if (!classroom) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  const isOwnerOrTutor = ['owner', 'tutor'].includes(classroom.user_role);
  
  // Get classroom color styling
  const classroomColor = ((classroom as any)?.color && CLASSROOM_COLORS.includes((classroom as any).color as ClassroomColor)) 
    ? (classroom as any).color as ClassroomColor 
    : '#6aa84f';
  
  const cardStyling = getCardStyling(classroomColor as ClassroomColor, 'light');

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{classroom.name}</h1>
            <p className="text-muted-foreground mt-1">
              {classroom.description || t('no_description_provided')}
            </p>
            <div className="flex items-center gap-4 mt-4">
              <Badge variant={classroom.visibility === 'public' ? 'default' : 'secondary'}>
                {classroom.visibility}
              </Badge>
              <Badge variant="outline">{classroom.user_role}</Badge>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">{(() => {
                  const members = Array.isArray(membersData) ? membersData : membersData?.members || [];
                  return members.length;
                })() || 0} {t('members')}</span>
              </div>
            </div>
          </div>
          {isOwnerOrTutor && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCopyClassCode}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                {t('class_code')}: {classroom.class_code}
              </Button>
              <Button variant="outline" onClick={() => navigateToSection('members')}>
                <Settings className="h-4 w-4 mr-2" />
                {t('manage')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="space-y-6">
        <div ref={tabsContainerRef}>
          <div className="relative">
          <TabsList className="relative border-b border-gray-100/10 bg-transparent p-0 h-auto w-full justify-start">
            <AnimatedTabsTrigger //overview
              value="overview" 
              isActive={activeTab === 'overview'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary"
            >
              {t('overview')}
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger //members
              value="members" 
              isActive={activeTab === 'members'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary"
            >
              {t('members')}
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger //quizzes
              value="quizzes" 
              isActive={activeTab === 'quizzes'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary"
            >
              {t('quizzes')}
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger  //chat
              value="chat" 
              isActive={activeTab === 'chat'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary"
            >
              {t('chat')}
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger  //liveblock
              value="liveblock" 
              isActive={activeTab === 'liveblock'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary"
            >
              {t('liveblock')}
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger  //documents
              value="documents" 
              isActive={activeTab === 'documents'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary"
            >
              {t('documents')}
            </AnimatedTabsTrigger>
          </TabsList>
        </div>

        <AnimatedTabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigateToSection('members')}
              style={{
                backgroundColor: cardStyling.backgroundColor,
                borderColor: cardStyling.borderColor
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('members')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(() => {
                  const members = Array.isArray(membersData) ? membersData : membersData?.members || [];
                  return members.length;
                })() || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t('active_members')}
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigateToSection('assignment')}
              style={{
                backgroundColor: cardStyling.backgroundColor,
                borderColor: cardStyling.borderColor
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('assignments')}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  {t('active_documents')}
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigateToSection('quiz')}
              style={{
                backgroundColor: cardStyling.backgroundColor,
                borderColor: cardStyling.borderColor
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('quizzes')}</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sampleQuizzes.length}</div>
                <p className="text-xs text-muted-foreground">
                  {t('available_quizzes')}
                </p>
              </CardContent>
            </Card>
          </div>
        </AnimatedTabsContent>

        <AnimatedTabsContent value="members" className="space-y-6">
          <MembersTab 
            membersData={membersData}
            isOwnerOrTutor={isOwnerOrTutor}
            classroomSlug={classroomSlug}
            navigateToSection={navigateToSection}
            classroom={classroom}
          />
        </AnimatedTabsContent>

        <AnimatedTabsContent value="quizzes" className="space-y-6">
          <QuizTab 
            isOwnerOrTutor={isOwnerOrTutor}
            classroomSlug={classroomSlug}
            navigateToSection={navigateToSection}
            classroom={classroom}
          />
        </AnimatedTabsContent>

        <AnimatedTabsContent value="chat" className="space-y-6">
          <ChatTabs
            classroomSlug={classroomSlug}
            currentUserId={(() => {
              const members = Array.isArray(membersData) ? membersData : membersData?.members || [];
              return members.find(m => m.is_current_user)?.user_id || 
                     members.find(m => m.is_current_user)?.id || 'unknown';
            })()}
            currentUserName={(() => {
              const members = Array.isArray(membersData) ? membersData : membersData?.members || [];
              const currentUser = members.find(m => m.is_current_user);
              return currentUser?.name || currentUser?.display_name || 'Unknown User';
            })()}
            isOpen={true}
            onToggle={() => {}}
            className="relative w-full h-[600px] border-0 shadow-none bg-transparent"
            classroom={classroom}
          />
        </AnimatedTabsContent>

        <AnimatedTabsContent value="liveblock" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Blocks className="h-5 w-5" />
                {t('liveblock_collaboration')}
              </CardTitle>
              <CardDescription>
                {t('liveblock_description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Blocks className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">{t('liveblock_coming_soon')}</h3>
                <p className="text-sm max-w-md mx-auto">
                  {t('liveblock_features_description')}
                </p>
                {isOwnerOrTutor && (
                  <Button variant="outline" className="mt-4" disabled>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('configure_liveblock')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </AnimatedTabsContent>

        <AnimatedTabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                {t('document_library')}
              </CardTitle>
              <CardDescription>
                {t('document_library_description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">{t('document_management_coming_soon')}</h3>
                <p className="text-sm max-w-md mx-auto">
                  {t('document_features_description')}
                </p>
                {isOwnerOrTutor && (
                  <Button variant="outline" className="mt-4" disabled>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('upload_documents')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </AnimatedTabsContent>
        </div>
      </Tabs>
    </div>
  );
}