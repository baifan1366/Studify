'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  Video,
  MoreHorizontal,
  Play,
  Square,
  Edit,
  Trash2
} from 'lucide-react';
import { useClassrooms, useLiveSessions } from '@/hooks/classroom/use-create-live-session';
import { 
  useCreateLiveSession, 
  useUpdateLiveSession 
} from '@/hooks/classroom/use-create-live-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateLiveSessionDialog } from '@/components/classroom/Dialog/create-livesession-dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { getCardStyling, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';

// Dynamic import for client-side only
const LiveClassroom = lazy(() => import('@/components/classroom/live-session/live-classroom'));

interface ClassroomLiveSessionsPageProps {
  classroomSlug: string;
}

export function ClassroomLiveSessionsPage({ classroomSlug }: ClassroomLiveSessionsPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [classroom, setClassroom] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    starts_at: '',
    ends_at: ''
  });

  const { data: classroomsData } = useClassrooms();
  const { data: sessionsData, isLoading } = useLiveSessions(classroomSlug);
  const createSessionMutation = useCreateLiveSession();
  const updateSessionMutation = useUpdateLiveSession();

  useEffect(() => {
    if (classroomsData?.classrooms) {
      const foundClassroom = classroomsData.classrooms.find(c => c.slug === classroomSlug);
      setClassroom(foundClassroom);
    }
  }, [classroomsData, classroomSlug]);

  const handleBack = () => {
    router.push(`/classroom/${classroomSlug}`);
  };

  const [activeSession, setActiveSession] = useState<any>(null);

  const handleJoinSession = async (session: any) => {
    console.log('🚀 [LiveSessionsPage] handleJoinSession called with session:', session);
    console.log('🔍 [LiveSessionsPage] Session details:', {
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
      console.log('🆔 [LiveSessionsPage] Session identifier:', sessionIdentifier);

      // Robust date validation with tolerant checks
      const now = new Date();
      console.log('⏰ [LiveSessionsPage] Current time:', now.toISOString());

      let sessionStart = null;
      let sessionEnd = null;

      try {
        if (session.starts_at) {
          sessionStart = new Date(session.starts_at);
          console.log('🕐 [LiveSessionsPage] Session start time:', sessionStart.toISOString());
        }
      } catch (dateError) {
        console.warn('⚠️ [LiveSessionsPage] Invalid start date:', session.starts_at, dateError);
      }

      try {
        if (session.ends_at) {
          sessionEnd = new Date(session.ends_at);
          console.log('🕑 [LiveSessionsPage] Session end time:', sessionEnd.toISOString());
        }
      } catch (dateError) {
        console.warn('⚠️ [LiveSessionsPage] Invalid end date:', session.ends_at, dateError);
      }

      // More tolerant time checks
      if (sessionStart && !isNaN(sessionStart.getTime())) {
        const timeDiff = now.getTime() - sessionStart.getTime();
        console.log('⏱️ [LiveSessionsPage] Time difference from start (ms):', timeDiff);
        
        // Allow joining 5 minutes before start time
        if (timeDiff < -300000) {
          console.log('⏰ [LiveSessionsPage] Session starts in more than 5 minutes');
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
        console.log('⏱️ [LiveSessionsPage] Time until end (ms):', timeDiff);
        
        // Only block if session ended more than 5 minutes ago
        if (timeDiff < -300000) {
          console.log('⏰ [LiveSessionsPage] Session ended more than 5 minutes ago');
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
      console.log('✅ [LiveSessionsPage] Setting activeSession with identifier:', sessionIdentifier);
      const sessionWithIdentifier = { ...session, sessionIdentifier };
      console.log('📦 [LiveSessionsPage] Final session object:', sessionWithIdentifier);
      setActiveSession(sessionWithIdentifier);
      
    } catch (error) {
      console.error('❌ [LiveSessionsPage] Error in handleJoinSession:', error);
      console.error('📊 [LiveSessionsPage] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      starts_at: '',
      ends_at: ''
    });
    setEditingSession(null);
  };

  const handleCreateSession = async () => {
    if (!classroom) return;

    try {
      await createSessionMutation.mutateAsync({
        classroomSlug,
        title: formData.title,
        description: formData.description,
        starts_at: formData.starts_at,
        ends_at: formData.ends_at
      });
      
      toast({
        title: "Success",
        description: "Live session created successfully",
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create live session",
        variant: "destructive",
      });
    }
  };

  const handleEditSession = (session: any) => {
    setEditingSession(session);
    setFormData({
      title: session.title,
      description: session.description || '',
      starts_at: new Date(session.starts_at).toISOString().slice(0, 16),
      ends_at: session.ends_at ? new Date(session.ends_at).toISOString().slice(0, 16) : ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateSession = async () => {
    if (!editingSession) return;

    try {
      await updateSessionMutation.mutateAsync({
        classroomSlug: classroomSlug,
        session_id: editingSession.id,
        title: formData.title,
        description: formData.description,
        starts_at: formData.starts_at,
        ends_at: formData.ends_at
      });
      
      toast({
        title: "Success",
        description: "Live session updated successfully",
      });
      
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update live session",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (sessionId: number, newStatus: 'scheduled' | 'live' | 'ended' | 'cancelled') => {
    try {
      await updateSessionMutation.mutateAsync({
        classroomSlug,
        session_id: sessionId,
        status: newStatus
      });
      
      toast({
        title: "Success",
        description: `Session ${newStatus} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update session status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'live':
        return 'default';
      case 'scheduled':
        return 'secondary';
      case 'ended':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'text-green-600';
      case 'scheduled':
        return 'text-blue-600';
      case 'ended':
        return 'text-gray-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const canManageSessions = classroom?.user_role === 'owner' || classroom?.user_role === 'tutor';

  // If user is in an active session, show LiveKit room
  if (activeSession) {
    const sessionId = activeSession.sessionIdentifier || activeSession.id?.toString() || 'fallback';
    console.log('🎬 [LiveSessionsPage] Rendering LiveClassroom with:', {
      classroomSlug,
      sessionId,
      participantName: classroom?.name || 'User',
      userRole: canManageSessions ? 'tutor' : 'student',
      activeSession
    });
    return (
      <Suspense fallback={<div className="flex items-center justify-center p-8">Loading video classroom...</div>}>
        <LiveClassroom
          classroomSlug={classroomSlug}
          sessionId={sessionId}
          participantName={classroom?.name || 'User'}
          userRole={canManageSessions ? 'tutor' : 'student'}
          onSessionEnd={handleLeaveSession}
        />
      </Suspense>
    );
  }

  if (!classroom) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  const sessions = sessionsData?.sessions || [];
  const liveSessions = sessions.filter(s => s.status === 'live');
  const scheduledSessions = sessions.filter(s => s.status === 'scheduled');
  const pastSessions = sessions.filter(s => s.status === 'ended');

  // Get classroom color styling
  const classroomColor = (classroom?.color && CLASSROOM_COLORS.includes(classroom.color as ClassroomColor)) 
    ? classroom.color as ClassroomColor 
    : '#6aa84f';
  
  const cardStyling = getCardStyling(classroomColor as ClassroomColor, 'light');

  return (
    <div className="container mx-auto py-8 my-[50px]">
      <div className="mb-8">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Live Sessions</h1>
            <p className="text-muted-foreground">
              Manage live sessions for {classroom.name}
            </p>
          </div>
          <CreateLiveSessionDialog
            isOpen={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            formData={formData}
            onFormDataChange={setFormData}
            onCreateSession={handleCreateSession}
            canManageSessions={canManageSessions}
          />
        </div>
      </div>

      <div className="grid gap-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Now</CardTitle>
              <Video className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{liveSessions.length}</div>
            </CardContent>
          </Card>
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{scheduledSessions.length}</div>
            </CardContent>
          </Card>
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Clock className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pastSessions.length}</div>
            </CardContent>
          </Card>
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Live Sessions */}
        {liveSessions.length > 0 && (
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-red-500" />
                Live Now
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {liveSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-gray-100/5 dark:hover:bg-gray-200/8"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{session.title}</h3>
                        <Badge variant="default" className="bg-red-600">
                          LIVE
                        </Badge>
                      </div>
                      {session.description && (
                        <p className="text-sm text-muted-foreground mb-2">{session.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(session.starts_at).toLocaleTimeString()} - {session.ends_at ? new Date(session.ends_at).toLocaleTimeString() : 'No end time'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={() => handleJoinSession(session)} 
                        className="bg-green-600 hover:bg-green-700"
                        disabled={false}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Join Live (Debug)
                      </Button>
                      {canManageSessions && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStatusChange(session.id, 'ended')}>
                              <Square className="h-4 w-4 mr-2" />
                              End Session
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Sessions */}
        <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
          <CardHeader>
            <CardTitle>All Sessions</CardTitle>
            <CardDescription>
              View and manage all live sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <Video className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No sessions yet</h3>
                <p className="text-muted-foreground">
                  {canManageSessions ? 'Schedule your first live session' : 'No live sessions scheduled'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 dark:bg-gray-100/5 dark:hover:bg-gray-200/8 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{session.title}</h3>
                        <Badge variant={getStatusBadgeVariant(session.status)}>
                          {session.status.toUpperCase()}
                        </Badge>
                      </div>
                      {session.description && (
                        <p className="text-sm text-muted-foreground mb-2">{session.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(session.starts_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(session.starts_at).toLocaleTimeString()} - {session.ends_at ? new Date(session.ends_at).toLocaleTimeString() : 'No end time'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {((session.status as string) === 'live' || (session.status as string) === 'active') && (
                        <Button 
                          onClick={() => handleJoinSession(session)} 
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Join Live
                        </Button>
                      )}
                      {session.status === 'scheduled' && (
                        <Button onClick={() => handleJoinSession(session)} variant="outline" disabled>
                          <Video className="mr-2 h-4 w-4" />
                          Not Started
                        </Button>
                      )}
                      {canManageSessions && session.status === 'scheduled' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditSession(session)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Session
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(session.id, 'live')}>
                              <Play className="h-4 w-4 mr-2" />
                              Start Session
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(session.id, 'cancelled')}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel Session
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
