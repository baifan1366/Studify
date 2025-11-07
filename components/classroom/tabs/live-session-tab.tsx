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
        title: t('success'),
        description: isLive 
          ? t('session_created_started')
          : t('session_scheduled_successfully'),
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
        title: t('error'),
        description: error.message || t('failed_to_create'),
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
        <h2 className="text-2xl font-bold">{t('live_sessions')}</h2>
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
              {t('live_now')}
            </h3>
            <div className="space-y-3">
              {liveSessions.map((session: any) => (
                <div key={session.id} className="flex justify-between items-center p-4 bg-gray-100/5 hover:bg-gray-200/8 rounded-lg">
                  <div>
                    <p className="font-medium text-green-800">{session.title}</p>
                    <p className="text-sm text-green-600">
                      {t('started_at', { time: new Date(session.starts_at).toLocaleTimeString() })}
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleJoinSession(session)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={false}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('join_session')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Upcoming Sessions */}
        <div>
          <h3 className="font-semibold mb-3">{t('upcoming_sessions')}</h3>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8 ">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('no_upcoming_sessions')}</p>
              {isOwnerOrTutor && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('schedule_session_hint')}
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
                      {t('scheduled_at', { 
                        date: new Date(session.starts_at).toLocaleDateString(),
                        time: new Date(session.starts_at).toLocaleTimeString()
                      })}
                    </p>
                  </div>
                  <Badge variant="outline">{t('scheduled')}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}