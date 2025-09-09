'use client';

import React, { useState, lazy, Suspense } from 'react';
import { Video, Calendar, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateLiveSessionDialog } from '@/components/classroom/Dialog/create-livesession-dialog';
import { getCardStyling, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';
import { useCreateLiveSession } from '@/hooks/classroom/use-create-live-session';
import { useToast } from '@/hooks/use-toast';

// Dynamic import for client-side only
const LiveClassroom = lazy(() => import('@/components/classroom/live-session/live-classroom'));

interface LiveSessionTabProps {
  liveSessionsData: any;
  isOwnerOrTutor: boolean;
  classroomSlug: string;
  navigateToSection: (section: string) => void;
  router: any;
  classroom?: any;
}

export function LiveSessionTab({ liveSessionsData, isOwnerOrTutor, classroomSlug, navigateToSection, router, classroom }: LiveSessionTabProps) {
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
  const classroomColor = (classroom?.color && CLASSROOM_COLORS.includes(classroom.color as ClassroomColor)) 
    ? classroom.color as ClassroomColor 
    : '#6aa84f';
  
  const cardStyling = getCardStyling(classroomColor as ClassroomColor, 'light');

  const handleCreateSession = async () => {
    if (!classroom) return;

    try {
      await createSessionMutation.mutateAsync({
        classroomSlug: classroomSlug,
        title: formData.title,
        description: formData.description,
        starts_at: formData.starts_at,
        ends_at: formData.ends_at
      });
      
      toast({
        title: "Success",
        description: "Live session created successfully",
      });
      
      setIsDialogOpen(false);
      setFormData({ title: '', description: '', starts_at: '', ends_at: '' });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create live session",
        variant: "destructive",
      });
    }
  };

  const handleJoinSession = async (session: any) => {
    console.log('🚀 [LiveSessionTab] handleJoinSession called with session:', session);
    console.log('🔍 [LiveSessionTab] Session details:', {
      id: session.id,
      public_id: session.public_id,
      slug: session.slug,
      title: session.title,
      status: session.status,
      starts_at: session.starts_at,
      ends_at: session.ends_at
    });

    try {
      // Construct session identifier with fallback
      const sessionIdentifier = session.public_id || session.slug || session.id?.toString() || 'unknown';
      console.log('🆔 [LiveSessionTab] Session identifier:', sessionIdentifier);

      // Robust date validation with tolerant checks
      const now = new Date();
      console.log('⏰ [LiveSessionTab] Current time:', now.toISOString());

      let sessionStart = null;
      let sessionEnd = null;

      try {
        if (session.starts_at) {
          sessionStart = new Date(session.starts_at);
          console.log('🕐 [LiveSessionTab] Session start time:', sessionStart.toISOString());
        }
      } catch (dateError) {
        console.warn('⚠️ [LiveSessionTab] Invalid start date:', session.starts_at, dateError);
      }

      try {
        if (session.ends_at) {
          sessionEnd = new Date(session.ends_at);
          console.log('🕑 [LiveSessionTab] Session end time:', sessionEnd.toISOString());
        }
      } catch (dateError) {
        console.warn('⚠️ [LiveSessionTab] Invalid end date:', session.ends_at, dateError);
      }

      // More tolerant time checks
      if (sessionStart && !isNaN(sessionStart.getTime())) {
        const timeDiff = now.getTime() - sessionStart.getTime();
        console.log('⏱️ [LiveSessionTab] Time difference from start (ms):', timeDiff);
        
        // Allow joining 5 minutes before start time
        if (timeDiff < -300000) {
          console.log('⏰ [LiveSessionTab] Session starts in more than 5 minutes');
          toast({
            title: "Session Not Started",
            description: "This session hasn't started yet.",
            variant: "destructive"
          });
          return;
        }
      }

      if (sessionEnd && !isNaN(sessionEnd.getTime())) {
        const timeDiff = sessionEnd.getTime() - now.getTime();
        console.log('⏱️ [LiveSessionTab] Time until end (ms):', timeDiff);
        
        // Only block if session ended more than 5 minutes ago
        if (timeDiff < -300000) {
          console.log('⏰ [LiveSessionTab] Session ended more than 5 minutes ago');
          toast({
            title: "Session Ended",
            description: "This session has already ended.",
            variant: "destructive"
          });
          return;
        }
      }

      // Show joining toast
      toast({
        title: "Joining Session",
        description: `Connecting to "${session.title}"...`,
      });

      // Set active session to show LiveKit room
      console.log('✅ [LiveSessionTab] Setting activeSession with identifier:', sessionIdentifier);
      const sessionWithIdentifier = { ...session, sessionIdentifier };
      console.log('📦 [LiveSessionTab] Final session object:', sessionWithIdentifier);
      setActiveSession(sessionWithIdentifier);
      
    } catch (error) {
      console.error('❌ [LiveSessionTab] Error in handleJoinSession:', error);
      console.error('📊 [LiveSessionTab] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
    console.log('🎬 [LiveSessionTab] Rendering LiveClassroom with:', {
      classroomSlug,
      sessionId,
      participantName: classroom?.user_name || 'User',
      userRole: isOwnerOrTutor ? 'tutor' : 'student',
      activeSession
    });
    return (
      <Suspense fallback={<div className="flex items-center justify-center p-8">Loading video classroom...</div>}>
        <LiveClassroom
          classroomSlug={classroomSlug}
          sessionId={sessionId}
          participantName={classroom?.user_name || 'User'}
          userRole={isOwnerOrTutor ? 'tutor' : 'student'}
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
                    Join Session (Debug)
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