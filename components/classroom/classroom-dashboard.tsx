'use client';
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
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
  UserPlus,
  CheckCircle,
  Clock,
  MessageSquare,
  Edit,
  Trash
} from 'lucide-react';
import { useClassrooms, useLiveSessions, useUpdateLiveSession } from '@/hooks/classroom/use-create-live-session';
import { useClassroomMembers } from '@/hooks/classroom/use-update-classroom-member';
import { useClassroomAssignments, ClassroomAssignment } from '@/hooks/classroom/use-classroom-assignments';
import { ChatTabs } from './tabs/chat-tabs';
import { useUser } from '@/hooks/profile/use-user'

const LiveClassroom = dynamic(() => import('@/components/classroom/live-session/live-classroom'));
import { Assignment as AssignmentInterface } from '@/interface/classroom/asg-interface';
import { Quiz } from '@/interface/classroom/quiz-interface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger as OriginalTabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MembersTab } from './tabs/members-tab';
import { LiveSessionTab } from './tabs/live-session-tab';
import { AssignmentsTab } from './tabs/assignments-tab';
import { QuizTab } from './tabs/quiz-tab';
import { getCardStyling, getClassroomColor, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';

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
  const t = useTranslations('ClassroomDashboard');
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Get current user data to check role
  const { data: currentUser } = useUser();
  
  // useRef for scroll behavior and DOM manipulation
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const lastActiveTabRef = useRef<string>("overview");

  // Fetch classroom data
  const { data: classroomsData, isLoading: isClassroomLoading } = useClassrooms();
  const { data: membersData, isLoading: isMembersLoading } = useClassroomMembers(classroomSlug);
  
  // Debug members data
  useEffect(() => {
    console.log('🔍 ClassroomDashboard - Members data:', {
      membersData,
      isLoading: isMembersLoading,
      isArray: Array.isArray(membersData),
      hasMembers: !!membersData?.members,
      actualMembers: Array.isArray(membersData) ? membersData : membersData?.members || []
    });
  }, [membersData, isMembersLoading]);
  const { data: liveSessionsData, isLoading: isLiveSessionsLoading } = useLiveSessions(classroomSlug);
  const { data: assignmentsResponse, isLoading: isAssignmentsLoading } = useClassroomAssignments(classroomSlug, 'upcoming');
  const updateSessionMutation = useUpdateLiveSession();
  
  // Track processed sessions to avoid duplicate updates
  const processedSessionsRef = useRef<Set<string>>(new Set());

  // Type the assignments data properly using hook's Assignment type
  const typedAssignments: ClassroomAssignment[] = assignmentsResponse?.assignments || [];
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
  
  // Debug: Log classroom data to verify color
  useEffect(() => {
    if (classroom) {
      console.log('🎨 [Dashboard] Classroom data:', {
        slug: classroom.slug,
        name: classroom.name,
        color: classroom.color,
        hasColor: !!classroom.color,
        rawClassroom: classroom
      });
    }
  }, [classroom]);
  
  // Manage classroom form state
  const [manageFormData, setManageFormData] = useState({
    name: classroom?.name || '',
    description: classroom?.description || '',
    color: (classroom as any)?.color || CLASSROOM_COLORS[0],
  });

  // Update form data when classroom data loads
  useEffect(() => {
    if (classroom) {
      setManageFormData({
        name: classroom.name || '',
        description: classroom.description || '',
        color: (classroom as any)?.color || CLASSROOM_COLORS[0],
      });
    }
  }, [classroom]);
  
  // useEffect for classroom data validation
  useEffect(() => {
    if (classroom && typedAssignments.length > 0) {
      // Validate assignments using the interface
      const validAssignments = typedAssignments.filter(assignment => {
        // Convert ClassroomAssignment to AssignmentInterface format for validation
        const interfaceAssignment: AssignmentInterface = {
          id: assignment.id,
          classroom_id: 1, // Default classroom ID
          author_id: 1, // Default author ID
          title: assignment.title,
          description: assignment.description || '',
          due_date: assignment.due_date,
          created_at: new Date().toISOString(),
          slug: assignment.title.toLowerCase().replace(/\s+/g, '-')
        };
        return validateAssignmentInterface(interfaceAssignment);
      });
      
      if (validAssignments.length !== typedAssignments.length) {
        console.warn(`${typedAssignments.length - validAssignments.length} invalid assignments found`);
      }
    }
  }, [classroom, typedAssignments]);

  // useEffect to check and update expired live sessions
  useEffect(() => {
    if (!liveSessionsData?.sessions || !classroomSlug) return;

    const checkExpiredSessions = async () => {
      const now = new Date();
      const expiredSessions = liveSessionsData.sessions.filter((session: any) => {
        const sessionKey = `expired-${session.id}`;
        
        // Skip if already processed
        if (processedSessionsRef.current.has(sessionKey)) {
          return false;
        }
        
        // Check if session is live or scheduled but has ended
        if (session.status === 'live' || session.status === 'scheduled') {
          const endsAt = session.ends_at ? new Date(session.ends_at) : null;
          const startsAt = new Date(session.starts_at);
          
          // If session has an end time and it's past
          if (endsAt && endsAt < now) {
            return true;
          }
          
          // If session is live but has no end time, check if it started more than 24 hours ago
          if (session.status === 'live' && !endsAt) {
            const hoursSinceStart = (now.getTime() - startsAt.getTime()) / (1000 * 60 * 60);
            if (hoursSinceStart > 24) {
              return true;
            }
          }
        }
        return false;
      });

      // Update expired sessions
      for (const session of expiredSessions) {
        const sessionKey = `expired-${session.id}`;
        try {
          console.log(`🕐 Updating expired session: ${session.id} (${session.title})`);
          processedSessionsRef.current.add(sessionKey);
          
          await updateSessionMutation.mutateAsync({
            classroomSlug,
            session_id: session.id,
            status: 'ended'
          });
        } catch (error) {
          console.error(`Failed to update expired session ${session.id}:`, error);
          // Remove from processed on error so it can be retried
          processedSessionsRef.current.delete(sessionKey);
        }
      }
    };

    // Check immediately
    checkExpiredSessions();

    // Check every 5 minutes
    const interval = setInterval(checkExpiredSessions, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [classroomSlug]);

  // useEffect to auto-start scheduled sessions when they reach start time
  useEffect(() => {
    if (!liveSessionsData?.sessions || !classroomSlug) return;

    const checkScheduledSessions = async () => {
      const now = new Date();
      const sessionsToStart = liveSessionsData.sessions.filter((session: any) => {
        const sessionKey = `started-${session.id}`;
        
        // Skip if already processed
        if (processedSessionsRef.current.has(sessionKey)) {
          return false;
        }
        
        // Check if session is scheduled and start time has arrived
        if (session.status === 'scheduled') {
          const startsAt = new Date(session.starts_at);
          // Start if current time is past or within 1 minute of start time
          return startsAt <= now;
        }
        return false;
      });

      // Update scheduled sessions to live
      for (const session of sessionsToStart) {
        const sessionKey = `started-${session.id}`;
        try {
          console.log(`🎬 Auto-starting session: ${session.id} (${session.title})`);
          processedSessionsRef.current.add(sessionKey);
          
          await updateSessionMutation.mutateAsync({
            classroomSlug,
            session_id: session.id,
            status: 'live'
          });
        } catch (error) {
          console.error(`Failed to auto-start session ${session.id}:`, error);
          // Remove from processed on error so it can be retried
          processedSessionsRef.current.delete(sessionKey);
        }
      }
    };

    // Check immediately
    checkScheduledSessions();

    // Check every minute
    const interval = setInterval(checkScheduledSessions, 60 * 1000);

    return () => clearInterval(interval);
  }, [classroomSlug]);

  const handleCopyClassCode = () => {
    if (classroom?.class_code) {
      navigator.clipboard.writeText(classroom.class_code);
      toast({
        title: t('copied'),
        description: t('class_code_copied'),
      });
    }
  };

  // Handle opening manage dialog
  const handleOpenManageDialog = () => {
    setIsManageDialogOpen(true);
  };

  // Handle saving classroom changes
  const handleSaveClassroom = async () => {
    if (!classroom) return;

    try {
      console.log('🔄 Updating classroom:', {
        slug: classroomSlug,
        data: manageFormData
      });

      const response = await fetch(`/api/classroom/${classroomSlug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: manageFormData.name,
          description: manageFormData.description,
          color: manageFormData.color,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update classroom');
      }

      console.log('✅ Classroom updated:', data);
      
      toast({
        title: "Success",
        description: "Classroom updated successfully",
      });
      
      setIsManageDialogOpen(false);
      
      // Invalidate queries to refresh data without full page reload
      // Note: We need to import QueryClient for this
      window.location.reload(); // For now, use full reload until we add QueryClient
    } catch (error: any) {
      console.error('❌ Error updating classroom:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update classroom",
        variant: "destructive",
      });
    }
  };

  // Handle deleting classroom
  const handleDeleteClassroom = async () => {
    if (!classroom) return;

    try {
      console.log('🗑️ Deleting classroom:', {
        slug: classroomSlug,
        id: classroom.id
      });

      const response = await fetch(`/api/classroom/${classroomSlug}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete classroom');
      }

      console.log('✅ Classroom deleted:', data);
      
      toast({
        title: "Success",
        description: "Classroom deleted successfully",
      });
      
      setIsDeleteConfirmOpen(false);
      
      // Redirect to classroom list
      const isTutor = currentUser?.profile?.role === 'tutor';
      const route = isTutor ? '/tutor/classroom' : '/classroom';
      router.push(route);
    } catch (error: any) {
      console.error('❌ Error deleting classroom:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete classroom",
        variant: "destructive",
      });
    }
  };

  // Generate recent activities from various data sources
  const generateRecentActivities = () => {
    const activities: Array<{
      id: string;
      type: 'member' | 'session' | 'assignment' | 'quiz';
      icon: any;
      title: string;
      description: string;
      timestamp: Date;
      user?: string;
      status?: string;
    }> = [];

    // Add member activities
    if (membersData) {
      const members = Array.isArray(membersData) ? membersData : membersData?.members || [];
      members.slice(0, 5).forEach((member: any) => {
        if (member.joined_at) {
          activities.push({
            id: `member-${member.id}`,
            type: 'member',
            icon: UserPlus,
            title: 'New member joined',
            description: `${member.user?.name || member.user?.email || 'A user'} joined the classroom`,
            timestamp: new Date(member.joined_at),
            user: member.user?.name || member.user?.email,
            status: member.role
          });
        }
      });
    }

    // Add live session activities
    if (liveSessionsData?.sessions) {
      liveSessionsData.sessions.slice(0, 5).forEach((session: any) => {
        activities.push({
          id: `session-${session.id}`,
          type: 'session',
          icon: Video,
          title: session.status === 'live' ? 'Live session started' : 
                 session.status === 'scheduled' ? 'Live session scheduled' : 
                 'Live session ended',
          description: session.title,
          timestamp: new Date(session.starts_at || session.created_at),
          status: session.status
        });
      });
    }

    // Add assignment activities
    if (typedAssignments && typedAssignments.length > 0) {
      typedAssignments.slice(0, 5).forEach((assignment: ClassroomAssignment) => {
        activities.push({
          id: `assignment-${assignment.id}`,
          type: 'assignment',
          icon: FileText,
          title: 'New assignment posted',
          description: assignment.title,
          timestamp: new Date(assignment.created_at || Date.now())
        });
      });
    }

    // Add quiz activities (if available)
    if (sampleQuizzes && sampleQuizzes.length > 0) {
      sampleQuizzes.slice(0, 3).forEach((quiz: Quiz) => {
        activities.push({
          id: `quiz-${quiz.id}`,
          type: 'quiz',
          icon: Brain,
          title: 'New quiz available',
          description: quiz.title,
          timestamp: new Date(quiz.created_at || Date.now())
        });
      });
    }

    // Sort by timestamp (most recent first)
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);
  };

  // Get relative time string
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const recentActivities = generateRecentActivities();

  const navigateToSection = (section: string) => {
    // Check if current user is a tutor and add /tutor/ prefix
    const isTutor = currentUser?.profile?.role === 'tutor';
    const route = isTutor 
      ? `/tutor/classroom/${classroomSlug}/${section}`
      : `/classroom/${classroomSlug}/${section}`;
    router.push(route);
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
          title: t('invalid_session'),
          description: t('invalid_session_desc'),
          variant: "destructive"
        });
        return;
      }

      // Basic status validation
      if (session.status === 'cancelled') {
        toast({
          title: t('session_cancelled'),
          description: t('session_cancelled_desc'),
          variant: "destructive"
        });
        return;
      }

      // Show joining toast
      toast({
        title: t('joining_session'),
        description: t('redirecting_to', { title: session.title }),
      });

      // Redirect to live session room URL with role-based routing
      const isTutor = currentUser?.profile?.role === 'tutor';
      const roomUrl = isTutor 
        ? `/tutor/classroom/${classroomSlug}/live/${sessionIdentifier}`
        : `/classroom/${classroomSlug}/live/${sessionIdentifier}`;
      console.log('🔗 [Dashboard] Redirecting to room URL:', roomUrl);
      router.push(roomUrl);
      
    } catch (error) {
      console.error('❌ [Dashboard] Error in handleJoinSession:', error);
      toast({
        title: t('failed_to_join'),
        description: t('failed_to_join_desc'),
        variant: "destructive"
      });
    }
  };

  const handleLeaveSession = () => {
    setActiveSession(null);
    toast({
      title: t('left_session'),
      description: t('left_session_desc'),
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
  const classroomColor = getClassroomColor(classroom);
  const cardStyling = getCardStyling(classroomColor, 'light');

  return (
    <div className="container mx-auto py-4 md:py-8 px-4 md:px-6">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{classroom.name}</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              {classroom.description || t('no_description')}
            </p>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-3 md:mt-4">
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
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={handleCopyClassCode}
                className="flex items-center justify-center gap-2 text-sm"
              >
                <Copy className="h-4 w-4" />
                <span className="truncate">{t('class_code')}: {classroom.class_code}</span>
              </Button>
              <Button variant="outline" onClick={handleOpenManageDialog} className="text-sm">
                <Settings className="h-4 w-4 mr-2" />
                {t('manage')}
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
    className="mb-4 md:mb-6 relative"
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
          {t('live_session_active')}
          
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
                {t('started_at')} {new Date(session.starts_at).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <Button 
              onClick={() => handleJoinSession(session)}
              variant="default"
              disabled={false}
              className="relative z-40 pointer-events-auto"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {t('join_session')}
            </Button>
          </div>
        ))}
      </CardContent>
      </Card>
    </motion.div>
)}

      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <div ref={tabsContainerRef}>
          <div className="relative -mx-4 md:mx-0">
          <TabsList className="relative border-b border-gray-100/10 bg-transparent p-0 h-auto w-full justify-start overflow-x-auto overflow-y-hidden scrollbar-hide px-4 md:px-0">
            <AnimatedTabsTrigger 
              value="overview" 
              isActive={activeTab === 'overview'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 md:px-6 py-3 text-xs md:text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary whitespace-nowrap flex-shrink-0"
            >
              {t('overview')}
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger 
              value="recent" 
              isActive={activeTab === 'recent'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 md:px-6 py-3 text-xs md:text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary whitespace-nowrap flex-shrink-0"
            >
              {t('recent_activity')}
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger 
              value="members" 
              isActive={activeTab === 'members'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 md:px-6 py-3 text-xs md:text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary whitespace-nowrap flex-shrink-0"
            >
              {t('members')}
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger 
              value="live-sessions" 
              isActive={activeTab === 'live-sessions'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 md:px-6 py-3 text-xs md:text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary whitespace-nowrap flex-shrink-0"
            >
              {t('schedule')}
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger 
              value="assignments" 
              isActive={activeTab === 'assignments'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 md:px-6 py-3 text-xs md:text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary whitespace-nowrap flex-shrink-0"
            >
              {t('assignments')}
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger 
              value="quizzes" 
              isActive={activeTab === 'quizzes'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 md:px-6 py-3 text-xs md:text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary whitespace-nowrap flex-shrink-0"
            >
              {t('quizzes')}
            </AnimatedTabsTrigger>
            {/* <AnimatedTabsTrigger 
              value="chat" 
              isActive={activeTab === 'chat'}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-primary"
            >
              Chat
            </AnimatedTabsTrigger> */}
          </TabsList>
          </div>
        </div>

        <AnimatedTabsContent value="overview" className="space-y-4 md:space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              onClick={() => navigateToSection('live')}
              style={{
                backgroundColor: cardStyling.backgroundColor,
                borderColor: cardStyling.borderColor
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('live_sessions')}</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingSessions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {t('upcoming_sessions')}
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
                <div className="text-2xl font-bold">{typedAssignments.length}</div>
                <p className="text-xs text-muted-foreground">
                  {t('active_assignments')}
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
          <div className="py-2 md:py-4"></div>
          {/* Main Content Grid */}
          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            {/* Upcoming Sessions */}
            <Card 
              style={{
                backgroundColor: cardStyling.backgroundColor,
                borderColor: cardStyling.borderColor
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('upcoming_sessions')}</CardTitle>
                  <CardDescription>{t('scheduled_live_sessions')}</CardDescription>
                </div>
                {isOwnerOrTutor && (
                  <Button size="sm" onClick={() => navigateToSection('live')}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('schedule')}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {upcomingSessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    {t('no_upcoming_sessions')}
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
                        <Badge variant="outline">{t('scheduled')}</Badge>
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
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('assignments')}</CardTitle>
                  <CardDescription>{t('active_assignments')}</CardDescription>
                </div>
                {isOwnerOrTutor && (
                  <Button size="sm" onClick={() => navigateToSection('assignment')}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('create')}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {!typedAssignments?.length ? (
                  <p className="text-muted-foreground text-center py-4">
                    {t('no_assignments')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {typedAssignments.slice(0, 3).map((assignment: ClassroomAssignment) => (
                      <div key={assignment.id} className="flex justify-between items-center p-3 bg-gray-100/5 hover:bg-gray-200/8  rounded-lg">
                        <div>
                          <p className="font-medium">{assignment.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('due')}: {new Date(assignment.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">{t('active')}</Badge>
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
            assignmentsData={assignmentsResponse}
            isOwnerOrTutor={isOwnerOrTutor}
            classroomSlug={classroomSlug}
            navigateToSection={navigateToSection}
            classroom={classroom}
            userRole={classroom?.user_role}
            currentUserId={(() => {
              const members = Array.isArray(membersData) ? membersData : membersData?.members || [];
              const currentUser = members.find(m => m.is_current_user);
              return currentUser?.id || currentUser?.user_id || 0;
            })()}
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

        {/* <AnimatedTabsContent value="chat" className="space-y-6">
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
        </AnimatedTabsContent> */}

        <AnimatedTabsContent value="recent" className="space-y-4 md:space-y-6">
          <Card 
            style={{
              backgroundColor: cardStyling.backgroundColor,
              borderColor: cardStyling.borderColor
            }}
          >
            <CardHeader>
              <CardTitle>{t('recent_activity')}</CardTitle>
              <CardDescription>{t('latest_activities')}</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivities.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No recent activities yet
                </p>
              ) : (
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => {
                    const Icon = activity.icon;
                    const iconColorClass = 
                      activity.type === 'member' ? 'bg-blue-500/10' :
                      activity.type === 'session' ? 'bg-red-500/10' :
                      activity.type === 'assignment' ? 'bg-green-500/10' :
                      'bg-purple-500/10';
                    const textColorClass = 
                      activity.type === 'member' ? 'text-blue-500' :
                      activity.type === 'session' ? 'text-red-500' :
                      activity.type === 'assignment' ? 'text-green-500' :
                      'text-purple-500';
                    
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className={`p-2 rounded-full flex-shrink-0 ${iconColorClass}`}>
                          <Icon className={`h-4 w-4 ${textColorClass}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {activity.title}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {activity.description}
                              </p>
                              {activity.user && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  by {activity.user}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {getRelativeTime(activity.timestamp)}
                              </span>
                              {activity.status && (
                                <Badge 
                                  variant={
                                    activity.status === 'live' ? 'destructive' : 
                                    activity.status === 'scheduled' ? 'default' : 
                                    'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {activity.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedTabsContent>
      </Tabs>

      {/* Manage Classroom Dialog */}
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Classroom</DialogTitle>
            <DialogDescription>
              Update classroom settings or delete this classroom.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Classroom Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Classroom Name</Label>
              <Input
                id="name"
                value={manageFormData.name}
                onChange={(e) => setManageFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter classroom name"
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={manageFormData.description}
                onChange={(e) => setManageFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter classroom description"
                rows={3}
              />
            </div>

            {/* Color Picker */}
            <div className="grid gap-2">
              <Label htmlFor="color">Theme Color</Label>
              <Select
                value={manageFormData.color}
                onValueChange={(value) => setManageFormData(prev => ({ ...prev, color: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a color" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSROOM_COLORS.map((color) => (
                    <SelectItem key={color} value={color}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: color }}
                        />
                        <span>{color}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                setIsManageDialogOpen(false);
                setIsDeleteConfirmOpen(true);
              }}
              className="w-full sm:w-auto"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete Classroom
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setIsManageDialogOpen(false)}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveClassroom}
                className="flex-1 sm:flex-none"
                disabled={!manageFormData.name.trim()}
              >
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Classroom?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the classroom
              and remove all associated data.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 my-4">
            <div className="flex items-start gap-3">
              <Trash className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Warning</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You are about to delete <strong>{classroom?.name}</strong>. All members
                  will lose access and all content will be removed.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClassroom}
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}