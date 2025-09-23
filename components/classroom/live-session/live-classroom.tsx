'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MessageCircle, 
  Hand, 
  Grid3X3, 
  Presentation, 
  Focus, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings, 
  MoreVertical,
  MoreHorizontal,
  Clock,
  Maximize,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  LiveKitRoom, 
  useDataChannel,
  RoomAudioRenderer, 
  useTracks,
  useParticipants, 
  useLocalParticipant, 
  VideoTrack, 
  AudioTrack, 
  useRoomContext 
} from '@livekit/components-react';
import { useParticipantsInfo, type ParticipantInfo } from '@/hooks/classroom/use-participants-info';
import { Track } from 'livekit-client';
import { setLogLevel, LogLevel, RoomEvent } from 'livekit-client';
import { useLiveKitToken } from '@/hooks/classroom/use-livekit-token';
import BottomControls from './bottom-controls';

// Suppress verbose LiveKit logs in development
if (process.env.NODE_ENV === 'development') {
  setLogLevel(LogLevel.warn);
}

interface LiveClassroomProps {
  classroomSlug: string;
  sessionId: string;
  participantName: string;
  userRole: 'student' | 'tutor';
  onSessionEnd?: () => void;
  classroomColor?: string;
}

export default function RedesiLiveClassroom({
  classroomSlug,
  sessionId,
  participantName,
  userRole,
  onSessionEnd,
  classroomColor = '#6366f1'
}: LiveClassroomProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [layout, setLayout] = useState('grid');
  const [isRecording, setIsRecording] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(2347); 
  const [reactions, setReactions] = useState<Array<{ id: number; type: string; at: number }>>([]);
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: number; type: string; x: number; y: number }>>([]);
  const [reactionEmojis, setReactionEmojis] = useState<Array<{ id: string; emoji: string; timestamp: number }>>([]);
  const [focusedParticipant, setFocusedParticipant] = useState<any>(null);
  const [localMediaState, setLocalMediaState] = useState<{
    camera: boolean;
    microphone: boolean;
    screenShare: boolean;
  }>({
    camera: true,
    microphone: true,
    screenShare: false
  });

  const reactionEmojiMap = {
    heart: '❤️',
    clap: '👏',
    thumbs: '👍',
    fire: '🔥',
    mind: '🤯',
    rocket: '🚀'
  };

  const { tokenData, isLoading, error, generateToken } = useLiveKitToken({
    classroomSlug,
    sessionId,
    participantName,
    metadata: JSON.stringify({ role: userRole, timestamp: Date.now() })
  });
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Auto-generate token on mount - MUST be before any early returns
  useEffect(() => {
    if (!tokenData && !isLoading && !error) {
      generateToken();
    }
  }, [tokenData, isLoading, error, generateToken]);

  // Session timer - MUST be before any early returns
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // DataChannel error handling will be added in LiveClassroomContent where room context is available

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
    toast.success('成功连接到课堂');
  };

  const handleError = (error: Error) => {
    toast.error(`连接错误: ${error.message}`);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0 
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const addReaction = useCallback((emoji: string) => {
    const newReaction = {
      id: Math.random().toString(36).substr(2, 9),
      emoji,
      timestamp: Date.now(),
    };
    setReactionEmojis((prev: Array<{ id: string; emoji: string; timestamp: number }>) => [...prev, newReaction]);
    
    // Remove reaction after animation
    setTimeout(() => {
      setReactionEmojis((prev: Array<{ id: string; emoji: string; timestamp: number }>) => 
        prev.filter((r: { id: string; emoji: string; timestamp: number }) => r.id !== newReaction.id)
      );
    }, 3000);
  }, []);

  const toggleMedia = useCallback(async (type: keyof typeof localMediaState) => {
    setLocalMediaState(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
    
    // This will be handled by LiveKit in the LiveClassroomContent component
    // where we have access to the room context
  }, []);

  const handleEndSession = () => {
    console.log('Ending session...');
    onSessionEnd?.();
    toast.info('课堂已结束');
  };

  const handleToggleRecording = useCallback(async () => {
    try {
      setIsRecording(!isRecording);
      if (!isRecording) {
        // Start recording via API
        const response = await fetch(`/api/classroom/${classroomSlug}/live-sessions/${sessionId}/recording`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' })
        });
        
        if (response.ok) {
          toast.success('开始录制');
        } else {
          throw new Error('Failed to start recording');
        }
      } else {
        // Stop recording via API
        const response = await fetch(`/api/classroom/${classroomSlug}/live-sessions/${sessionId}/recording`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'stop' })
        });
        
        if (response.ok) {
          toast.info('停止录制');
        } else {
          throw new Error('Failed to stop recording');
        }
      }
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('录制操作失败');
      // Revert state on error
      setIsRecording(isRecording);
    }
  }, [isRecording, classroomSlug, sessionId]);

  const onRefreshToken = () => {
    generateToken();
    toast.info('正在刷新连接令牌...');
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
              {typeof error === 'string' ? error : '无法获取课堂访问权限'}
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
    <div
      className="relative w-full mb-12"
      style={{
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
        className=" bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col relative"
        style={{
          margin: '0 10px',
          
        }}
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
                encoding: { maxBitrate: 1_500_000 } 
              }
            ]
          }
        }}
      >
        <RoomAudioRenderer />
        <LiveClassroomContent
          classroomSlug={classroomSlug}
          sessionId={sessionId}
          participantName={participantName}
          userRole={userRole}
          onSessionEnd={handleEndSession}
          classroomColor={classroomColor}
          isConnected={isConnected}
          connectionError={connectionError}
          onRefreshToken={onRefreshToken}
          layout={layout}
          setLayout={setLayout}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          isParticipantsOpen={isParticipantsOpen}
          setIsParticipantsOpen={setIsParticipantsOpen}
          sessionDuration={sessionDuration}
          reactions={reactions}
          floatingReactions={floatingReactions}
          focusedParticipant={focusedParticipant}
          setFocusedParticipant={setFocusedParticipant}
          participants={[]}
          reactionEmojis={{}}
          reactionEmojiMap={reactionEmojiMap}
          toggleMedia={toggleMedia}
          handleToggleRecording={handleToggleRecording}
          isRecording={isRecording}
          localMediaState={localMediaState}
          addReaction={addReaction}
          formatDuration={formatDuration}
        />
      </LiveKitRoom>
    </div>
  );
}

