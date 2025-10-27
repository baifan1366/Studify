'use client';

import React, { useState, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/profile/use-user';
import { useToast } from '@/hooks/use-toast';
import { useCreateLiveSession } from '@/hooks/classroom/use-create-live-session';
import { Video, Calendar, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateLiveSessionDialog } from '@/components/classroom/Dialog/create-livesession-dialog';
import { getCardStyling, getClassroomColor, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';

const LiveClassroom = lazy(() => import('@/components/classroom/live-session/live-classroom'));

interface LiveSessionTabProps {
  liveSessionsData: any;
  isOwnerOrTutor: boolean;
  classroomSlug: string;
  navigateToSection: (section: string) => void;
  router: any;
  classroom?: any;
}

export function LiveSessionTab({
  liveSessionsData,
  isOwnerOrTutor,
  classroomSlug,
  navigateToSection,
  router,
  classroom
}: LiveSessionTabProps) {
  const t = useTranslations('LiveSessionTab');
  const { data: currentUser } = useUser();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    starts_at: '',
    ends_at: ''
  });

  const createSessionMutation = useCreateLiveSession();

  const upcomingSessions = liveSessionsData?.sessions?.filter((s: any) => s.status === 'scheduled') || [];
  const liveSessions = liveSessionsData?.sessions?.filter((s: any) => s.status === 'live') || [];

  // Get classroom color
  const classroomColor = getClassroomColor(classroom);
  const cardStyling = getCardStyling(classroomColor, 'light');

  const handleCreateSession = async () => {
    if (!classroom) return;

    // Prevent duplicate submissions
    if (createSessionMutation.isPending) {
      console.log('⏳ Session creation already in progress');
      return;
    }

    try {
      const requestData: any = {
        classroomSlug: classroomSlug,
        title: formData.title,
        description: formData.description,
        starts_at: formData.starts_at,
      };
      
      // Only include ends_at if it's provided
      if (formData.ends_at && formData.ends_at.trim() !== '') {
        requestData.ends_at = formData.ends_at;
      }
      
      console.log('📤 [LiveSessionTab] Creating session with data:', requestData);
      
      const result = await createSessionMutation.mutateAsync(requestData);
      
      console.log('✅ [LiveSessionTab] Session created:', result);
      
      const isLive = result?.session?.status === 'live';
      
      toast({
        title: "Success",
        description: isLive 
          ? "Live session created and started! Click 'Join Session' to enter." 
          : "Live session scheduled successfully",
      });
      
      setIsDialogOpen(false);
      setFormData({ title: '', description: '', starts_at: '', ends_at: '' });
      
      // Optionally auto-join if session is live
      if (isLive && result?.session) {
        console.log('🎬 [LiveSessionTab] Session is live, you can join now');
        // Could auto-navigate here if desired
        // handleJoinSession(result.session);
      }
    } catch (error: any) {
      console.error('❌ [LiveSessionTab] Failed to create session:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create live session",
        variant: "destructive",
      });
    }
  };

  const handleJoinSession = async (session: any) => {
    console.log('🚀 [LiveSessionTab] handleJoinSession called with session:', session);
    
    try {
      // Construct session identifier with fallback
      const sessionIdentifier = session.public_id || session.slug || session.id?.toString() || 'unknown';
      console.log('🆔 [LiveSessionTab] Session identifier:', sessionIdentifier);

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

      // Redirect to live session room URL with role-based routing
      // 🎯 Fix: Use classroom.user_role for accurate role determination
      const isTutor = classroom?.user_role === 'owner' || classroom?.user_role === 'tutor';
      const roomUrl = isTutor 
        ? `/tutor/classroom/${classroomSlug}/live/${sessionIdentifier}`
        : `/classroom/${classroomSlug}/live/${sessionIdentifier}`;
      console.log('🔗 [LiveSessionTab] Redirecting to room URL:', {
        roomUrl,
        classroomUserRole: classroom?.user_role,
        isTutor
      });
      router.push(roomUrl);
      
    } catch (error) {
      console.error('❌ [LiveSessionTab] Error in handleJoinSession:', error);
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

  // If user is in an active session, show LiveKit room
  if (activeSession) {
    const sessionId = activeSession.sessionIdentifier || activeSession.id?.toString() || 'fallback';
    
    // 🎯 Fix: Use classroom.user_role directly for accurate role determination
    // Keep owner as owner, tutor as tutor, others as student
    console.log('🔍 [LiveSessionTab] classroom object:', classroom);
    console.log('🔍 [LiveSessionTab] classroom.user_role:', classroom?.user_role);
    console.log('🔍 [LiveSessionTab] isOwnerOrTutor:', isOwnerOrTutor);
    
    const userRole: 'student' | 'tutor' | 'owner' = 
      classroom?.user_role === 'owner' ? 'owner' :
      classroom?.user_role === 'tutor' ? 'tutor' :
      'student';
    
    console.log('🎬 [LiveSessionTab] Rendering LiveClassroom with:', {
      classroomSlug,
      sessionId,
      participantName: classroom?.user_name || 'User',
      userRole,
      classroomUserRole: classroom?.user_role,
      isOwnerOrTutor,
      activeSession
    });
    
    return (
      <Suspense fallback={<div className="flex items-center justify-center p-8">Loading video classroom...</div>}>
        <LiveClassroom
          classroomSlug={classroomSlug}
          sessionId={sessionId}
          participantName={classroom?.user_name || 'User'}
          userRole={userRole}
          onSessionEnd={handleLeaveSession}
        />
      </Suspense>
    );
  }

  return (
    <Card 
      style={{
        backgroundColor: cardStyling.backgroundColor,
        borderColor: cardStyling.borderColor
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-2xl font-bold">Live Sessions</h2>
        {isOwnerOrTutor && (
          <CreateLiveSessionDialog
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            formData={formData}
            onFormDataChange={setFormData}
            onCreateSession={handleCreateSession}
            canManageSessions={isOwnerOrTutor}
            isCreating={createSessionMutation.isPending}
          />
        )}
      </CardHeader>
      <CardContent>
        {/* Live Sessions */}
        {liveSessions.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
              <Video className="h-4 w-4" />
              Live Now
            </h3>
            <div className="space-y-3">
              {liveSessions.map((session: any) => (
                <div key={session.id} className="flex justify-between items-center p-4 bg-gray-100/5 hover:bg-gray-200/8 rounded-lg">
                  <div>
                    <p className="font-medium text-green-800">{session.title}</p>
                    <p className="text-sm text-green-600">
                      Started at {new Date(session.starts_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleJoinSession(session)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={false}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Join Session 
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Upcoming Sessions */}
        <div>
          <h3 className="font-semibold mb-3">Upcoming Sessions</h3>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8 ">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No upcoming sessions</p>
              {isOwnerOrTutor && (
                <p className="text-sm text-muted-foreground mt-2">
                  Schedule a session to get started
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((session: any) => (
                <div key={session.id} className="flex justify-between items-center p-4 bg-gray-100/5 hover:bg-gray-200/8 rounded-lg">
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
        </div>
      </CardContent>
    </Card>
  );
}