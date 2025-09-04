'use client';

import React, { useState, useEffect } from 'react';
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
import { useClassrooms } from '@/hooks/classroom/use-create-live-session';
import { 
  useLiveSessions, 
  useCreateLiveSession, 
  useUpdateLiveSession 
} from '@/hooks/classroom/use-create-live-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

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
  const { data: sessionsData, isLoading } = useLiveSessions(classroom?.id);
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

  const handleJoinSession = (sessionSlug: string) => {
    router.push(`/classroom/${classroomSlug}/live/${sessionSlug}`);
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
        classroom_id: classroom.id,
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

  const handleStatusChange = async (sessionId: number, newStatus: string) => {
    try {
      await updateSessionMutation.mutateAsync({
        session_id: sessionId,
        status: newStatus as 'scheduled' | 'live' | 'ended' | 'cancelled'
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

  return (
    <div className="container mx-auto py-8">
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
          {canManageSessions && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Session
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Schedule Live Session</DialogTitle>
                  <DialogDescription>
                    Create a new live session for your classroom.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Session title"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Session description (optional)"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="starts_at">Start Time</Label>
                    <Input
                      id="starts_at"
                      type="datetime-local"
                      value={formData.starts_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, starts_at: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ends_at">End Time</Label>
                    <Input
                      id="ends_at"
                      type="datetime-local"
                      value={formData.ends_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, ends_at: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateSession}
                    disabled={!formData.title || !formData.starts_at || !formData.ends_at}
                  >
                    Schedule Session
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Now</CardTitle>
              <Video className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{liveSessions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{scheduledSessions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Clock className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pastSessions.length}</div>
            </CardContent>
          </Card>
          <Card>
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
          <Card>
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
                    className="flex items-center justify-between p-4 border rounded-lg bg-red-50 border-red-200"
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
                      <Button onClick={() => handleJoinSession(session.slug)} className="bg-red-600 hover:bg-red-700">
                        <Play className="mr-2 h-4 w-4" />
                        Join Live
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
        <Card>
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
                    className="flex items-center justify-between p-4 border rounded-lg"
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
                      {session.status === 'live' && (
                        <Button onClick={() => handleJoinSession(session.slug)} className="bg-red-600 hover:bg-red-700">
                          <Play className="mr-2 h-4 w-4" />
                          Join Live
                        </Button>
                      )}
                      {session.status === 'scheduled' && (
                        <Button onClick={() => handleJoinSession(session.slug)} variant="outline">
                          <Video className="mr-2 h-4 w-4" />
                          View Details
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

      {/* Edit Session Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Live Session</DialogTitle>
            <DialogDescription>
              Update the session details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Session title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Session description (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-starts_at">Start Time</Label>
              <Input
                id="edit-starts_at"
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => setFormData(prev => ({ ...prev, starts_at: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-ends_at">End Time</Label>
              <Input
                id="edit-ends_at"
                type="datetime-local"
                value={formData.ends_at}
                onChange={(e) => setFormData(prev => ({ ...prev, ends_at: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateSession}
              disabled={!formData.title || !formData.starts_at || !formData.ends_at}
            >
              Update Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