interface LiveClassroomContentProps {
  classroomSlug: string;
  sessionId: string;
  participantName: string;
  userRole: 'student' | 'tutor';
  onSessionEnd?: () => void;
  classroomColor?: string;
  isConnected?: boolean;
  connectionError?: string | null;
  onRefreshToken?: () => void;
  layout: string;
  setLayout: (layout: string) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isParticipantsOpen: boolean;
  setIsParticipantsOpen: (open: boolean) => void;
  sessionDuration: number;
  reactions: Array<{ id: number; type: string; at: number }>;
  floatingReactions: Array<{ id: number; type: string; x: number; y: number }>;
  focusedParticipant: any;
  setFocusedParticipant: (participant: any) => void;
  participants: any[];
  reactionEmojis: Record<string, string>;
  toggleMedia: (type: 'camera' | 'microphone' | 'screenShare') => void;
  handleToggleRecording: () => void;
  isRecording: boolean;
  localMediaState: { camera: boolean; microphone: boolean; screenShare: boolean };
  addReaction: (type: string) => void;
  reactionEmojiMap: Record<string, string>;
  formatDuration: (seconds: number) => string;
}

function LiveClassroomContent({
  classroomSlug,
  sessionId,
  participantName: originalParticipantName,
  userRole,
  onSessionEnd,
  classroomColor = '#6366f1',
  isConnected,
  connectionError,
  onRefreshToken,
  layout,
  setLayout,
  isChatOpen,
  setIsChatOpen,
  isParticipantsOpen,
  setIsParticipantsOpen,
  sessionDuration,
  reactions,
  floatingReactions,
  focusedParticipant,
  setFocusedParticipant,
  participants: propParticipants,
  reactionEmojis,
  toggleMedia,
  handleToggleRecording,
  isRecording,
  localMediaState,
  addReaction,
  formatDuration,
  reactionEmojiMap
}: LiveClassroomContentProps) {
  const room = useRoomContext();
  const livekitParticipants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const { data: participantsInfo = [] } = useParticipantsInfo(classroomSlug);
  
  // Get all tracks using useTracks for better subscription handling
  const allTracks = useTracks([Track.Source.Camera, Track.Source.Microphone, Track.Source.ScreenShare]);

  // Create a Map for O(1) lookup of participant info
  const participantsInfoMap = useMemo(() => {
    const m = new Map<string, ParticipantInfo>();
    // Ensure participantsInfo is an array before calling forEach
    if (Array.isArray(participantsInfo)) {
      participantsInfo.forEach(info => {
        // LiveKit identity format is 'user-{profile.id}', so we create both mappings
        if (info.id) {
          // Map both the raw ID and the LiveKit format
          m.set(String(info.id), info);           // Direct profile ID mapping
          m.set(`user-${info.id}`, info);         // LiveKit identity format
        }
        // Also map by user_id if available (UUID format)
        if (info.user_id) {
          m.set(String(info.user_id), info);
        }
      });
    }
    
    console.log('🗺️ Participants info map created:', {
      totalParticipants: participantsInfo?.length || 0,
      mapSize: m.size,
      mapKeys: Array.from(m.keys()),
      sampleData: participantsInfo?.[0]
    });
    
    return m;
  }, [participantsInfo]);

  // Debug logging to compare identities
  console.log('livekit identities', livekitParticipants.map(p => p.identity));
  // Merge LiveKit participants with database participant info
  const mergedParticipants = useMemo(() => {
    console.log('🔄 Starting participant merge process...');
    console.log('LiveKit participants:', livekitParticipants.map(p => ({ identity: p.identity, name: p.name })));
    
    return livekitParticipants.map(p => {
      // LiveKit participant.identity should contain the user_id
      const idKey = String(p.identity);
      const info = participantsInfoMap.get(idKey) ?? null;

      console.log(`🔍 Merging participant ${p.identity}:`, {
        livekitIdentity: p.identity,
        foundInfo: !!info,
        infoId: info?.id,
        infoUserId: info?.user_id,
        infoDisplayName: info?.display_name,
        infoRole: info?.role,
        participantName: p.name,
        mapHasKey: participantsInfoMap.has(String(p.identity))
      });

      // Determine display name with better fallback logic
      const displayName = info?.display_name || 
                         info?.name || 
                         info?.full_name || 
                         p.name || 
                         `User ${p.identity}`;

      const mergedParticipant = {
        livekitParticipant: p,
        sid: p.sid,
        identity: p.identity,
        displayName,
        role: info?.role || 'student',
        avatarUrl: (info ? (() => {
          if (info.avatar_url) {
            // 如果 avatar_url 是相对路径，转换为绝对路径
            if (!info.avatar_url.startsWith('http')) {
              return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${info.avatar_url}`;
            }
            return info.avatar_url;
          } else {
            return undefined 
          } 
        })() : undefined),
        userInfo: info // Full user info object for additional data
      };

      console.log(`✅ Merged participant ${p.identity}:`, {
        hasLivekitParticipant: !!mergedParticipant.livekitParticipant,
        displayName: mergedParticipant.displayName,
        role: mergedParticipant.role
      });

      return mergedParticipant;
    });
  }, [livekitParticipants, participantsInfoMap]);
  
  // Add track subscription event listeners
  useEffect(() => {
    if (!room) return;
    
    const handleTrackSubscribed = (track: any, publication: any, participant: any) => {
      console.log('Track subscribed:', {
        trackSid: publication.trackSid,
        participantIdentity: participant.identity,
        trackKind: track.kind,
        trackSource: track.source
      });
    };
    
    const handleTrackUnsubscribed = (track: any, publication: any, participant: any) => {
      console.log('Track unsubscribed:', {
        trackSid: publication.trackSid,
        participantIdentity: participant.identity
      });
    };
    
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    
    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    };
  }, [room]);
  
  // Use merged participants for video rendering
  const participants = mergedParticipants;
  
  // Get current user's display name from merged participants
  const currentUserDisplayName = localParticipant 
    ? mergedParticipants.find((p: any) => p.identity === localParticipant.identity)?.displayName || originalParticipantName
    : originalParticipantName;
  
  // Use currentLocalMediaState from props
  const currentLocalMediaState = {
    camera: localParticipant?.isCameraEnabled ?? localMediaState.camera,
    microphone: localParticipant?.isMicrophoneEnabled ?? localMediaState.microphone,
    screenShare: localParticipant?.isScreenShareEnabled ?? localMediaState.screenShare
  };
  
  const isCameraEnabled = currentLocalMediaState.camera;
  const isMicEnabled = currentLocalMediaState.microphone;
  
  // Ensure local participant publishes tracks on connect
  useEffect(() => {
    if (!localParticipant || !room) return;
    
    const enableLocalTracks = async () => {
      try {
        // Enable camera and microphone by default
        await localParticipant.setCameraEnabled(true);
        await localParticipant.setMicrophoneEnabled(true);
        console.log('Local tracks enabled on connect');
        
        // Verify local publications
        console.log("Local publications:", [...localParticipant.trackPublications.values()].map(pub => ({
          kind: pub.kind,
          source: pub.source,
          trackSid: pub.trackSid,
          isEnabled: pub.isEnabled,
          isMuted: pub.isMuted
        })));
      } catch (error) {
        console.error('Failed to enable local tracks:', error);
      }
    };
    
    // Small delay to ensure room is fully connected
    const timer = setTimeout(enableLocalTracks, 1000);
    return () => clearTimeout(timer);
  }, [localParticipant, room]);

  // Use enhancedToggleMedia from props - enhanced with LiveKit integration
  const enhancedToggleMedia = useCallback(async (type: 'camera' | 'microphone' | 'screenShare') => {
    if (!localParticipant) {
      // If no localParticipant, just call the prop function
      toggleMedia(type);
      return;
    }
    
    try {
      switch (type) {
        case 'camera':
          await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
          break;
        case 'microphone':
          await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
          break;
        case 'screenShare':
          if (localParticipant.isScreenShareEnabled) {
            await localParticipant.setScreenShareEnabled(false);
          } else {
            await localParticipant.setScreenShareEnabled(true);
          }
          break;
      }
      
      // Call the parent toggleMedia to update local state
      toggleMedia(type);
      
      // Show success message
      const mediaNames = {
        camera: '摄像头',
        microphone: '麦克风', 
        screenShare: '屏幕共享'
      };
      toast.success(`${mediaNames[type]}已${localParticipant.isCameraEnabled || localParticipant.isMicrophoneEnabled || localParticipant.isScreenShareEnabled ? '开启' : '关闭'}`);
    } catch (error) {
      console.error(`Failed to toggle ${type}:`, error);
      toast.error(`无法切换${type === 'camera' ? '摄像头' : type === 'microphone' ? '麦克风' : '屏幕共享'}`);
    }
  }, [localParticipant, toggleMedia]);

  // Session timer is handled in parent component

  // Use LiveKit's lossy DataChannel for reactions only (not chat)
  const { message: reactionMessage } = useDataChannel('reactions');
  
  // Disable DataChannel chat handling - chat uses API persistence
  useEffect(() => {
    if (!room) return;

    const handleDataPacket = () => {
      // ❌ 不处理 DataChannel 消息
      // 因为我们走 API 持久化，不需要 LiveKit DataChannel
      // Chat is handled by API + Database, not DataChannel
    };

    // Add listener but don't process chat messages
    room.on(RoomEvent.DataReceived, handleDataPacket);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataPacket);
    };
  }, [room]);
  
  // Send reaction via lossy DataChannel
  const sendReaction = useCallback((emoji: string) => {
    if (room?.localParticipant) {
      const reactionData = {
        type: 'reaction',
        emoji,
        userId: room.localParticipant.identity,
        timestamp: Date.now()
      };
      
      room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(reactionData)),
        { reliable: false } // Use lossy for reactions (low latency)
      ).catch((error: any) => {
        console.error('Failed to send reaction:', error);
      });
    }
    
    // Add reaction locally
    addReaction(emoji);
  }, [room, addReaction]);
  
  // Handle incoming reaction messages only (ignore chat)
  useEffect(() => {
    if (reactionMessage) {
      try {
        const data = JSON.parse(new TextDecoder().decode(reactionMessage.payload));
        // Only process reactions, ignore chat messages
        if (data.type === 'reaction') {
          addReaction(data.emoji);
        }
        // Chat messages are ignored - handled by API
      } catch (error) {
        console.error('Error parsing reaction message:', error);
      }
    }
  }, [reactionMessage, addReaction]);

  const handleStartRecording = () => {
    toast.success('开始录制');
  };

  const handleStopRecording = () => {
    toast.info('停止录制');
  };

  const handleEndSession = () => {
    if (room) {
      room.disconnect();
    }
    onSessionEnd?.();
    toast.info('课堂已结束');
  };

  const setConnectionError = (error: string | null) => {
    if (error) {
      toast.error(error);
      if (onRefreshToken) {
        onRefreshToken();
      }
    }
  };

  // Monitor connection errors
  useEffect(() => {
    if (connectionError) {
      setConnectionError(connectionError);
    }
  }, [connectionError, onRefreshToken]);

  return (
    <>
      {/* Floating Reactions */}
      <FloatingReactions reactions={floatingReactions} reactionEmojis={reactionEmojis} />
      
      <Header 
        isConnected={isConnected}
        participantCount={participants.length}
        sessionDuration={sessionDuration}
        formatDuration={formatDuration}
        isRecording={isRecording}
        userRole={userRole}
        layout={layout}
        setLayout={setLayout}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          participants={participants}
          isParticipantsOpen={isParticipantsOpen}
          setIsParticipantsOpen={setIsParticipantsOpen}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          userRole={userRole}
        />

        {/* Video Area */}
        <div className="flex-1 relative p-4 z-[10]">
          <VideoArea 
            layout={layout}
            participants={participants}
            focusedParticipant={focusedParticipant}
            setFocusedParticipant={setFocusedParticipant}
          />
        </div>

        {/* Chat Panel */}
        <ChatPanel isOpen={isChatOpen} />
      </div>

      {/* Bottom Control Bar */}
      <BottomControls 
        colors={{ primary: classroomColor, light: '#818cf8', dark: '#4338ca' }}
        userRole={userRole}
        isRecording={isRecording}
        onStartRecording={() => handleToggleRecording()}
        onStopRecording={() => handleToggleRecording()}
        onEndSession={handleEndSession}
        sessionDuration={sessionDuration}
        formatDuration={formatDuration}
        addReaction={sendReaction}
        reactionEmojis={reactionEmojiMap}
      />
      
      {userRole === 'tutor' && (
        <EnhancedParticipantsList participants={participants} />
      )}
      
    </>
  );
}

// Enhanced Participants List Component - Updated for LiveKit participants
function EnhancedParticipantsList({ participants }: any) {
  return (
    <motion.div 
      className="absolute top-20 right-6 w-80 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 p-4 z-30"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        参与者 ({participants.length})
      </h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {participants.map((participant: any) => {
          const participantName = participant.name || participant.identity || 'Unknown';
          const isLocal = participant.isLocal;
          const participantCameraEnabled = participant.isCameraEnabled;
          const participantMicEnabled = participant.isMicrophoneEnabled;
          
          return (
            <motion.div
              key={participant.sid || participant.identity}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center justify-center text-white font-medium">
                    {participantName.charAt(0).toUpperCase()}
                  </div>
                  {isLocal && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-slate-800" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium truncate">
                      {participantName}
                    </span>
                    {isLocal && (
                      <span className="text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">你</span>
                    )}
                  </div>
                  <div className="text-xs text-white/60 capitalize">
                    {isLocal ? '本地用户' : '远程用户'}
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <div className={`p-1 rounded ${participantMicEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {participantMicEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                  </div>
                  <div className={`p-1 rounded ${participantCameraEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {participantCameraEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                  </div>
                  {!isLocal && (
                    <motion.button
                      className="p-1 rounded hover:bg-red-500/20 text-red-400"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function Header({ isConnected, participantCount, sessionDuration, formatDuration, isRecording, userRole, layout, setLayout }: any) {
  return (
    <motion.header 
      className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between">
        {/* Left - Status & Info */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`} />
            <h1 className="text-xl font-semibold text-white">Live Classroom</h1>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-slate-300">
            <div className="flex items-center space-x-1.5">
              <Users className="w-4 h-4" />
              <span>{participantCount}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(sessionDuration)}</span>
            </div>
            {isRecording && (
              <div className="flex items-center space-x-1.5 bg-red-500/20 px-2 py-1 rounded-full border border-red-400/30">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                <span className="text-red-300 text-xs font-medium">REC</span>
              </div>
            )}
          </div>
        </div>

        {/* Center - Layout Controls */}
        <LayoutControls layout={layout} setLayout={setLayout} />

        {/* Right - Actions */}
        <div className="flex items-center space-x-2">
          <motion.button
            className="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings className="w-4 h-4 text-slate-300" />
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}

// Layout Controls Component
function LayoutControls({ layout, setLayout }: any) {
  const layouts = [
    { key: 'grid', icon: Grid3X3, label: 'Grid' },
    { key: 'presentation', icon: Presentation, label: 'Presentation' },
    { key: 'focus', icon: Maximize, label: 'Focus' }
  ];

  return (
    <div className="flex justify-center items-center bg-slate-700/30 backdrop-blur-sm rounded-lg p-1">
      {layouts.map(({ key, icon: Icon, label }) => (
        <motion.button
          key={key}
          onClick={() => setLayout(key)}
          className={`relative flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            layout === key 
              ? 'text-white' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs">{label}</span>
          {layout === key && (
            <motion.div
              className="absolute inset-0 bg-indigo-500/20 backdrop-blur-sm rounded-md border border-indigo-400/30"
              layoutId="activeLayout"
              initial={false}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
}

// Sidebar Component
function Sidebar({ participants, isParticipantsOpen, setIsParticipantsOpen, isChatOpen, setIsChatOpen, userRole }: any) {
  return (
    <motion.aside 
      className="w-16 bg-slate-800/30 backdrop-blur-sm border-r border-slate-700/50 flex flex-col z-20"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="flex-1 flex flex-col items-center py-4 space-y-4">
        {/* Participants Toggle */}
        <motion.button
          onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
          className={`p-3 rounded-xl transition-all relative ${
            isParticipantsOpen 
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' 
              : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Users className="w-5 h-5" />
          <div className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {participants.length}
          </div>
        </motion.button>

        {/* Chat Toggle */}
        <motion.button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`p-3 rounded-xl transition-all ${
            isChatOpen 
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' 
              : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MessageCircle className="w-5 h-5" />
        </motion.button>

        {/* Hand Raise */}
        <motion.button
          className="p-3 rounded-xl bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Hand className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Participants List (when open) */}
      <AnimatePresence>
        {isParticipantsOpen && (
          <motion.div
            className="absolute left-16 top-0 w-80 h-full bg-slate-800/95 backdrop-blur-sm border-r border-slate-700/50 z-[100] pointer-events-auto"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ParticipantsList participants={participants} userRole={userRole} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

// Participants List Component
function ParticipantsList({ participants, userRole }: any) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          Participants ({participants.length})
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {participants.map((participant: any, index: number) => (
            <ParticipantCard 
              key={participant.sid || participant.identity || participant.id || `participant-${index}`} 
              participant={participant} 
              userRole={userRole} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Participant Card Component - Updated to use merged participant data
function ParticipantCard({ participant, userRole }: any) {
  // participant is the merged object containing participant.livekitParticipant (LiveKit participant)
  const livekitParticipant = participant.livekitParticipant;
  
  // Safety check - if no LiveKit participant, return null
  if (!livekitParticipant) {
    console.error('❌ ParticipantCard: No livekitParticipant found:', participant);
    return null;
  }
  
  // Use useTracks to get real-time track status from LiveKit
  const allTracks = useTracks([Track.Source.Camera, Track.Source.Microphone, Track.Source.ScreenShare]);
  const participantTracks = allTracks.filter(t => t.participant.identity === livekitParticipant.identity);

  const cameraTrackRef = participantTracks.find(t => t.source === Track.Source.Camera);
  const micTrackRef = participantTracks.find(t => t.source === Track.Source.Microphone);

  const participantCameraEnabled = !!cameraTrackRef?.publication?.track && !cameraTrackRef?.publication?.isMuted;
  const participantMicEnabled = !!micTrackRef?.publication?.track && !micTrackRef?.publication?.isMuted;

  // Use merged display fields
  const displayName = participant.displayName;
  const avatarUrl = participant.avatarUrl;
  const role = participant.role;
  const isLocal = livekitParticipant.isLocal;
  const userInfo = participant.userInfo;
  
  // Add screen share status
  const participantScreenShareEnabled = participantTracks.some(
    t => t.source === Track.Source.ScreenShare && !t.publication?.isMuted
  );
  
  // Debug logging for participant data with track status
  console.log('✅ ParticipantCard data:', {
    displayName,
    avatarUrl,
    role,
    userInfo,
    participantCameraEnabled,
    participantMicEnabled,
    participantSid: livekitParticipant?.sid,
    participantTracksCount: participantTracks.length,
    allTracksCount: allTracks.length,
    isLocal: livekitParticipant?.isLocal,
    hasLivekitParticipant: !!livekitParticipant,
    participantKeys: Object.keys(participant || {}),
    livekitKeys: Object.keys(livekitParticipant || {})
  });

  return (
    <motion.div
      className="bg-slate-700/30 backdrop-blur-sm rounded-lg p-3 border border-slate-600/30"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover border-2 border-slate-600"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                if (nextElement) {
                  nextElement.style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div 
            className={`w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center justify-center text-white font-medium ${
              avatarUrl ? 'hidden' : 'flex'
            }`}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          {isLocal && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-slate-800" />
          )}
          {/* Camera status overlay */}
          {!participantCameraEnabled && (
            <div className="absolute inset-0 bg-slate-800/70 rounded-full flex items-center justify-center">
              <VideoOff className="w-4 h-4 text-slate-400" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-white font-medium truncate">{displayName}</span>
            {isLocal && (
              <span className="text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">You</span>
            )}
          </div>
          <div className="text-xs text-slate-400 capitalize">
            {role} {userInfo?.email}
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <div className={`p-1 rounded ${participantMicEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {participantMicEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
          </div>
          <div className={`p-1 rounded ${participantCameraEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {participantCameraEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
          </div>
          {participantScreenShareEnabled && (
            <div className="p-1 rounded bg-blue-500/20 text-blue-400">
              <Presentation className="w-3 h-3" />
            </div>
          )}
          {userRole === 'tutor' && !isLocal && (
            <motion.button
              className="p-1 rounded hover:bg-slate-600/50 text-slate-400"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <MoreHorizontal className="w-3 h-3" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Video Area Component
function VideoArea({ layout, participants, focusedParticipant, setFocusedParticipant }: any) {
  return (
    <motion.div 
      className="h-full bg-slate-800/20 backdrop-blur-sm rounded-2xl border border-slate-700/30 overflow-hidden relative z-[10]"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <AnimatePresence mode="wait">
        {layout === 'grid' && (
          <GridVideoLayout 
            key="grid" 
            participants={participants} 
            setFocusedParticipant={setFocusedParticipant}
          />
        )}
        {layout === 'presentation' && (
          <PresentationVideoLayout 
            key="presentation" 
            participants={participants} 
          />
        )}
        {layout === 'focus' && (
          <FocusVideoLayout 
            key="focus" 
            participants={participants}
            focusedParticipant={focusedParticipant}
            setFocusedParticipant={setFocusedParticipant}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Grid Video Layout
function GridVideoLayout({ participants, setFocusedParticipant }: any) {
  const getGridClasses = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-2 lg:grid-cols-2';
    if (count <= 6) return 'grid-cols-2 lg:grid-cols-3';
    if (count <= 9) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  };



  return (
    <motion.div 
      className="h-full pl-8 pr-8 pb-4 pt-4 z-10"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`grid gap-2 md:gap-4 h-full w-full ${getGridClasses(participants.length)}`}>
        {participants.map((participant: any, index: number) => (
          <div 
            key={participant.sid || participant.identity || `participant-${index}`}
            className={`relative w-full ${(participants.length)} min-h-0`}
          >
            <VideoTile 
              participant={participant}
              size="grid"
              onFocus={() => setFocusedParticipant(participant)}
              showFocusButton={true}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Presentation Video Layout
function PresentationVideoLayout({ participants }: any) {
  const presenter = participants.find((p: any) => p.metadata?.includes('tutor')) || participants[0];
  const others = participants.filter((p: any) => p.sid !== presenter?.sid);

  return (
    <motion.div 
      className="h-full flex gap-4 p-4"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-1">
        <VideoTile participant={presenter} size="large" />
      </div>
      <div className="w-64 space-y-4 overflow-y-auto">
        {others.map((participant: any, index: number) => (
          <VideoTile 
            key={participant.sid || participant.identity || `other-${index}`}
            participant={participant}
            size="small"
          />
        ))}
      </div>
    </motion.div>
  );
}

// Focus Video Layout
function FocusVideoLayout({ participants, focusedParticipant, setFocusedParticipant }: any) {
  const focused = focusedParticipant || participants[0];
  const others = participants.filter((p: any) => p.sid !== focused?.sid);

  return (
    <motion.div 
      className="h-full flex flex-col gap-4 p-4"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-1 relative">
        <VideoTile participant={focused} size="large" />
        <motion.button
          onClick={() => setFocusedParticipant(null)}
          className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg hover:bg-slate-700/80 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Exit Focus
        </motion.button>
      </div>
      {others.length > 0 && (
        <div className="h-24 flex gap-4 overflow-x-auto">
          {others.map((participant: any, index: number) => (
            <motion.button
              key={participant.sid || participant.identity || `focus-${index}`}
              onClick={() => setFocusedParticipant(participant)}
              className="flex-shrink-0 w-32"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <VideoTile participant={participant} size="thumbnail" />
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function VideoTile({ participant, size = 'normal', onFocus, showFocusButton = false }: any) {
  const sizeClasses: Record<string, string> = {
    thumbnail: 'w-32 h-20',
    small: 'w-48 h-32',
    normal: 'w-64 h-48',
    large: 'w-full h-full',
    grid: 'w-full h-full'
  };

  // Use the original LiveKit participant object for track operations
  // Support both new (livekitParticipant) and old (participantObj) formats for compatibility
  const livekitParticipant = participant.livekitParticipant || participant.participantObj || participant;
  
  // Safety check
  if (!livekitParticipant) {
    console.error('❌ VideoTile: No valid participant found:', participant);
    return (
      <div className={`${sizeClasses[size]} relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center`}>
        <span className="text-slate-400 text-sm">No Participant</span>
      </div>
    );
  }
  
  const allTracks = useTracks([Track.Source.Camera, Track.Source.Microphone, Track.Source.ScreenShare]);
  const participantTracks = allTracks.filter(trackRef => 
    trackRef.participant.identity === livekitParticipant.identity
  );

  const cameraTrackRef = participantTracks.find(trackRef => trackRef.source === Track.Source.Camera);
  const micTrackRef = participantTracks.find(trackRef => trackRef.source === Track.Source.Microphone);
  const screenShareTrackRef = participantTracks.find(trackRef => trackRef.source === Track.Source.ScreenShare);

  // Use merged participant data
  const participantName = participant.displayName || participant.identity || 'Unknown';
  const isLocal = livekitParticipant.isLocal;
  const role = participant.role || 'participant';

  return (
    <div className="flex flex-col space-y-4">
      
      {/* --- Screen Share 独立容器 --- */}
      {screenShareTrackRef && (
        <motion.div 
          className={`${sizeClasses[size]} relative rounded-xl overflow-hidden bg-black`}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <VideoTrack 
            trackRef={screenShareTrackRef}
            className="w-full h-full]"
          />
          <div className="absolute top-2 left-2 bg-blue-500/80 text-white px-2 py-1 rounded text-xs font-medium">
            Screen Share - {participantName}
          </div>
          {micTrackRef && <AudioTrack trackRef={micTrackRef} />}
        </motion.div>
      )}

      {/* --- Camera 独立容器 --- */}
      <motion.div 
        className={`${sizeClasses[size]} relative rounded-xl overflow-hidden`}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        {(() => {
          const hasCameraTrack = !!cameraTrackRef;
          const hasTrack = !!cameraTrackRef?.publication?.track;
          const isMuted = !!cameraTrackRef?.publication?.isMuted;
          const showCamera = hasCameraTrack && hasTrack && !isMuted;
          
          console.log('🎥 Camera status check:', {
            participantName,
            hasCameraTrack,
            hasTrack,
            isMuted,
            showCamera,
            trackSid: cameraTrackRef?.publication?.trackSid
          });
          
          return showCamera;
        })() ? (
          <div className="relative w-full h-full">
            <VideoTrack
              trackRef={cameraTrackRef}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>

        ) : (
          <div 
            className="w-full h-full min-h-[200px] flex flex-col items-center justify-center text-slate-400 bg-gradient-to-br from-slate-700 to-slate-800"
            style={{ minHeight: '200px' }} 
          >
            <VideoOff className="w-8 h-8 mb-2 text-slate-400" />
            <span className="text-sm font-medium">No Camera</span>
            <span className="text-xs mt-1 opacity-75">Camera is off for {participantName}</span>
            {/* 调试信息 */}
            <div className="text-xs mt-2 opacity-50 text-center">
              <div>Participant: {participantName}</div>
              <div>Size: {size}</div>
            </div>
          </div>
        )}

        {/* Overlay */}
        <div className="absolute top-3 left-3 flex items-center space-x-2 z-20">
          {isLocal && (
            <div className="bg-yellow-400/20 text-yellow-300 px-2 py-1 rounded-full text-xs font-medium border border-yellow-400/30">
              You
            </div>
          )}
          {/* Camera status indicator */}
          {isLocal && (!cameraTrackRef || !cameraTrackRef.publication?.track || cameraTrackRef.publication?.isMuted) && (
            <div className="bg-red-500/20 text-red-300 px-2 py-1 rounded-full text-xs font-medium border border-red-500/30 flex items-center space-x-1">
              <VideoOff className="w-3 h-3" />
              <span>Camera Off</span>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 z-20">
          <div className="text-white font-medium text-sm truncate">{participantName}</div>
          <div className="text-slate-300 text-xs capitalize">{role}</div>
        </div>
      </motion.div>
    </div>
  );
}


// Chat Panel Component
function ChatPanel({ isOpen }: any) {
  const [messages] = useState([
    { id: 1, user: 'Jane Smith', message: 'Great explanation!', time: '2:34 PM' },
    { id: 2, user: 'Mike Johnson', message: 'Can you repeat the last part?', time: '2:35 PM' },
    { id: 3, user: 'Sarah Wilson', message: 'Thanks for sharing the resources', time: '2:36 PM' },
  ]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="w-80 bg-slate-800/50 backdrop-blur-sm border-l border-slate-700/50 flex flex-col"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="bg-slate-700/30 rounded-lg p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-white">{message.user}</span>
                  <span className="text-xs text-slate-400">{message.time}</span>
                </div>
                <p className="text-sm text-slate-200">{message.message}</p>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-700/50">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Type a message..."
                className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <motion.button 
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Send
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


// Floating Reactions Component
function FloatingReactions({ reactions, reactionEmojis }: any) {
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {reactions.map((reaction: any) => (
          <motion.div
            key={reaction.id}
            className="absolute text-4xl"
            style={{ left: `${reaction.x}%`, top: `${reaction.y}%` }}
            initial={{ opacity: 1, scale: 1, y: 0 }}
            animate={{ 
              opacity: [1, 0.8, 0], 
              scale: [1, 1.2, 0.8], 
              y: -200,
              rotate: [0, 10, -10, 0]
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 3, ease: "easeOut" }}
          >
            {reactionEmojis[reaction.type]}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}