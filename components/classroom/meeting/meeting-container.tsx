'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Room, RoomEvent } from 'livekit-client';
import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  ControlBar,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import MeetingParticipants from './meeting-participants';
import MeetingChat from './meeting-chat';
import MeetingWhiteboard from './meeting-whiteboard';
import MeetingCopilot from './meeting-copilot';

interface MeetingContainerProps {
  meetingId: string;
  token: string;
  userId: string;
  role: string;
}

export default function MeetingContainer({
  meetingId,
  token,
  userId,
  role,
}: MeetingContainerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('participants');
  const [showSidebar, setShowSidebar] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 处理房间连接事件
  const handleRoomConnected = (room: Room) => {
    setRoom(room);
    setIsConnected(true);
    setIsLoading(false);
    toast({
      title: '已连接到会议',
      description: `会议ID: ${meetingId}`,
    });
  };

  // 处理房间断开连接事件
  const handleRoomDisconnected = () => {
    setIsConnected(false);
    setRoom(null);
    toast({
      title: '已断开会议连接',
      description: '您已离开会议',
    });
    router.push('/classroom');
  };

  // 处理房间错误事件
  const handleRoomError = (error: Error) => {
    setError(error.message);
    setIsLoading(false);
    toast({
      variant: 'destructive',
      title: '连接错误',
      description: error.message,
    });
  };

  // 结束会议
  const handleEndMeeting = async () => {
    if (role === 'teacher') {
      try {
        const response = await fetch(`/api/meeting/${meetingId}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('结束会议失败');
        }

        toast({
          title: '会议已结束',
          description: '所有参与者将被断开连接',
        });
      } catch (error) {
        console.error('结束会议失败:', error);
        toast({
          variant: 'destructive',
          title: '结束会议失败',
          description: '请稍后再试',
        });
      }
    }

    // 无论是否为教师，都断开当前用户的连接
    if (room) {
      await room.disconnect();
    }
    router.push('/classroom');
  };

  // 如果加载超时，显示错误
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setError('连接超时，请检查网络连接并刷新页面');
        setIsLoading(false);
      }
    }, 15000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="text-red-500 text-xl font-bold mb-4">连接错误</div>
        <div className="text-gray-700 mb-6">{error}</div>
        <Button onClick={() => router.push('/classroom')}>返回教室</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <div className="text-gray-700">正在连接到会议...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
        onConnected={handleRoomConnected}
        onDisconnected={handleRoomDisconnected}
        onError={handleRoomError}
        className="h-full flex flex-col"
      >
        <div className="flex flex-1 overflow-hidden">
          {/* 主视窗区域 */}
          <div className="flex-1 overflow-hidden">
            <VideoConference />
          </div>

          {/* 侧边栏 */}
          {showSidebar && (
            <div className="w-80 border-l border-border flex flex-col bg-card">
              <div className="flex items-center justify-between p-2 border-b border-border">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="participants">参与者</TabsTrigger>
                    <TabsTrigger value="chat">聊天</TabsTrigger>
                    <TabsTrigger value="copilot">AI助手</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSidebar(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="participants" className="m-0">
                  <MeetingParticipants meetingId={meetingId} />
                </TabsContent>
                <TabsContent value="chat" className="m-0 h-full">
                  <MeetingChat meetingId={meetingId} userId={userId} />
                </TabsContent>
                <TabsContent value="copilot" className="m-0">
                  <MeetingCopilot meetingId={meetingId} />
                </TabsContent>
              </div>
            </div>
          )}
        </div>

        {/* 底部工具栏 */}
        <div className="border-t border-border p-2 flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            {!showSidebar && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSidebar(true)}
              >
                打开侧边栏
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('whiteboard')}
            >
              白板
            </Button>
          </div>

          <ControlBar
            controls={{
              camera: true,
              microphone: true,
              screenShare: true,
              leave: false,
            }}
          />

          <Button
            variant="destructive"
            size="sm"
            onClick={handleEndMeeting}
          >
            {role === 'teacher' ? '结束会议' : '离开会议'}
          </Button>
        </div>
      </LiveKitRoom>

      {/* 白板模态框 */}
      {activeTab === 'whiteboard' && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-2 border-b border-border">
              <h2 className="text-lg font-semibold">协作白板</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveTab('participants')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <MeetingWhiteboard meetingId={meetingId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}