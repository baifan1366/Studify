'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { CollaborativeWhiteboard } from './collaborative-whiteboard';
import { CollaborativeChat } from './collaborative-chat';
import { generateRoomId, RoomProvider, initialStorage } from '@/lib/liveblocks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Paintbrush, 
  MessageSquare, 
  Users, 
  Video, 
  Settings,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff
} from 'lucide-react';

interface ClassroomCollaborationProps {
  classroomSlug: string;
  sessionId?: string;
  className?: string;
}

export function ClassroomCollaboration({ 
  classroomSlug, 
  sessionId,
  className = ""
}: ClassroomCollaborationProps) {
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('whiteboard');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">需要登录</h3>
            <p className="text-gray-500">请先登录以参与实时协作</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const userInfo = {
    id: user.id,
    name: user.display_name || user.email,
    avatar: user.avatar_url || '',
    role: (user.role || 'student') as 'student' | 'tutor',
  };

  const whiteboardRoomId = generateRoomId(classroomSlug, 'whiteboard', sessionId);
  const chatRoomId = generateRoomId(classroomSlug, 'chat', sessionId);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className={`h-full flex flex-col bg-gray-50 ${className}`}>
      {/* 协作工具栏 */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              🎨 实时协作空间
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
                {connectionStatus === 'connected' ? (
                  <>
                    <Wifi className="w-3 h-3 mr-1" />
                    已连接
                  </>
                ) : connectionStatus === 'connecting' ? (
                  '连接中...'
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 mr-1" />
                    已断开
                  </>
                )}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {userInfo.role === 'tutor' ? '导师' : '学生'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex-1 flex gap-4">
        {/* 主要协作区域 */}
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="whiteboard" className="flex items-center gap-2">
                <Paintbrush className="w-4 h-4" />
                协作白板
              </TabsTrigger>
              <TabsTrigger value="materials" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                课程内容
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                设置
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="whiteboard" className="h-full mt-4">
              <Card className="h-full">
                <CardContent className="p-4 h-full">
                  <CollaborativeWhiteboard 
                    roomId={whiteboardRoomId}
                    userInfo={userInfo}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="materials" className="h-full mt-4">
              <Card className="h-full">
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">课程资料</h3>
                    <p>这里将显示课程相关的材料和资源</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="h-full mt-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>协作设置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">用户信息</h4>
                    <div className="space-y-2 text-sm">
                      <div>用户名: {userInfo.name}</div>
                      <div>角色: {userInfo.role === 'tutor' ? '导师' : '学生'}</div>
                      <div>房间ID: {whiteboardRoomId}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">连接状态</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {connectionStatus === 'connected' ? (
                          <Wifi className="w-4 h-4 text-green-500" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm">{connectionStatus}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 聊天侧边栏 */}
        <Card className="w-80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              实时聊天
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100vh-200px)]">
            <RoomProvider
              id={chatRoomId}
              initialPresence={{
                cursor: null,
                userName: userInfo.name,
                userAvatar: userInfo.avatar,
                userRole: userInfo.role,
                isDrawing: false,
              }}
              initialStorage={initialStorage}
            >
              <CollaborativeChat />
            </RoomProvider>
          </CardContent>
        </Card>
      </div>

      {/* 底部状态栏 */}
      <Card className="mt-4">
        <CardContent className="py-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>教室: {classroomSlug}</span>
              {sessionId && <span>会话: {sessionId}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span>实时协作由 Liveblocks 提供支持</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
