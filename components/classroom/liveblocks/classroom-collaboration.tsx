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
            <h3 className="text-lg font-medium mb-2">Login Required</h3>
            <p className="text-gray-500">Please log in first to participate in real-time collaboration</p>
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

  // Listen for fullscreen state changes
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
      {/* Collaboration toolbar */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              🎨 Real-time Collaboration Space
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
                  <>
                    <Wifi className="w-3 h-3 mr-1" />
                    Connected
                  </>
                ) : connectionStatus === 'connecting' ? (
                  <span className="animate-pulse">Connecting...</span>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 mr-1" />
                    Disconnected
                  </>
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {userInfo.role === 'tutor' ? 'Tutor' : 'Student'}
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
        {/* Main collaboration area */}
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="whiteboard" className="flex items-center gap-2">
                <Paintbrush className="w-4 h-4" />
                Collaborative Whiteboard
              </TabsTrigger>
              <TabsTrigger value="materials" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Course Content
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
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
                    <h3 className="text-lg font-medium mb-2">Course Materials</h3>
                    <p>Course-related materials and resources will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="h-full mt-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Collaboration Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">User Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>Username: {userInfo.name}</div>
                      <div>Role: {userInfo.role === 'tutor' ? 'Tutor' : 'Student'}</div>
                      <div>Room ID: {whiteboardRoomId}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Connection Status</h4>
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

        {/* Chat sidebar */}
        <Card className="w-80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Real-time Chat
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
                selection: null,
                userColor: '#000000',
              }}
              initialStorage={initialStorage}
            >
              <CollaborativeChat />
            </RoomProvider>
          </CardContent>
        </Card>
      </div>

      {/* Bottom status bar */}
      <Card className="mt-4">
        <CardContent className="py-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>Classroom: {classroomSlug}</span>
              {sessionId && <span>Session: {sessionId}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span>Real-time collaboration powered by Liveblocks</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
