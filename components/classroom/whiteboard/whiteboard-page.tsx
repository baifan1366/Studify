'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useClassroomDetail } from '@/hooks/classroom/use-classroom-detail';
import { useClassroomLiveSessions } from '@/hooks/classroom/use-classroom-live-sessions';
import WhiteboardManager from './whiteboard-manager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Video, Users, Clock } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

interface WhiteboardPageProps {
  classroomSlug: string;
}

export default function WhiteboardPage({ classroomSlug }: WhiteboardPageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: classroom, isLoading: classroomLoading } = useClassroomDetail(classroomSlug);
  const { sessions, isLoading: sessionsLoading } = useClassroomLiveSessions(classroomSlug);
  
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [userRole, setUserRole] = useState<'student' | 'tutor'>('student');

  // Determine user role in classroom
  useEffect(() => {
    if (user) {
      // For now, determine role based on user's global role
      // TODO: Check actual classroom membership when API is available
      if (user.role === 'tutor') {
        setUserRole('tutor');
      } else {
        setUserRole('student');
      }
    }
  }, [user]);

  // Auto-select active session
  useEffect(() => {
    if (sessions && sessions.length > 0 && !selectedSessionId) {
      const activeSession = sessions.find((s: any) => s.status === 'active');
      if (activeSession) {
        setSelectedSessionId(activeSession.id.toString());
      } else {
        // Select most recent session
        const sortedSessions = [...sessions].sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setSelectedSessionId(sortedSessions[0].id.toString());
      }
    }
  }, [sessions, selectedSessionId]);

  const handleBack = () => {
    router.push(`/classroom/${classroomSlug}`);
  };

  if (authLoading || classroomLoading || sessionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Classroom Not Found</h2>
              <p className="text-gray-500 mb-4">The classroom you're looking for doesn't exist.</p>
              <Button onClick={handleBack}>Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedSession = sessions?.find((s: any) => s.id.toString() === selectedSessionId);
  const isSessionActive = selectedSession?.status === 'active';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Classroom
              </Button>
              
              <div className="h-6 w-px bg-gray-300" />
              
              <div>
                <h1 className="text-xl font-semibold">{classroom?.title || 'Classroom'}</h1>
                <p className="text-sm text-gray-500">Collaborative Whiteboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Session Selector */}
              {sessions && sessions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Session:</span>
                  <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                    <SelectTrigger className="w-60">
                      <SelectValue placeholder="Select a session" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((session: any) => (
                        <SelectItem key={session.id} value={session.id.toString()}>
                          <div className="flex items-center gap-2">
                            {session.status === 'active' && (
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
                            <span className="truncate">{session.session_name}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(session.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Session Status */}
              {selectedSession && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
                  {isSessionActive ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-green-700">Live</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="text-xs font-medium text-gray-600">Ended</span>
                    </>
                  )}
                </div>
              )}

              {/* Role Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                userRole === 'tutor' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {userRole === 'tutor' ? 'Tutor' : 'Student'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-81px)]">
        {selectedSessionId ? (
          <WhiteboardManager
            classroomSlug={classroomSlug}
            sessionId={selectedSessionId}
            userRole={userRole}
            isSessionActive={isSessionActive}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No Sessions Available</h3>
                  <p className="text-gray-500 mb-4">
                    There are no live sessions for this classroom yet.
                  </p>
                  {userRole === 'tutor' && (
                    <p className="text-sm text-gray-400">
                      Start a live session to enable whiteboard collaboration.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
