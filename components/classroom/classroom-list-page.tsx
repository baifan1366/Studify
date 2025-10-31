'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/profile/use-user';
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
  const t = useTranslations('ClassroomList');
  const { data: currentUser } = useUser();
  const [joinCode, setJoinCode] = useState('');
  const [password, setPassword] = useState('');
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const { data: classroomsData, isLoading, error } = useClassrooms();
  const joinClassroomMutation = useJoinClassroom();

  const handleCreateClassroom = () => {
    const isTutor = currentUser?.profile?.role === 'tutor';
    const route = isTutor 
      ? '/tutor/classroom/create'
      : '/classroom/create';
    router.push(route);
  };

  const handleJoinClassroom = async () => {
    if (!joinCode.trim()) {
      toast({
        title: t('error'),
        description: t('enter_class_code_error'),
        variant: "destructive",
      });
      return;
    }

    try {
      await joinClassroomMutation.mutateAsync({ 
        class_code: joinCode.trim(),
        password: password.trim() || undefined
      });
      toast({
        title: t('success'),
        description: t('joined_successfully'),
      });
      setIsJoinDialogOpen(false);
      setJoinCode('');
      setPassword('');
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message || t('failed_to_join'),
        variant: "destructive",
      });
    }
  };

  const handleClassroomClick = (classroom: any) => {
    const isTutor = currentUser?.profile?.role === 'tutor';
    const route = isTutor 
      ? `/tutor/classroom/${classroom.slug}`
      : `/classroom/${classroom.slug}`;
    router.push(route);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-4 md:py-8 px-4 md:px-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-4 md:py-8 px-4 md:px-6">
        <div className="text-center text-red-600">
          <p>{t('loading_error')}</p>
        </div>
      </div>
    );
  }

  const classrooms: Classroom[] = (classroomsData?.classrooms || []).map(classroom => ({
    ...classroom,
    color: classroom.color ?? undefined
  }));

  return (
    <div className="container mx-auto py-4 md:py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('my_classrooms')}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t('manage_classrooms_description')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-4 w-full md:w-auto">
          <Dialog open={isJoinDialogOpen} onOpenChange={(open) => {
            setIsJoinDialogOpen(open);
            if (!open) {
              setJoinCode('');
              setPassword('');
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Users className="mr-2 h-4 w-4" />
                {t('join_classroom')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('join_classroom')}</DialogTitle>
                <DialogDescription>
                  {t('enter_class_code_description')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="classCode" className="pb-2">{t('class_code')}</Label>
                  <Input
                    id="classCode"
                    placeholder={t('enter_code_placeholder')}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={8}
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="pb-2">
                    {t('password')} <span className="text-xs text-muted-foreground">({t('optional_for_private')})</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('enter_password_placeholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleJoinClassroom} 
                  className="w-full"
                  disabled={joinClassroomMutation.isPending}
                >
                  {joinClassroomMutation.isPending ? t('joining') : t('join_classroom')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleCreateClassroom} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            {t('create_classroom')}
          </Button>
        </div>
      </div>

      {classrooms.length === 0 ? (
        <div className="text-center py-8 md:py-12">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-base md:text-lg font-semibold">{t('no_classrooms_yet')}</h3>
          <p className="text-sm md:text-base text-muted-foreground">
            {t('create_or_join_description')}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2 md:gap-4 px-4 sm:px-0">
            <Button onClick={handleCreateClassroom} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t('create_classroom')}
            </Button>
            <Button variant="outline" onClick={() => setIsJoinDialogOpen(true)} className="w-full sm:w-auto">
              <Users className="mr-2 h-4 w-4" />
              {t('join_classroom')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => {
            // Use the color from database, with fallback to first color in palette
            const classroomColor = (classroom.color && CLASSROOM_COLORS.includes(classroom.color as ClassroomColor)) 
              ? classroom.color as ClassroomColor 
              : CLASSROOM_COLORS[0];
            
            const cardStyling = getCardStyling(classroomColor, 'light');
            const hoverStyling = getCardStyling(classroomColor, 'medium');
            
            return (
              <Card 
                key={classroom.id} 
                className="cursor-pointer backdrop-blur-md transition-all duration-200 hover:scale-[1.01] md:hover:scale-[1.02] hover:shadow-xl touch-target"
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
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <CardTitle className="text-base md:text-lg line-clamp-1">{classroom.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs md:text-sm line-clamp-2">
                      {classroom.description || t('no_description')}
                    </CardDescription>
                  </div>
                  <Badge variant={classroom.visibility === 'public' ? 'default' : 'secondary'} className="flex-shrink-0 text-xs">
                    {classroom.visibility}
                  </Badge>
                </div>
              </CardHeader>
                <CardContent className="pt-3">
                  <div className="flex justify-between items-center text-xs md:text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Users className="mr-1 h-4 w-4" />
                      {t('members_count', { count: classroom.member_count })}
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="text-xs">
                        {classroom.user_role}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 md:mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        {t('joined_date', { date: new Date(classroom.joined_at).toLocaleDateString() })}
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
