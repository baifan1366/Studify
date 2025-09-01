"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, X } from 'lucide-react';
import { useJoinCourse } from '@/hooks/use-enrolled-courses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface JoinCourseDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JoinCourseDialog({ isOpen, onClose }: JoinCourseDialogProps) {
  const [courseId, setCourseId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [activeTab, setActiveTab] = useState('courseId');
  
  const joinCourseMutation = useJoinCourse();

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
            Join a Course
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Enter a course ID or invitation code to join a course
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="courseId" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger value="courseId" className="data-[state=active]:bg-white/10">
              Course ID
            </TabsTrigger>
            <TabsTrigger value="inviteCode" className="data-[state=active]:bg-white/10">
              Invite Code
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="courseId" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courseId" className="text-white/80">Course ID</Label>
              <Input
                id="courseId"
                placeholder="Enter course ID"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
              />
              <p className="text-xs text-white/60">
                You can find the course ID in the course URL or ask your instructor
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="inviteCode" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="text-white/80">Invitation Code</Label>
              <Input
                id="inviteCode"
                placeholder="Enter invitation code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
              />
              <p className="text-xs text-white/60">
                Enter the invitation code provided by your instructor
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
            Cancel
          </Button>
          <Button
            onClick={handleJoinCourse}
            disabled={joinCourseMutation.isPending || (activeTab === 'courseId' && !courseId) || (activeTab === 'inviteCode' && !inviteCode)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {joinCourseMutation.isPending ? (
              <>
                <Skeleton className="h-4 w-4 rounded-full mr-2" />
                Joining...
              </>
            ) : (
              'Join Course'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}