"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, X } from 'lucide-react';
import { useJoinCourse } from '@/hooks/course/use-enrolled-courses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';

interface JoinCourseDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JoinCourseDialog({ isOpen, onClose }: JoinCourseDialogProps) {
  const [courseId, setCourseId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [activeTab, setActiveTab] = useState('courseId');
  
  const joinCourseMutation = useJoinCourse();
  const t = useTranslations('JoinCourseDialog');

  const handleJoinCourse = async () => {
    if (activeTab === 'courseId' && !courseId) {
      return;
    }
    
    if (activeTab === 'inviteCode' && !inviteCode) {
      return;
    }
    
    try {
      await joinCourseMutation.mutateAsync({
        courseId: activeTab === 'courseId' ? courseId : '',
        inviteCode: activeTab === 'inviteCode' ? inviteCode : '',
      });
      
      // 成功后重置表单并关闭对话框
      setCourseId('');
      setInviteCode('');
      onClose();
    } catch (error) {
      // 错误处理在useJoinCourse hook中已经实现
      console.error('Failed to join course:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white/10 backdrop-blur-xl border-white/20 text-white rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-white/70">
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="courseId" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger value="courseId" className="data-[state=active]:bg-white/10">
              {t('tabs.course_id')}
            </TabsTrigger>
            <TabsTrigger value="inviteCode" className="data-[state=active]:bg-white/10">
              {t('tabs.invite_code')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="courseId" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courseId" className="text-white/80">{t('labels.course_id')}</Label>
              <Input
                id="courseId"
                placeholder={t('placeholders.course_id')}
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
              />
              <p className="text-xs text-white/60">
                {t('helpers.course_id')}
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="inviteCode" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="text-white/80">{t('labels.invite_code')}</Label>
              <Input
                id="inviteCode"
                placeholder={t('placeholders.invite_code')}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
              />
              <p className="text-xs text-white/60">
                {t('helpers.invite_code')}
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/20 text-white hover:bg-white/10 hover:text-white"
          >
            {t('buttons.cancel')}
          </Button>
          <Button
            onClick={handleJoinCourse}
            disabled={joinCourseMutation.isPending || (activeTab === 'courseId' && !courseId) || (activeTab === 'inviteCode' && !inviteCode)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {joinCourseMutation.isPending ? (
              <>
                <Skeleton className="h-4 w-4 rounded-full mr-2" />
                {t('buttons.joining')}
              </>
            ) : (
              t('buttons.join')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}