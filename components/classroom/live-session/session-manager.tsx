'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Users, Video, Play, Square, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useClassroomLiveSessions } from '@/hooks/classroom/use-classroom-live-sessions';
import { LiveSession } from '@/interface/classroom/live-session-interface';
import LiveClassroom from './live-classroom';

interface SessionManagerProps {
  classroomSlug: string;
  userRole: 'student' | 'tutor' | 'owner';
  userId: string;
  userName: string;
}


export default function SessionManager({
  classroomSlug,
  userRole,
  userId,
  userName
}: SessionManagerProps) {
  // 🎯 Solution B: Introduce explicit user intent state
  const [joinedSessionId, setJoinedSessionId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    starts_at: '',
    ends_at: '',
  });

  // 🎯 Use ref to ensure auto-join only executes on first load
  const hasAutoJoinedRef = useRef(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    sessions,
    isLoading,
    error,
    createSession,
    updateSession,
    deleteSession,
    invalidateQueries
  } = useClassroomLiveSessions(classroomSlug);

  // 🎯 Precise time-based session sync
  useEffect(() => {
    if (!sessions || sessions.length === 0) return;

    const syncSessionStatus = async () => {
      try {
        const response = await fetch(`/api/classroom/${classroomSlug}/live-sessions?action=sync`, {
          method: 'PUT'
        });
        const data = await response.json();
        
        if (data.success && (data.activated > 0 || data.ended > 0)) {
          console.log('🔄 Session status synced:', data);
          invalidateQueries();
        }
      } catch (error) {
        console.error('Failed to sync session status:', error);
      }
    };

    // Calculate optimal sync interval based on nearest session start/end time
    const getNextSyncInterval = () => {
      const now = Date.now();
      let minTimeToEvent = Infinity;

      for (const session of sessions) {
        // Check scheduled sessions for start time
        if (session.status === 'scheduled') {
          const startTime = new Date(session.starts_at).getTime();
          const timeToStart = startTime - now;
          
          if (timeToStart > 0 && timeToStart < minTimeToEvent) {
            minTimeToEvent = timeToStart;
          }
        }
        
        // Check active sessions for end time
        if (session.status === 'active' && session.ends_at) {
          const endTime = new Date(session.ends_at).getTime();
          const timeToEnd = endTime - now;
          
          if (timeToEnd > 0 && timeToEnd < minTimeToEvent) {
            minTimeToEvent = timeToEnd;
          }
        }
      }

      // Adaptive interval: more frequent as start/end time approaches
      if (minTimeToEvent < 30000) return 5000;      // < 30s: check every 5s
      if (minTimeToEvent < 60000) return 10000;     // < 1m: check every 10s
      if (minTimeToEvent < 300000) return 15000;    // < 5m: check every 15s
      return 30000;                                  // default: check every 30s
    };

    // Initial sync
    syncSessionStatus();

    // Set up adaptive interval
    const setupInterval = () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      
      const interval = getNextSyncInterval();
      syncIntervalRef.current = setInterval(syncSessionStatus, interval);
    };

    setupInterval();

    // Recalculate interval every minute
    const recalcInterval = setInterval(setupInterval, 60000);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      clearInterval(recalcInterval);
    };
  }, [sessions, classroomSlug, invalidateQueries]);

  // 🎯 Calculate current active session (from user-selected session ID)
  const activeSession = useMemo(() => {
    if (!joinedSessionId) return null;
    return sessions?.find(s => s.id === joinedSessionId) || null;
  }, [joinedSessionId, sessions]);

  // 🎯 Fix: Auto-join active session only on first load and for students
  useEffect(() => {
    if (hasAutoJoinedRef.current) return;
    if (!sessions || sessions.length === 0) return;

    // Only students auto-join
    if (userRole === 'student') {
      const activeSessions = sessions.filter(session => session.status === 'active');
      if (activeSessions.length > 0) {
        setJoinedSessionId(activeSessions[0].id);
        hasAutoJoinedRef.current = true;
      }
    }
  }, [sessions, userRole]);

  const handleCreateSession = async () => {
    if (!newSession.title || !newSession.starts_at) {
      toast.error('Please fill in required information');
      return;
    }

    try {
      await createSession({
        title: newSession.title,
        description: newSession.description,
        starts_at: new Date(newSession.starts_at).toISOString(),
        ends_at: newSession.ends_at ? new Date(newSession.ends_at).toISOString() : null,
        host_id: userId,
      });

      setShowCreateDialog(false);
      setNewSession({ title: '', description: '', starts_at: '', ends_at: '' });
      toast.success('Live session created successfully');
      invalidateQueries();
    } catch (error) {
      toast.error('Creation failed, please retry');
    }
  };

  const handleStartSession = async (session: LiveSession) => {
    try {
      await updateSession(session.id, { status: 'active' });
      setJoinedSessionId(session.id);  // 🎯 Use new state
      toast.success('Classroom has started');
      invalidateQueries();
    } catch (error) {
      toast.error('Failed to start classroom');
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;

    try {
      await updateSession(activeSession.id, {
        status: 'ended',
        ends_at: new Date().toISOString()
      });
      setJoinedSessionId(null);  // 🎯 Use new state
      toast.success('Classroom has ended');
      invalidateQueries();
    } catch (error) {
      toast.error('Failed to end classroom');
    }
  };

  const handleJoinSession = (session: LiveSession) => {
    setJoinedSessionId(session.id);  // 🎯 Use new state
  };

  const handleLeaveSession = () => {
    setJoinedSessionId(null);  // 🎯 Use new state
  };

  // 🎯 New: Handle delete session
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      toast.success('Session deleted');
      invalidateQueries();  // 🎯 Ensure data refresh
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  // If participating in classroom, show LiveKit component
  if (activeSession) {
    return (
      <LiveClassroom
        classroomSlug={classroomSlug}
        sessionId={activeSession.id}
        participantName={userName}
        userRole={userRole}
        onSessionEnd={userRole === 'tutor' ? handleEndSession : handleLeaveSession}
        sessionEndsAt={activeSession.ends_at}
      />
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-transparent p-2">
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  // 🎯 New: Show error state
  if (error) {
    return (
      <Card className="bg-transparent p-2">
        <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-red-500 text-center">
            <p className="font-medium">Unable to load session list</p>
            <p className="text-sm text-muted-foreground mt-2">Please check network connection and retry</p>
          </div>
          <Button onClick={() => invalidateQueries()}>
            Reload
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header action area */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Live Classroom</h2>
          <p className="text-muted-foreground">Manage and participate in real-time video classrooms</p>
        </div>

        {(userRole === 'tutor' || userRole === 'owner') && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Video className="h-4 w-4 mr-2" />
                Create Live Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Live Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Classroom Title</Label>
                  <Input
                    id="title"
                    value={newSession.title}
                    onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter classroom title"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Classroom Description</Label>
                  <Textarea
                    id="description"
                    value={newSession.description}
                    onChange={(e) => setNewSession(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter classroom description (optional)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="starts_at">Start Time</Label>
                    <Input
                      id="starts_at"
                      type="datetime-local"
                      value={newSession.starts_at}
                      onChange={(e) => setNewSession(prev => ({ ...prev, starts_at: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ends_at">End Time (Optional)</Label>
                    <Input
                      id="ends_at"
                      type="datetime-local"
                      value={newSession.ends_at}
                      onChange={(e) => setNewSession(prev => ({ ...prev, ends_at: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSession}>
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Session List */}
      <div className="grid gap-4">
        {sessions && sessions.length > 0 ? (
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              userRole={userRole}
              onStart={() => handleStartSession(session)}
              onJoin={() => handleJoinSession(session)}
              onDelete={() => deleteSession(session.id)}
            />
          ))
        ) : (
          <Card className="bg-transparent p-2">
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <Video className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Live Classrooms</h3>
              <p className="text-muted-foreground mb-4">
                {(userRole === 'tutor' || userRole === 'owner')
                  ? 'Create your first live classroom to start interacting with students'
                  : 'Wait for tutor to start live classroom'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface SessionCardProps {
  session: LiveSession;
  userRole: 'student' | 'tutor' | 'owner';
  onStart: () => void;
  onJoin: () => void;
  onDelete: () => void;
}

function SessionCard({ session, userRole, onStart, onJoin, onDelete }: SessionCardProps) {
  // Calculate time until end for active sessions
  const timeUntilEnd = React.useMemo(() => {
    if (session.status !== 'active' || !session.ends_at) return null;
    
    const now = Date.now();
    const endTime = new Date(session.ends_at).getTime();
    const diffMs = endTime - now;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 0) return 'Ending now';
    if (diffMinutes < 5) return `Ends in ${diffMinutes}m`;
    if (diffMinutes < 60) return `${diffMinutes}m remaining`;
    
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m remaining`;
  }, [session.status, session.ends_at]);

  const isEndingSoon = React.useMemo(() => {
    if (session.status !== 'active' || !session.ends_at) return false;
    
    const now = Date.now();
    const endTime = new Date(session.ends_at).getTime();
    const diffMinutes = (endTime - now) / (1000 * 60);
    
    return diffMinutes > 0 && diffMinutes <= 10; // Warning if less than 10 minutes
  }, [session.status, session.ends_at]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'active':
        return (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="animate-pulse">In Progress</Badge>
            {isEndingSoon && timeUntilEnd && (
              <Badge variant="destructive" className="animate-pulse">
                ⏰ {timeUntilEnd}
              </Badge>
            )}
          </div>
        );
      case 'ended':
        return <Badge variant="outline">Ended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canStart = (userRole === 'tutor' || userRole === 'owner') && session.status === 'scheduled';
  const canJoin = session.status === 'active';
  const canDelete = (userRole === 'tutor' || userRole === 'owner') && session.status !== 'active';

  return (
    <Card className="bg-transparent p-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>{session.title}</span>
              {getStatusBadge(session.status)}
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {canStart && (
              <Button onClick={onStart} size="sm">
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            )}
            {canJoin && (
              <Button onClick={onJoin} size="sm">
                <Video className="h-4 w-4 mr-2" />
                Join
              </Button>
            )}
            {canDelete && (
              <Button onClick={onDelete} size="sm" variant="outline">
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>Start: {formatDateTime(session.starts_at)}</span>
          </div>
          {session.ends_at && (
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>End: {formatDateTime(session.ends_at)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
