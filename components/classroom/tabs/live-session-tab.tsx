'use client';

import React from 'react';
import { Video, Calendar, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCardStyling, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';

interface LiveSessionTabProps {
  liveSessionsData: any;
  isOwnerOrTutor: boolean;
  classroomSlug: string;
  navigateToSection: (section: string) => void;
  router: any;
  classroom?: any;
}

export function LiveSessionTab({ liveSessionsData, isOwnerOrTutor, classroomSlug, navigateToSection, router, classroom }: LiveSessionTabProps) {
  const upcomingSessions = liveSessionsData?.sessions?.filter((s: any) => s.status === 'scheduled') || [];
  const liveSessions = liveSessionsData?.sessions?.filter((s: any) => s.status === 'live') || [];

  // Get classroom color
  const classroomColor = (classroom?.color && CLASSROOM_COLORS.includes(classroom.color as ClassroomColor)) 
    ? classroom.color as ClassroomColor 
    : '#6aa84f';
  
  const cardStyling = getCardStyling(classroomColor as ClassroomColor, 'light');

  return (
    <Card 
      style={{
        backgroundColor: cardStyling.backgroundColor,
        borderColor: cardStyling.borderColor
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Live Sessions</CardTitle>
          <CardDescription>Manage and join live classroom sessions</CardDescription>
        </div>
        {isOwnerOrTutor && (
          <Button onClick={() => navigateToSection('live')}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Session
          </Button>
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
                <div key={session.id} className="flex justify-between items-center p-4 border border-green-200 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-green-800">{session.title}</p>
                    <p className="text-sm text-green-600">
                      Started at {new Date(session.starts_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button 
                    onClick={() => router.push(`/classroom/${classroomSlug}/live/${session.id}`)}
                    className="bg-green-600 hover:bg-green-700"
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
            <div className="text-center py-8">
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
                <div key={session.id} className="flex justify-between items-center p-4 border rounded-lg">
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