'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Calendar, BookOpen } from 'lucide-react';
import { useClassrooms } from '@/hooks/classroom/use-create-live-session';
import { useJoinClassroom } from '@/hooks/classroom/use-join-classroom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getCardStyling, getNextClassroomColor, CLASSROOM_COLORS, type ClassroomColor } from '@/utils/classroom/color-generator';
import { type Classroom } from '@/interface/classroom/classroom-interface';

export function ClassroomListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState('');
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const { data: classroomsData, isLoading, error } = useClassrooms();
  const joinClassroomMutation = useJoinClassroom();

  const handleCreateClassroom = () => {
    router.push('/classroom/create');
  };

  const handleJoinClassroom = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a class code",
        variant: "destructive",
      });
      return;
    }

    try {
      await joinClassroomMutation.mutateAsync({ class_code: joinCode.trim() });
      toast({
        title: "Success",
        description: "Successfully joined classroom!",
      });
      setIsJoinDialogOpen(false);
      setJoinCode('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join classroom",
        variant: "destructive",
      });
    }
  };

  const handleClassroomClick = (classroom: any) => {
    router.push(`/classroom/${classroom.slug}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-600">
          <p>Failed to load classrooms. Please try again later.</p>
        </div>
      </div>
    );
  }

  const classrooms: Classroom[] = classroomsData?.classrooms || [];

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Classrooms</h1>
          <p className="text-muted-foreground">
            Manage your classrooms and join new ones
          </p>
        </div>
        <div className="flex gap-4">
          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Join Classroom
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join Classroom</DialogTitle>
                <DialogDescription>
                  Enter the class code provided by your instructor
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="classCode">Class Code</Label>
                  <Input
                    id="classCode"
                    placeholder="Enter 8-character code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={8}
                  />
                </div>
                <Button 
                  onClick={handleJoinClassroom} 
                  className="w-full"
                  disabled={joinClassroomMutation.isPending}
                >
                  {joinClassroomMutation.isPending ? 'Joining...' : 'Join Classroom'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleCreateClassroom}>
            <Plus className="mr-2 h-4 w-4" />
            Create Classroom
          </Button>
        </div>
      </div>

      {classrooms.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No classrooms yet</h3>
          <p className="text-muted-foreground">
            Create your first classroom or join one using a class code
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Button onClick={handleCreateClassroom}>
              <Plus className="mr-2 h-4 w-4" />
              Create Classroom
            </Button>
            <Button variant="outline" onClick={() => setIsJoinDialogOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              Join Classroom
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => {
            // Get the classroom color, fallback to palette color based on ID
            const classroomColor = (classroom.color && CLASSROOM_COLORS.includes(classroom.color as ClassroomColor)) 
              ? classroom.color as ClassroomColor 
              : CLASSROOM_COLORS[classroom.id % CLASSROOM_COLORS.length];
            
            const cardStyling = getCardStyling(classroomColor, 'light');
            const hoverStyling = getCardStyling(classroomColor, 'medium');
            
            return (
              <Card 
                key={classroom.id} 
                className="cursor-pointer backdrop-blur-md transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
                onClick={() => handleClassroomClick(classroom)}
                style={{
                  backgroundColor: cardStyling.backgroundColor,
                  borderColor: cardStyling.borderColor,
                  '--hover-bg': hoverStyling.backgroundColor
                } as React.CSSProperties & { '--hover-bg': string }}
                onMouseEnter={(e) => {
                  const target = e.currentTarget;
                  const hoverBg = (target.style as any)['--hover-bg'];
                  target.style.backgroundColor = hoverBg;
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget;
                  target.style.backgroundColor = cardStyling.backgroundColor;
                }}
              >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{classroom.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {classroom.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Badge variant={classroom.visibility === 'public' ? 'default' : 'secondary'}>
                    {classroom.visibility}
                  </Badge>
                </div>
              </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Users className="mr-1 h-4 w-4" />
                      {classroom.member_count} members
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="text-xs">
                        {classroom.user_role}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        Joined {new Date(classroom.joined_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Badge variant="secondary" className="text-xs font-mono">
                          {classroom.class_code}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
