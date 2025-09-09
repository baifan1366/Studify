'use client';

import { useState, useEffect } from 'react';
import { 
  LiveKitRoom, 
  VideoConference, 
  GridLayout, 
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useParticipants,
  useRoomContext,
  LayoutContextProvider
} from '@livekit/components-react';
import { Track, Room, RoomEvent, Participant } from 'livekit-client';
import { useLiveKitToken } from '@/hooks/classroom/use-livekit-token';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { toast } from 'sonner';

interface LiveClassroomProps {
  classroomSlug: string;
  sessionId: string;
  participantName: string;
  userRole: 'student' | 'tutor';
  onSessionEnd?: () => void;
}

export default function LiveClassroom({
  classroomSlug,
  sessionId,
  participantName,
  userRole,
  onSessionEnd
}: LiveClassroomProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const {
    tokenData,
    isLoading,
    error,
    generateToken,
    refreshToken
  } = useLiveKitToken({
    classroomSlug,
    sessionId,
    participantName,
    autoRefresh: true
  });

  // 初始化时生成 Token
  useEffect(() => {
    if (!tokenData && !isLoading && !error) {
      generateToken();
    }
  }, [tokenData, isLoading, error, generateToken]);

  const handleConnect = () => {
    if (!tokenData) {
      generateToken();
    }
  };

  const handleDisconnected = () => {
    setIsConnected(false);
    toast.info('已断开连接');
  };

  const handleConnected = () => {
    setIsConnected(true);
    setConnectionError(null);
    toast.success('成功连接到课堂');
  };

  const handleError = (error: Error) => {
    setConnectionError(error.message);
    toast.error(`连接错误: ${error.message}`);
  };

  if (isLoading) {
    return (
      <Card className="w-full h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>正在准备课堂...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !tokenData) {
    return (
      <Card className="w-full h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center space-y-4">
            <p className="text-red-500">
              {error instanceof Error ? error.message : error || '无法获取课堂访问权限'}
            </p>
            <Button onClick={handleConnect} variant="outline">
              重新连接
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full h-screen bg-background">
      <LiveKitRoom
        token={tokenData.token}
        serverUrl={tokenData.wsUrl}
        connect={true}
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        onError={handleError}
        options={{
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            videoSimulcastLayers: [
              { 
                width: 640, 
                height: 360, 
                resolution: { width: 640, height: 360 }, 
                encoding: { maxBitrate: 500_000 } 
              },
              { 
                width: 1280, 
                height: 720, 
                resolution: { width: 1280, height: 720 }, 
                encoding: { maxBitrate: 1_200_000 } 
              },
            ],
          },
        }}
        className="h-full"
      >
        <LayoutContextProvider>
          <ClassroomContent 
            userRole={userRole}
            participantName={participantName}
            onSessionEnd={onSessionEnd}
          />
          <RoomAudioRenderer />
        </LayoutContextProvider>
      </LiveKitRoom>
    </div>
  );
}

interface ClassroomContentProps {
  userRole: 'student' | 'tutor';
  participantName: string;
  onSessionEnd?: () => void;
}

function ClassroomContent({ userRole, participantName, onSessionEnd }: ClassroomContentProps) {
  const room = useRoomContext();
  const participants = useParticipants();
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  const [isRecording, setIsRecording] = useState(false);

  // 主持人控制功能
  const handleStartRecording = async () => {
    if (userRole !== 'tutor') return;
    
    try {
      // 这里需要调用后端 API 开始录制
      // await startRecording(sessionId);
      setIsRecording(true);
      toast.success('开始录制');
    } catch (error) {
      toast.error('录制启动失败');
    }
  };

  const handleStopRecording = async () => {
    if (userRole !== 'tutor') return;
    
    try {
      // 这里需要调用后端 API 停止录制
      // await stopRecording(sessionId);
      setIsRecording(false);
      toast.success('录制已停止');
    } catch (error) {
      toast.error('录制停止失败');
    }
  };

  const handleEndSession = async () => {
    if (userRole !== 'tutor') return;
    
    try {
      // 断开所有连接
      await room?.disconnect();
      onSessionEnd?.();
      toast.success('课堂已结束');
    } catch (error) {
      toast.error('结束课堂失败');
    }
  };

  const handleRemoveParticipant = async (participant: Participant) => {
    if (userRole !== 'tutor') return;
    
    try {
      // 这里需要调用后端 API 移除参与者
      // await removeParticipant(sessionId, participant.identity);
      toast.success(`已移除 ${participant.name || participant.identity}`);
    } catch (error) {
      toast.error('移除参与者失败');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between p-4 bg-card border-b">
        <div className="flex items-center space-x-4">
          <Badge variant={room?.state === 'connected' ? 'default' : 'secondary'}>
            {room?.state === 'connected' ? '已连接' : '连接中...'}
          </Badge>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>{participants.length} 人在线</span>
          </div>
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              录制中
            </Badge>
          )}
        </div>

        {/* 主持人控制按钮 */}
        {userRole === 'tutor' && (
          <div className="flex items-center space-x-2">
            {!isRecording ? (
              <Button onClick={handleStartRecording} size="sm" variant="outline">
                开始录制
              </Button>
            ) : (
              <Button onClick={handleStopRecording} size="sm" variant="outline">
                停止录制
              </Button>
            )}
            <Button onClick={handleEndSession} size="sm" variant="destructive">
              结束课堂
            </Button>
          </div>
        )}
      </div>

      {/* 主要视频区域 */}
      <div className="flex-1 relative">
        <VideoConference />
      </div>

      {/* 底部控制栏 */}
      <div className="p-4 bg-card border-t">
        <ControlBar 
          variation="verbose"
          controls={{
            microphone: true,
            camera: true,
            chat: true,
            screenShare: userRole === 'tutor', // 只有导师可以屏幕共享
            leave: true,
          }}
        />
      </div>

      {/* 参与者列表（主持人可见） */}
      {userRole === 'tutor' && (
        <ParticipantsList 
          participants={participants}
          onRemoveParticipant={handleRemoveParticipant}
        />
      )}
    </div>
  );
}

interface ParticipantsListProps {
  participants: Participant[];
  onRemoveParticipant: (participant: Participant) => void;
}

function ParticipantsList({ participants, onRemoveParticipant }: ParticipantsListProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-20 right-4 w-64 z-10">
      <Card className={`transition-all duration-200 ${isOpen ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}>
        <CardHeader 
          className="cursor-pointer pb-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <CardTitle className="text-sm flex items-center justify-between">
            参与者列表 ({participants.length})
            <Users className="h-4 w-4" />
          </CardTitle>
        </CardHeader>
        {isOpen && (
          <CardContent className="pt-0 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {participants.map((participant) => (
                <div 
                  key={participant.identity}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {participant.isMicrophoneEnabled ? (
                        <Mic className="h-3 w-3 text-green-500" />
                      ) : (
                        <MicOff className="h-3 w-3 text-red-500" />
                      )}
                      {participant.isCameraEnabled ? (
                        <Video className="h-3 w-3 text-green-500" />
                      ) : (
                        <VideoOff className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                    <span className="text-sm truncate">
                      {participant.name || participant.identity}
                    </span>
                  </div>
                  {!participant.isLocal && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveParticipant(participant)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
