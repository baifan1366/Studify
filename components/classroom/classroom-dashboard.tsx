'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
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
  Play
} from 'lucide-react';
import { useClassrooms, useLiveSessions } from '@/hooks/classroom/use-create-live-session';
import { useClassroomMembers } from '@/hooks/classroom/use-update-classroom-member';
import { useAssignments } from '@/hooks/classroom/use-assignments';
import { ChatTabs } from './tabs/chat-tabs';

const LiveClassroom = dynamic(() => import('@/components/classroom/live-session/live-classroom'));
import { Assignment as AssignmentInterface } from '@/interface/classroom/asg-interface';
import { Quiz } from '@/interface/classroom/quiz-interface';
import { Assignment as HookAssignment } from '@/hooks/classroom/use-assignments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger as OriginalTabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MembersTab } from './tabs/members-tab';
import { LiveSessionTab } from './tabs/live-session-tab';
import { AssignmentsTab } from './tabs/assignments-tab';
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
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSession, setActiveSession] = useState<any>(null);
  
  // useRef for scroll behavior and DOM manipulation
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const lastActiveTabRef = useRef<string>("overview");

  // Fetch classroom data
  const { data: classroomsData, isLoading: isClassroomLoading } = useClassrooms();
  const { data: membersData, isLoading: isMembersLoading } = useClassroomMembers(classroomSlug);
  const { data: liveSessionsData, isLoading: isLiveSessionsLoading } = useLiveSessions(classroomSlug);
  const { data: assignmentsData, isLoading: isAssignmentsLoading } = useAssignments(classroomSlug, 'upcoming');

  // Type the assignments data properly using hook's Assignment type
  const typedAssignments: HookAssignment[] = assignmentsData || [];
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
  
  // useEffect for classroom data validation
  useEffect(() => {
    if (classroom && typedAssignments.length > 0) {
      // Validate assignments using the interface
      const validAssignments = typedAssignments.filter(assignment => {
        // Convert HookAssignment to AssignmentInterface format for validation
        const interfaceAssignment: AssignmentInterface = {
          id: parseInt(assignment.id),
          public_id: assignment.id,
          course_id: 1, // Default course ID
          title: assignment.title,
          description: assignment.description,
          due_at: new Date(assignment.due_on),
          is_deleted: false,
          created_at: new Date(),
          updated_at: new Date()
        };
        return validateAssignmentInterface(interfaceAssignment);
      });
      
      if (validAssignments.length !== typedAssignments.length) {
        console.warn(`${typedAssignments.length - validAssignments.length} invalid assignments found`);
      }
    }
  }, [classroom, typedAssignments]);

  const handleCopyClassCode = () => {
    if (classroom?.class_code) {
      navigator.clipboard.writeText(classroom.class_code);
      toast({
        title: "Copied!",
        description: "Class code copied to clipboard",
      });
    }
  };

  const navigateToSection = (section: string) => {
    router.push(`/classroom/${classroomSlug}/${section}`);
  };

  const handleJoinSession = async (session: any) => {
    console.log('🚀 [Dashboard] handleJoinSession called with session:', session);
    
    try {
      // Construct session identifier with proper validation
      const sessionIdentifier = session?.public_id 
        ?? session?.slug 
        ?? (session?.id?.toString() ?? 'unknown');
      
      console.log('🆔 [Dashboard] Session identifier:', sessionIdentifier);

      if (sessionIdentifier === 'unknown') {
        toast({
          title: "Invalid Session",
          description: "Session has no valid identifier",
          variant: "destructive"
        });
        return;
      }

      // Basic status validation
      if (session.status === 'cancelled') {
        toast({
          title: "Session Cancelled",
          description: "This session has been cancelled.",
          variant: "destructive"
        });
        return;
      }

      // Show joining toast
      toast({
        title: "Joining Session",
        description: `Redirecting to "${session.title}"...`,
      });

      // Redirect to live session room URL
      const roomUrl = `/classroom/${classroomSlug}/live/${sessionIdentifier}`;
      console.log('🔗 [Dashboard] Redirecting to room URL:', roomUrl);
      router.push(roomUrl);
      
    } catch (error) {
      console.error('❌ [Dashboard] Error in handleJoinSession:', error);
      toast({
        title: "Failed to Join",
        description: "Unable to join the session. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLeaveSession = () => {
    setActiveSession(null);
    toast({
      title: "Left Session",
      description: "You have left the live session.",
    });
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

  const upcomingSessions = liveSessionsData?.sessions?.filter(s => s.status === 'scheduled') || [];
  const liveSessions = liveSessionsData?.sessions?.filter(s => s.status === 'live') || [];
  
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
              {classroom.description || 'No description provided'}
            </p>
            <div className="flex items-center gap-4 mt-4">
              <Badge variant={classroom.visibility === 'public' ? 'default' : 'secondary'}>
                {classroom.visibility}
              </Badge>
              <Badge variant="outline">{classroom.user_role}</Badge>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">{membersData?.members?.length || 0} members</span>
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
                Class Code: {classroom.class_code}
              </Button>
              <Button variant="outline" onClick={() => navigateToSection('members')}>
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </div>
          )}
        </div>
      </div>



{/* Live Sessions Alert */}
{liveSessions.length > 0 && (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ 
      opacity: 1, 
      scale: [0.98, 1.02, 0.98],
    }}
    transition={{ 
      duration: 0.3,
      scale: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }
    }}
    className="mb-6 relative"
  >
    {/* Intensified Ripple Animation Container */}
    <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
      <motion.div
        className="absolute inset-0 bg-green-500/30 rounded-lg"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.4, 0.05, 0.4],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute inset-0 bg-green-500/20 rounded-lg"
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.3, 0.02, 0.3],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3,
        }}
      />
      <motion.div
        className="absolute inset-0 bg-green-500/15 rounded-lg"
        animate={{
          scale: [1, 1.35, 1],
          opacity: [0.2, 0.01, 0.2],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.6,
        }}
      />
    </div>
    
    {/* Main Card Content with Border Ripples */}
    <Card
      className="relative z-10 border-green-200 shadow-lg overflow-hidden"
      style={{
        backgroundColor: cardStyling.backgroundColor,
        borderColor: cardStyling.borderColor
      }}
    >
      {/* Card Border Ripple Effects */}
      <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
        <motion.div
          className="absolute inset-0 border-2 border-green-400/40 rounded-lg"
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.6, 0.2, 0.6],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute inset-0 border-2 border-green-300/30 rounded-lg"
          animate={{
            scale: [1, 1.04, 1],
            opacity: [0.4, 0.1, 0.4],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2,
          }}
        />
        <motion.div
          className="absolute inset-0 border border-green-200/20 rounded-lg"
          animate={{
            scale: [1, 1.06, 1],
            opacity: [0.3, 0.05, 0.3],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4,
          }}
        />
      </div>
      <CardHeader>
        <CardTitle
          className="flex items-center gap-2"
          style={{ fontWeight: 'bold', color: 'green' }}
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Video className="h-5 w-5" />
          </motion.div>
          Live Session Active
          
          {/* Pulsing dot indicator */}
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full ml-2"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0.6, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative z-20">
        {liveSessions.map((session, index) => (
          <div
            key={session.id}
            className="flex justify-between items-center relative z-30"
          >
            <div>
              <p className="font-medium">{session.title}</p>
              <p className="text-sm text-muted-foreground">
                Started at {new Date(session.starts_at).toLocaleTimeString()}
              </p>
            </div>
            <Button 
              onClick={() => handleJoinSession(session)}
              variant="default"
              disabled={false}
              className="relative z-40 pointer-events-auto"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Join Session (Debug)
            </Button>
          </div>
        ))}
      </CardContent>
      </Card>
    </motion.div>
)}

      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="space-y-6">
        <div ref={tabsContainerRef}>
          <div className="relative">
          <TabsList className="relative border-b border-gray-100/10 bg-transparent p-0 h-auto w-full justify-start">
            <AnimatedTabsTrigger 
              value="overview" 
              isActive={activeTab === 'overview'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary"
            >
              Overview
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger 
              value="recent" 
              isActive={activeTab === 'recent'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary"
            >
              Recent Activity
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger 
              value="members" 
              isActive={activeTab === 'members'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary"
            >
              Members
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger 
              value="live-sessions" 
              isActive={activeTab === 'live-sessions'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary"
            >
              Live Sessions
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger 
              value="assignments" 
              isActive={activeTab === 'assignments'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary"
            >
              Assignments
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger 
              value="quizzes" 
              isActive={activeTab === 'quizzes'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary"
            >
              Quizzes
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger 
              value="chat" 
              isActive={activeTab === 'chat'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary"
            >
              Chat
            </AnimatedTabsTrigger>
          </TabsList>
        </div>

        <AnimatedTabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
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
                <CardTitle className="text-sm font-medium">Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{membersData?.members?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active members
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigateToSection('live')}
              style={{
                backgroundColor: cardStyling.backgroundColor,
                borderColor: cardStyling.borderColor
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Live Sessions</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingSessions.length}</div>
                <p className="text-xs text-muted-foreground">
                  Upcoming sessions
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
                <CardTitle className="text-sm font-medium">Assignments</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{typedAssignments.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active assignments
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
                <CardTitle className="text-sm font-medium">Quizzes</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sampleQuizzes.length}</div>
                <p className="text-xs text-muted-foreground">
                  Available quizzes
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="py-4"></div>
          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Upcoming Sessions */}
            <Card 
              style={{
                backgroundColor: cardStyling.backgroundColor,
                borderColor: cardStyling.borderColor
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Upcoming Sessions</CardTitle>
                  <CardDescription>Scheduled live sessions</CardDescription>
                </div>
                {isOwnerOrTutor && (
                  <Button size="sm" onClick={() => navigateToSection('live')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {upcomingSessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No upcoming sessions
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingSessions.slice(0, 3).map(session => (
                      <div key={session.id} className="flex justify-between bg-gray-100/5 hover:bg-gray-200/8 items-center p-3 rounded-lg">
                        <div>
                          <p className="font-medium">{session.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.starts_at).toLocaleDateString()} at{' '}
                            {new Date(session.starts_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge variant="outline">Scheduled</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Assignments */}
            <Card 
              style={{
                backgroundColor: cardStyling.backgroundColor,
                borderColor: cardStyling.borderColor
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Assignments</CardTitle>
                  <CardDescription>Latest classroom assignments</CardDescription>
                </div>
                {isOwnerOrTutor && (
                  <Button size="sm" onClick={() => navigateToSection('assignment')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {!typedAssignments?.length ? (
                  <p className="text-muted-foreground text-center py-4">
                    No assignments yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {typedAssignments.slice(0, 3).map((assignment: HookAssignment) => (
                      <div key={assignment.id} className="flex justify-between items-center p-3 bg-gray-100/5 hover:bg-gray-200/8  rounded-lg">
                        <div>
                          <p className="font-medium">{assignment.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(assignment.due_on).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">Active</Badge>
                      </div>
                    ))}
                  </div>
                )}
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

        <AnimatedTabsContent value="live-sessions" className="space-y-6">
          <LiveSessionTab 
            liveSessionsData={liveSessionsData}
            isOwnerOrTutor={isOwnerOrTutor}
            classroomSlug={classroomSlug}
            navigateToSection={navigateToSection}
            router={router}
            classroom={classroom}
          />
        </AnimatedTabsContent>

        <AnimatedTabsContent value="assignments" className="space-y-6">
          <AssignmentsTab 
            assignmentsData={assignmentsData}
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
            currentUserId={membersData?.members?.find(m => m.is_current_user)?.user_id || 'unknown'}
            currentUserName={membersData?.members?.find(m => m.is_current_user)?.name || 'Unknown User'}
            isOpen={true}
            onToggle={() => {}}
            className="relative w-full h-[600px] border-0 shadow-none bg-transparent"
            classroom={classroom}
          />
        </AnimatedTabsContent>

        <AnimatedTabsContent value="recent" className="space-y-6">
          <Card 
            style={{
              backgroundColor: cardStyling.backgroundColor,
              borderColor: cardStyling.borderColor
            }}
          >
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest classroom activities and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Activity feed coming soon...
              </p>
            </CardContent>
          </Card>
        </AnimatedTabsContent>
        </div>
      </Tabs>
    </div>
  );
}