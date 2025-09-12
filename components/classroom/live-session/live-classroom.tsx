'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LiveKitRoom, 
  GridLayout,
  CarouselLayout,
  FocusLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  useRoomContext,
  LayoutContextProvider
} from '@livekit/components-react';
import { Track, Room, RoomEvent, Participant } from 'livekit-client';
import { useLiveKitToken } from '@/hooks/classroom/use-livekit-token';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Users, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Share,
  MessageCircle,
  MoreVertical,
  Star,
  Heart,
  Zap,
  Settings,
  Maximize,
  Volume2,
  VolumeX,
  Pin,
  Grid3X3,
  Presentation,
  Hand,
  Coffee,
  Sparkles
} from 'lucide-react';
import { ChatTabs } from '../tabs/chat-tabs';
import { toast } from 'sonner';
import BottomControls from './bottom-controls';

interface LiveClassroomProps {
  classroomSlug: string;
  sessionId: string;
  participantName: string;
  userRole: 'student' | 'tutor';
  onSessionEnd?: () => void;
  classroomColor?: string;
}

export default function LiveClassroom({
  classroomSlug,
  sessionId,
  participantName,
  userRole,
  onSessionEnd,
  classroomColor = '#6366f1'
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
    // LiveKitRoom
    <div
      className="relative w-full h-[110dvh] bg-background "
      style={{
        // 预留底部空间，避免固定底部控件被遮挡，并适配安全区
        paddingBottom: 'calc(env(safe-area-inset-bottom, 100px) + 4.5rem)'
      }}
    >
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
            classroomColor={classroomColor}
            isConnected={isConnected}
            connectionError={connectionError}
            onRefreshToken={() => { void refreshToken(); }}
            classroomSlug={classroomSlug}
            sessionId={sessionId}
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
  classroomColor?: string;
  isConnected?: boolean;
  connectionError?: string | null;
  onRefreshToken?: () => Promise<void> | void;
  classroomSlug: string;
  sessionId: string;
}

function ClassroomContent({ userRole, participantName, onSessionEnd, classroomColor = '#6366f1', isConnected, connectionError, onRefreshToken, classroomSlug, sessionId }: ClassroomContentProps) {
  const room = useRoomContext();
  const participants = useParticipants();
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  const [isRecording, setIsRecording] = useState(false);
  const [layout, setLayout] = useState('grid');
  const [reactions, setReactions] = useState<{ id: number; type: string; at: number }[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<{
    id: number;
    type: string;
    x: number;
    y: number;
  }[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  // 选中的聚焦轨道，用于手动放大某个视频
  const [selectedTrackRef, setSelectedTrackRef] = useState<any | null>(null);
  // Chat panel state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format session duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Add floating reactions
  const addReaction = (type: string) => {
    const newReaction = {
      id: Date.now(),
      type,
      x: Math.random() * 100,
      y: Math.random() * 100
    };
    setFloatingReactions(prev => [...prev, newReaction]);
    // 记录最近的反应，便于在 UI 中显示（最多 5 条）
    setReactions(prev => {
      const next = [...prev, { id: newReaction.id, type, at: Date.now() }];
      return next.slice(-5);
    });
    
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 3000);
  };

  const reactionEmojis: Record<string, string> = {
    heart: '❤️',
    clap: '👏',
    thumbs: '👍',
    fire: '🔥',
    mind: '🤯',
    rocket: '🚀'
  };

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

  // Layout selector component with motion
  const LayoutSelector = () => (
    <motion.div 
      className="flex items-center space-x-2 bg-black/20 backdrop-blur-sm rounded-lg p-1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {[
        { key: 'grid', icon: Grid3X3, label: 'Grid' },
        { key: 'presentation', icon: Presentation, label: 'Presentation' },
        { key: 'focus', icon: Maximize, label: 'Focus' }
      ].map(({ key, icon: Icon, label }) => (
        <motion.button
          key={key}
          onClick={() => setLayout(key)}
          className={`p-2 rounded-md relative ${
            layout === key 
              ? 'text-white' 
              : 'text-white/60 hover:text-white'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={label}
        >
          <Icon className="w-4 h-4" />
          {layout === key && (
            <motion.div
              className="absolute inset-0 bg-white/20 rounded-md"
              layoutId="activeLayout"
              initial={false}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </motion.div>
  );

  // Reaction bar component with motion
  const ReactionBar = () => (
    <motion.div 
      className="flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {Object.entries(reactionEmojis).map(([key, emoji], index) => (
        <motion.button
          key={key}
          onClick={() => addReaction(key)}
          className="text-xl hover:drop-shadow-lg"
          whileHover={{ scale: 1.25 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1, duration: 0.2 }}
        >
          {emoji}
        </motion.button>
      ))}
    </motion.div>
  );

  // Generate classroom color variants
  const getClassroomColors = (baseColor: string) => {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return {
      primary: baseColor,
      light: `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`,
      dark: `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`,
      gradient: `linear-gradient(135deg, ${baseColor}20, ${baseColor}40, ${baseColor}60)`
    };
  };

  const colors = getClassroomColors(classroomColor);

  return (
    <div
      className="relative w-full overflow-hidden flex flex-col min-h-0"
      style={{
        // 限制高度，不超过 LiveKitRoom 的 safe-area-inset-bottom 预留空间
        height: 'calc(100dvh - (env(safe-area-inset-bottom, 0px) + 4.5rem))',
        background: `linear-gradient(135deg, ${colors.dark}70, ${colors.primary}40)`
      }}
    >
      <FloatingReactions floatingReactions={floatingReactions} reactionEmojis={reactionEmojis} />
      <ClassroomHeader 
        colors={colors} 
        participants={participants} 
        room={room}
        userRole={userRole}
        isRecording={isRecording}
        layout={layout}
        setLayout={setLayout}
        participantName={participantName}
        reactions={reactions}
        isConnected={isConnected}
        connectionError={connectionError}
        onRefreshToken={onRefreshToken}
      />
      <MainContent layout={layout} participants={participants} tracks={tracks} colors={colors} selectedTrackRef={selectedTrackRef} setSelectedTrackRef={setSelectedTrackRef} setLayout={setLayout} />
      <BottomControls
        colors={colors}
        userRole={userRole}
        isRecording={isRecording}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onEndSession={handleEndSession}
        sessionDuration={sessionDuration}
        formatDuration={formatDuration}
        addReaction={addReaction}
        reactionEmojis={reactionEmojis}
      />
      {userRole === 'tutor' && (
        <EnhancedParticipantsList participants={participants} onRemoveParticipant={handleRemoveParticipant} />
      )}
      <ChatTabs
        classroomSlug={classroomSlug}
        sessionId={parseInt(sessionId)}
        currentUserId={room?.localParticipant?.identity || 'unknown'}
        currentUserName={participantName}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px) scale(1); opacity: 1; }
          50% { transform: translateY(-100px) scale(1.2); opacity: 0.8; }
          100% { transform: translateY(-200px) scale(0.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Floating Reactions Component
function FloatingReactions({ floatingReactions, reactionEmojis }: { floatingReactions: any[], reactionEmojis: Record<string, string> }) {
  return (
    <AnimatePresence>
      {floatingReactions.map((reaction) => (
        <motion.div
          key={reaction.id}
          className="absolute pointer-events-none z-20"
          style={{ left: `${reaction.x}%`, top: `${reaction.y}%` }}
          initial={{ opacity: 1, scale: 1, y: 0 }}
          animate={{ opacity: [1, 0.8, 0], scale: [1, 1.2, 0.8], y: [-200] }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 3, ease: "easeOut" }}
        >
          <motion.div
          className="text-4xl drop-shadow-lg opacity-90"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          {reactionEmojis[reaction.type as keyof typeof reactionEmojis]}
        </motion.div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

// ClassroomHeader Component
function ClassroomHeader({ colors, participants, room, userRole, isRecording, layout, setLayout, participantName, reactions, isConnected, connectionError, onRefreshToken }: any) {
  // 使用 Room 和 RoomEvent：监听部分房间事件（例如参与者加入/离开）
  useEffect(() => {
    if (!room) return;
    const onJoin = (p: Participant) => {
      // 这里可以根据需要进行 UI 更新或提示
      // console.log('Participant joined:', p.identity);
    };
    const onLeave = (p: Participant) => {
      // console.log('Participant left:', p.identity);
    };
    room.on(RoomEvent.ParticipantConnected, onJoin);
    room.on(RoomEvent.ParticipantDisconnected, onLeave);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onJoin);
      room.off(RoomEvent.ParticipantDisconnected, onLeave);
    };
  }, [room]);

  // 控制台输出连接状态与错误
  useEffect(() => {
    console.log('[LiveClassroom] Connection state:', isConnected ? 'Connected' : 'Connecting');
  }, [isConnected]);

  useEffect(() => {
    if (connectionError) {
      console.error('[LiveClassroom] Connection error:', connectionError);
    }
  }, [connectionError]);

  // 使用 Room 值：校验实例类型（确保非类型级别的使用）
  useEffect(() => {
    if (room) {
      console.debug('[LiveClassroom] room instanceof Room:', room instanceof Room);
    }
  }, [room]);

  return (
    <motion.div 
      className="relative z-10 flex items-center justify-between p-6 backdrop-blur-sm border-b" 
      style={{
        backgroundColor: `${colors.primary}15`,
        borderBottomColor: `${colors.primary}30`
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            room?.state === 'connected' ? 'bg-green-400' : 'bg-yellow-400'
          }`} />
          <h1 className="text-2xl font-bold text-white">Live Classroom</h1>
        </div>
        
        <div className="flex items-center space-x-4 text-white/80">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span className="font-medium">{participants.length}</span>
          </div>
          {/* 展示当前登录者名称 */}
          <Badge variant="secondary" className="bg-white/15 text-white border-white/20">
            You: {participantName}
          </Badge>
          
          {isRecording && (
            <div className="flex items-center space-x-2 bg-red-500/20 px-3 py-1 rounded-full border border-red-400/30">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-red-300 text-sm font-medium">REC</span>
            </div>
          )}

          <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full">
            <Coffee className="w-4 h-4" />
            <span className="text-sm">{userRole === 'tutor' ? 'Teaching' : 'Learning'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* 最近的 Reactions 改为在用户框右上角显示（此处移除）*/}
        <motion.div 
          className="flex items-center space-x-2 bg-black/20 backdrop-blur-sm rounded-lg p-1"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {[
            { key: 'grid', icon: Grid3X3, label: 'Grid' },
            { key: 'presentation', icon: Presentation, label: 'Presentation' },
            { key: 'focus', icon: Maximize, label: 'Focus' }
          ].map(({ key, icon: Icon, label }) => (
            <motion.button
              key={key}
              onClick={() => setLayout(key)}
              className={`p-2 rounded-md relative ${
                layout === key 
                  ? 'text-white' 
                  : 'text-white/60 hover:text-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={label}
            >
              <Icon className="w-4 h-4" />
              {layout === key && (
                <motion.div
                  className="absolute inset-0 bg-white/20 rounded-md"
                  layoutId="activeLayout"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </motion.div>
        <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
          <Settings className="w-5 h-5 text-white" />
        </button>
        {/* 刷新 Token 按钮 */}
        <Button size="sm" variant="outline" onClick={() => onRefreshToken?.()} className="hidden md:inline">
          Refresh Token
        </Button>
      </div>
    </motion.div>
  );
}

// MainContent Component
function MainContent({ layout, participants, tracks, colors, selectedTrackRef, setSelectedTrackRef, setLayout }: any) {
  return (
    <div className="flex-1 relative overflow-hidden">
      <div className="p-2 max-w-7xl mx-auto h-full">
        <motion.div 
          className="relative rounded-2xl overflow-hidden border min-h-0 h-full" 
          style={{
            backgroundColor: `${colors.dark}15`,
            borderColor: `${colors.primary}30`,
            backdropFilter: 'blur(6px)'
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {layout === 'grid' && (
              <motion.div
                key="grid"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <GridLayoutView participants={participants} tracks={tracks} onFocusTrack={(t: any) => { setSelectedTrackRef(t); setLayout('focus'); }} />
              </motion.div>
            )}
            {layout === 'presentation' && (
              <motion.div
                key="presentation"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <PresentationLayoutView participants={participants} tracks={tracks} />
              </motion.div>
            )}
            {layout === 'focus' && (
              <motion.div
                key="focus"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <FocusLayoutView participants={participants} tracks={tracks} selectedTrackRef={selectedTrackRef} onExitFocus={() => setSelectedTrackRef(null)} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

interface ParticipantsListProps {
  participants: Participant[];
  onRemoveParticipant: (participant: Participant) => void;
}

// Custom Layout Components
interface LayoutProps {
  participants: Participant[];
  tracks: any[];
}

interface GridLayoutProps extends LayoutProps {
  onFocusTrack: (t: any) => void;
}

interface FocusLayoutProps extends LayoutProps {
  selectedTrackRef: any | null;
  onExitFocus: () => void;
}

// Adaptive Participant Tile with dynamic object-fit
interface AdaptiveParticipantTileProps {
  trackRef: any;
  className?: string;
}

function AdaptiveParticipantTile({ trackRef, className = '' }: AdaptiveParticipantTileProps) {
  const [objectFit, setObjectFit] = useState<'cover' | 'contain'>('contain');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!trackRef?.publication?.track) return;

    const track = trackRef.publication.track;
    
    // 方法1: 尝试从 track 的 dimensions 获取
    const updateObjectFit = () => {
      let width = 0;
      let height = 0;

      // 尝试从 track dimensions 获取
      if (track.dimensions) {
        width = track.dimensions.width;
        height = track.dimensions.height;
      }
      
      // 如果没有 dimensions，尝试从 video element 获取
      if ((!width || !height) && videoRef.current) {
        width = videoRef.current.videoWidth;
        height = videoRef.current.videoHeight;
      }

      if (width && height) {
        const aspectRatio = width / height;
        // 宽屏视频 (>1.5) 使用 cover，竖屏或方形视频使用 contain
        const newFit = aspectRatio > 1.5 ? 'cover' : 'contain';
        setObjectFit(newFit);
      }
    };

    // 监听 track 的维度变化
    track.on('dimensionsChanged', updateObjectFit);
    
    // 初始检查
    updateObjectFit();

    return () => {
      track.off('dimensionsChanged', updateObjectFit);
    };
  }, [trackRef]);

  // 监听 video 元素的 loadedmetadata 事件
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        const aspectRatio = video.videoWidth / video.videoHeight;
        const newFit = aspectRatio > 1.5 ? 'cover' : 'contain';
        setObjectFit(newFit);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // 如果视频已经加载，立即检查
    if (video.videoWidth && video.videoHeight) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  return (
    <div className={`adaptive-tile ${className}`}>
      <ParticipantTile 
        trackRef={trackRef} 
        className="w-full h-full"
      />
      <style jsx>{`
        .adaptive-tile :global(.lk-participant-media-video),
        .adaptive-tile :global(.lk-participant-media-video video) {
          object-fit: ${objectFit} !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </div>
  );
}

// Custom Participant Tile Component
interface CustomParticipantTileProps {
  participant: Participant;
  size?: 'small' | 'normal' | 'large';
  isPinned?: boolean;
  className?: string;
  latestReaction?: string | null;
}

function CustomParticipantTile({ participant, size = 'normal', isPinned = false, className = '', latestReaction = null }: CustomParticipantTileProps) {
  return (
    <div className={`
        relative group rounded-xl overflow-hidden transition-all duration-300
        aspect-video min-h-32
        ${isPinned ? 'ring-2 ring-yellow-400 ring-opacity-60' : ''}
        bg-gradient-to-br from-purple-900/40 to-blue-900/40 backdrop-blur-sm
        hover:scale-105 hover:shadow-2xl cursor-pointer
        ${className}
    `}>
      {/* 简化占位符：固定高度，非动画，防止开关摄像头尺寸抖动 */}
      <div className="absolute inset-0">
        {participant.isCameraEnabled ? (
          <div className="w-full h-full bg-black/20 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold">
              {(participant.name || participant.identity).charAt(0).toUpperCase()}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800/60">
            <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-gray-300" />
            </div>
          </div>
        )}
      </div>

      {/* Status indicators */}
      <div className="absolute top-2 left-2 flex space-x-1">
        {participant.isLocal && (
          <div className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full text-xs font-bold text-black flex items-center">
            <Star className="w-3 h-3 mr-1" />
            YOU
          </div>
        )}
      </div>

      {/* Audio/Video status + 最近一次 Reaction（右上角，仅展示一个） */}
      <div className="absolute top-2 right-2 flex items-center space-x-1">
        <div className={`p-1 rounded-full ${participant.isMicrophoneEnabled ? 'bg-green-500/80' : 'bg-red-500/80'}`}>
          {participant.isMicrophoneEnabled ? <Mic className="w-3 h-3 text-white" /> : <MicOff className="w-3 h-3 text-white" />}
        </div>
        {!participant.isCameraEnabled && (
          <div className="p-1 rounded-full bg-red-500/80">
            <VideoOff className="w-3 h-3 text-white" />
          </div>
        )}
        {latestReaction && (
          <div className="ml-1 px-1.5 py-0.5 rounded-full bg-black/40 border border-white/10 text-xs">
            <span>{latestReaction === 'heart' ? '❤️' : latestReaction === 'clap' ? '👏' : latestReaction === 'thumbs' ? '👍' : latestReaction === 'fire' ? '🔥' : latestReaction === 'mind' ? '🤯' : latestReaction === 'rocket' ? '🚀' : '✨'}</span>
          </div>
        )}
      </div>

      {/* Participant name */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-medium text-sm truncate">
              {participant.name || participant.identity}
            </div>
            <div className="text-white/70 text-xs flex items-center">
              <div className="w-2 h-2 rounded-full mr-1 bg-green-400" />
              active
            </div>
          </div>
          {isPinned && <Pin className="w-4 h-4 text-yellow-400" />}
        </div>
      </div>

      {/* Hover controls */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2">
        <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30">
          <Pin className="w-4 h-4" />
        </button>
        <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function GridLayoutView({ participants, tracks, onFocusTrack }: GridLayoutProps) {
  // 仅使用摄像头轨道进行网格布局判断
  const cameraTracks = tracks.filter((t: any) => t.source === Track.Source.Camera);
  const count = cameraTracks.length;
  const defaultTile = "rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900";

  // 单人时，让视频自然适应容器，不强制固定比例
  if (count <= 1) {
    const trackRef = cameraTracks[0] ?? tracks.find((t: any) => t);
    return (
      <div className="p-4">
        <div className="single-video-container w-full bg-black rounded-2xl overflow-hidden">
          <div className="single-video-content">
            {trackRef ? (
              <FocusLayout trackRef={trackRef} />
            ) : (
              <div className="w-full min-h-[300px] flex items-center justify-center bg-black/20">
                <div className="text-white/60 text-sm">No video yet…</div>
              </div>
            )}
          </div>
        </div>
        <style jsx>{`
          .single-video-container {
            /* 容器自适应内容，不强制固定高宽比 */
            display: flex;
            flex-direction: column;
          }
          .single-video-content {
            /* 让内容自然流动 */
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .single-video-content :global(.lk-focus-layout) {
            /* FocusLayout 自适应 */
            width: 100% !important;
            height: auto !important;
            min-height: 300px;
            max-height: 70vh;
          }
          .single-video-content :global(.lk-participant-media-video),
          .single-video-content :global(.lk-participant-media-video video) {
            width: 100% !important;
            height: auto !important;
            object-fit: contain !important;
            max-height: 70vh !important;
          }
        `}</style>
      </div>
    );
  }

  // 多人时，使用 LiveKit 的 GridLayout 组件
  return (
    <div className="h-full p-4" aria-label={`participants-${participants.length}`}>
      <GridLayout tracks={cameraTracks}>
        <div className="participant-grid-item relative">
          <ParticipantTile className={`w-full h-full max-w-full max-h-full ${defaultTile}`} />
          {/* 放大按钮（右上角） */}
          <button
            className="lk-button lk-focus-toggle-button absolute top-2 right-2 z-10 bg-white/20 text-white rounded-md px-2 py-1 hover:bg-white/30 opacity-0 transition-opacity"
            onClick={() => {
              // Get the trackRef from the current tile context
              const trackRef = cameraTracks[0]; // This will be properly handled by GridLayout
              onFocusTrack(trackRef);
            }}
            title="Maximize"
          >
            ⤢
          </button>
        </div>
      </GridLayout>
      <style jsx>{`
        
        .participant-grid-item {
          min-height: 120px;
          max-height: 300px;
          border-radius: 12px;
          overflow: hidden;
          background: linear-gradient(135deg, #1f2937, #374151);
          transition: all 0.2s ease;
          position: relative;
        }
        
        .participant-grid-item:hover {
          transform: scale(1.02);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }
        
        .participant-grid-item:hover .lk-focus-toggle-button {
          opacity: 1;
        }
        
        /* 奇数参与者时，最后一个居中 */
        ${count % 2 === 1 && count > 2 ? `
          .participant-grid-item:nth-child(${count}) {
            grid-column: ${Math.ceil(count / 2)} / span 1;
            justify-self: center;
            max-width: 300px;
          }
        ` : ''}
        
        /* 响应式调整 */
        @media (max-width: 768px) {
          .multi-participant-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px;
          }
          .participant-grid-item {
            min-height: 100px;
            max-height: 200px;
          }
        }
        
        @media (max-width: 480px) {
          .multi-participant-grid {
            grid-template-columns: 1fr !important;
            gap: 6px;
          }
          .participant-grid-item {
            min-height: 150px;
            max-height: 250px;
          }
        }
      `}</style>
    </div>
  );
}

function PresentationLayoutView({ participants, tracks }: LayoutProps) {
  const presenterTrack =
    tracks.find(t => t.source === Track.Source.ScreenShare) ||
    tracks.find(t => t.source === Track.Source.Camera);

  const otherCameraTracks = tracks.filter(
    t => t !== presenterTrack && t.source === Track.Source.Camera
  );

  return (
    <div className="h-full flex gap-4 p-2">
      {/* Main presenter area */}
      <div className="flex-1 min-w-0">
        <div className="w-full h-full rounded-xl overflow-hidden bg-black">
          {presenterTrack ? (
            <AdaptiveParticipantTile 
              trackRef={presenterTrack} 
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black/20">
              <div className="text-white/60 text-lg">No presenter video</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Side participants */}
      <div className="w-64 flex-shrink-0 overflow-y-auto">
        <div className="space-y-2">
          {otherCameraTracks.map((trackRef: any, idx: number) => (
            <div key={idx} className="w-full">
              <AdaptiveParticipantTile 
                trackRef={trackRef}
                className="min-h-[84px] max-h-[120px] rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FocusLayoutView({ participants, tracks, selectedTrackRef, onExitFocus }: FocusLayoutProps) {
  // 优先聚焦当前发言人（active speaker），否则使用共享屏幕，其次任意摄像头
  const activeSpeaker = participants.find(p => (p as any).isSpeaking || p.isSpeaking);
  const activeSpeakerCamera = activeSpeaker
    ? tracks.find(t => t.source === Track.Source.Camera && t.participant === activeSpeaker)
    : undefined;
  const focusTrack =
    selectedTrackRef ||
    activeSpeakerCamera ||
    tracks.find(t => t.source === Track.Source.ScreenShare) ||
    tracks.find(t => t.source === Track.Source.Camera);
  const otherTracks = tracks.filter(t => t !== focusTrack && t.source === Track.Source.Camera);

  return (
    <div className="focus-layout-container p-2">
      {/* 主聚焦视频区域 - 自适应容器，最大化显示 */}
      <div className="focus-main-video bg-black rounded-2xl overflow-hidden">
        <div className="focus-video-content">
          {focusTrack ? (
            <AdaptiveParticipantTile 
              trackRef={focusTrack} 
              className="w-full h-full"
            />
          ) : (
            <div className="w-full min-h-[400px] flex items-center justify-center bg-black/20">
              <div className="text-white/60 text-lg">No video to focus on…</div>
            </div>
          )}
        </div>
      </div>

      {/* 其他参与者缩略图 */}
      {otherTracks.length > 0 && (
        <div className="w-64 overflow-y-auto">
          <CarouselLayout tracks={otherTracks} orientation="vertical">
            <ParticipantTile className={`min-w-[140px] min-h-[84px] max-w-full max-h-full rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900`} />
          </CarouselLayout>
        </div>
      )}

      {/* 退出聚焦按钮 */}
      <div className="absolute top-6 right-6 z-30">
        <button
          className="lk-button lk-focus-toggle-button bg-black/60 text-white rounded-lg px-4 py-2 hover:bg-black/80 transition-all backdrop-blur-sm"
          onClick={onExitFocus}
          title="Exit focus view"
        >
          <span className="flex items-center gap-2">
            ↙ Exit Focus
          </span>
        </button>
      </div>

      <style jsx>{`
        .focus-layout-container {
          /* 容器自适应内容，不强制固定高宽比 */
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        
        .focus-main-video {
          /* 主视频区域：最大化显示但保持自适应 */
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          height: 100%;
          overflow: hidden;
        }
        
        .focus-video-content {
          /* 视频内容自然流动，不强制比例 */
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .focus-video-content :global(.adaptive-tile) {
          /* AdaptiveParticipantTile 在 focus 中的样式 */
          width: 100% !important;
          height: 100% !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .focus-video-content :global(.lk-participant-tile) {
          /* LiveKit tile 自适应 */
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
        }
        
        .focus-thumbnails {
          /* 缩略图区域 */
          flex-shrink: 0;
          max-height: 100px;
          margin-top: 8px;
        }
        
        /* 响应式调整 */
        @media (max-width: 768px) {
          .focus-main-video {
            min-height: 180px;
          }
          .focus-thumbnails {
            max-height: 80px;
          }
        }
      `}</style>
    </div>
  );
}

function EnhancedParticipantsList({ participants, onRemoveParticipant }: ParticipantsListProps) {
  const [isOpen, setIsOpen] = useState(false);
  // 取最近一次 reaction 类型（只展示一个）
  const [latestReaction, setLatestReaction] = useState<string | null>(null);
  useEffect(() => {
    // 简单从 document 上读取全局最近一次的浮动表情（如果需要可通过 props 提供）。此处保持为空或未来接驳。
    // 先占位：不主动更新，供上层传入时使用。
  }, []);

  return (
    <div className="absolute top-20 right-4 w-80 z-20">
      <div className={`bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 transition-all duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-90 hover:opacity-100'
      }`}>
        <div 
          className="cursor-pointer p-4 border-b border-white/10"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center justify-between text-white">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participants ({participants.length})
            </h3>
            <div className={`transform transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}>
              ▼
            </div>
          </div>
        </div>
        
        {isOpen && (
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="space-y-3">
              {participants.map((participant) => (
                <CustomParticipantTile key={participant.identity} participant={participant} latestReaction={latestReaction} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}