'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  UserPlus, 
  Crown, 
  Shield, 
  User, 
  MoreHorizontal,
  Copy,
  Trash2
} from 'lucide-react';
import { useClassrooms } from '@/hooks/classroom/use-create-live-session';
import { 
  useClassroomMembers, 
  useUpdateClassroomMember, 
  useRemoveClassroomMember 
} from '@/hooks/classroom/use-update-classroom-member';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getCardStyling, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';

interface ClassroomMembersPageProps {
  classroomSlug: string;
}

export function ClassroomMembersPage({ classroomSlug }: ClassroomMembersPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [classroom, setClassroom] = useState<any>(null);

  const { data: classroomsData } = useClassrooms();
  const { data: membersData, isLoading } = useClassroomMembers(classroomSlug);
  const updateMemberMutation = useUpdateClassroomMember(classroomSlug);
  const removeMemberMutation = useRemoveClassroomMember(classroomSlug);

  useEffect(() => {
    if (classroomsData?.classrooms) {
      const foundClassroom = classroomsData.classrooms.find(c => c.slug === classroomSlug);
      setClassroom(foundClassroom);
    }
  }, [classroomsData, classroomSlug]);

  const handleBack = () => {
    router.push(`/classroom/${classroomSlug}`);
  };

  const handleCopyClassCode = () => {
    if (classroom?.class_code) {
      navigator.clipboard.writeText(classroom.class_code);
      toast({
        title: "Copied!",
        description: "Class code copied to clipboard",
      });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!classroom) return;

    try {
      await updateMemberMutation.mutateAsync({
        userId: memberId,
        role: newRole as 'owner' | 'tutor' | 'student',
      });
      toast({
        title: "Success",
        description: "Member role updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update member role",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!classroom) return;

    try {
      await removeMemberMutation.mutateAsync({
        userId: memberId,
      });
      toast({
        title: "Success",
        description: `${memberName} has been removed from the classroom`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'tutor':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'tutor':
        return 'secondary';
      default:
        return 'outline';
    }
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

  const isOwner = classroom.user_role === 'owner';
  const members = membersData?.members || [];
  const currentUserRole = membersData?.current_user_role;

  // Get classroom color styling
  const classroomColor = (classroom?.color && CLASSROOM_COLORS.includes(classroom.color as ClassroomColor)) 
    ? classroom.color as ClassroomColor 
    : '#6aa84f';
  
  const cardStyling = getCardStyling(classroomColor as ClassroomColor, 'light');

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Classroom Members</h1>
            <p className="text-muted-foreground">
              Manage members and their roles in {classroom.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopyClassCode}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Share Code: {classroom.class_code}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
            </CardContent>
          </Card>
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tutors</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter(m => m.role === 'tutor').length}
              </div>
            </CardContent>
          </Card>
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter(m => m.role === 'student').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Members List */}
        <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
          <CardHeader>
            <CardTitle>Members ({members.length})</CardTitle>
            <CardDescription>
              Manage classroom members and their permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No members yet</h3>
                <p className="text-muted-foreground">
                  Share the class code to invite members
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {members.map((member, index) => (
                  <div
                    key={member.user_id || `member-${index}`}
                    className="flex items-center justify-between p-4 bg-gray-100/5 hover:bg-gray-200/8 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt={member.name || 'Unknown User'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {member.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.name || 'Unknown User'}</p>
                          {member.is_current_user && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(member.role)}
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                      </div>

                      {isOwner && !member.is_current_user && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member.user_id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="tutor">Tutor</SelectItem>
                              <SelectItem value="owner">Owner</SelectItem>
                            </SelectContent>
                          </Select>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleRemoveMember(member.user_id, member.name || 'Unknown User')}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
          <CardHeader>
            <CardTitle>How to Add Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Share the class code <strong>{classroom.class_code}</strong> with students</p>
            <p>• Students can join by entering this code on the classroom page</p>
            <p>• As owner, you can promote students to tutors or transfer ownership</p>
            <p>• Tutors can create assignments and manage live sessions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
