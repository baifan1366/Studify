'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import MeetingContainer from '@/components/classroom/meeting/meeting-container';
import { useMeeting, useMeetingToken } from '@/hooks/use-meeting';

interface MeetingPageContentProps {
  meetingId: string;
}

export default function MeetingPageContent({ meetingId }: MeetingPageContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  // 获取会议信息
  const { data: meetingData, isLoading, error } = useMeeting(meetingId);

  // 获取LiveKit令牌
  const { data: tokenData, isLoading: isTokenLoading } = useMeetingToken(
    meetingId,
    meetingData?.userRole || 'participant'
  );

  // 设置令牌
  useEffect(() => {
    if (tokenData?.token) {
      setToken(tokenData.token);
    }
  }, [tokenData]);

  // 处理错误
  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: '会议加载失败',
        description: (error as Error).message,
      });
      // 5秒后重定向到课程页面
      setTimeout(() => {
        router.push('/dashboard/courses');
      }, 5000);
    }
  }, [error, toast, router]);

  // 加载状态
  if (isLoading || isTokenLoading || !token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-lg font-medium">
          {isLoading ? '正在加载会议信息...' : '正在准备会议室...'}
        </p>
      </div>
    );
  }

  // 渲染会议容器
  return (
    <MeetingContainer
      meetingId={meetingId}
      token={token}
      userId={meetingData?.userId || ''}
      role={meetingData?.userRole || 'participant'}
    />
  );
}