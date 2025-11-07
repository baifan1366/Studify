'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Settings,
  Users,
  MessageCircle,
  Grid3X3,
  LayoutGrid,
  Maximize,
  MoreVertical,
  Zap,
  Clock,
  Smile,
  ThumbsUp,
  Heart,
  Trophy,
  Sparkles,
  Timer,
  Play,
  Pause,
  Square,
  Send,
  Loader2,
  Video,
  VideoOff,
  MoreHorizontal,
  Presentation,
  Hand,
  PenTool,
  BookOpen,
  FileText
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { SessionChatPanel } from './liveblocks-chat-panel';
import { WhiteboardPanel } from './whiteboard-panel';
import { LiveblocksWhiteboard, type LiveblocksWhiteboardRef } from './whiteboard-canvas';
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

// Suppress verbose LiveKit logs
setLogLevel(LogLevel.warn);

// ============================================
// Classroom Context
// ============================================

/**
 * Classroom Context - solve prop drilling problem
 * Manage entire classroom state, avoid passing props through multiple component layers
 */
interface ClassroomState {
  // Basic information
  classroomSlug: string;
  sessionId: string;
  participantName: string;
  userRole: 'student' | 'tutor' | 'owner';
  classroomColor: string;

  // Layout state
  layout: string;
  setLayout: (layout: string) => void;

  // Panel state
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isParticipantsOpen: boolean;
  setIsParticipantsOpen: (open: boolean) => void;
  isWhiteboardOpen: boolean;
  setIsWhiteboardOpen: (open: boolean) => void;

  // Session state
  sessionDuration: number;
  isRecording: boolean;

  // Panel dimensions
  panelWidth: number;
  setPanelWidth: (width: number) => void;
  isResizing: boolean;
  setIsResizing: (resizing: boolean) => void;

  // Whiteboard state
  whiteboardTool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  setWhiteboardTool: (tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text') => void;
  whiteboardColor: string;
  setWhiteboardColor: (color: string) => void;
  whiteboardBrushSize: number;
  setWhiteboardBrushSize: (size: number) => void;
  whiteboardFontSize: number;
  setWhiteboardFontSize: (size: number) => void;
  whiteboardTextAlign: 'left' | 'center' | 'right';
  setWhiteboardTextAlign: (align: 'left' | 'center' | 'right') => void;

  // Whiteboard operations
  whiteboardCanvasRef: React.RefObject<any>;
  handleClearWhiteboard: () => void;
  handleSaveWhiteboard: () => Promise<void>;
  handleDownloadWhiteboard: () => void;

  // Focused participant
  focusedParticipant: any;
  setFocusedParticipant: (participant: any) => void;

  // Operation functions
  handleToggleRecording: () => void;
  formatDuration: (seconds: number) => string;
}

const ClassroomContext = createContext<ClassroomState | undefined>(undefined);

export function useClassroom() {
  const context = useContext(ClassroomContext);
  if (!context) {
    throw new Error('useClassroom must be used within ClassroomProvider');
  }
  return context;
}

interface ClassroomProviderProps {
  children: ReactNode;
  classroomSlug: string;
  sessionId: string;
  participantName: string;
  userRole: 'student' | 'tutor' | 'owner';
  classroomColor?: string;
  layout: string;
  setLayout: (layout: string) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isParticipantsOpen: boolean;
  setIsParticipantsOpen: (open: boolean) => void;
  isWhiteboardOpen: boolean;
  setIsWhiteboardOpen: (open: boolean) => void;
  sessionDuration: number;
  isRecording: boolean;
  panelWidth: number;
  setPanelWidth: (width: number) => void;
  isResizing: boolean;
  setIsResizing: (resizing: boolean) => void;
  whiteboardTool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  setWhiteboardTool: (tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text') => void;
  whiteboardColor: string;
  setWhiteboardColor: (color: string) => void;
  whiteboardBrushSize: number;
  setWhiteboardBrushSize: (size: number) => void;
  whiteboardFontSize: number;
  setWhiteboardFontSize: (size: number) => void;
  whiteboardTextAlign: 'left' | 'center' | 'right';
  setWhiteboardTextAlign: (align: 'left' | 'center' | 'right') => void;
  whiteboardCanvasRef: React.RefObject<any>;
  handleClearWhiteboard: () => void;
  handleSaveWhiteboard: () => Promise<void>;
  handleDownloadWhiteboard: () => void;
  focusedParticipant: any;
  setFocusedParticipant: (participant: any) => void;
  handleToggleRecording: () => void;
  formatDuration: (seconds: number) => string;
}

export function ClassroomProvider(props: ClassroomProviderProps) {
  const {
    children,
    classroomSlug,
    sessionId,
    participantName,
    userRole,
    classroomColor = '#6366f1',
    layout,
    setLayout,
    isChatOpen,
    setIsChatOpen,
    isParticipantsOpen,
    setIsParticipantsOpen,
    isWhiteboardOpen,
    setIsWhiteboardOpen,
    sessionDuration,
    isRecording,
    panelWidth,
    setPanelWidth,
    isResizing,
    setIsResizing,
    whiteboardTool,
    setWhiteboardTool,
    whiteboardColor,
    setWhiteboardColor,
    whiteboardBrushSize,
    setWhiteboardBrushSize,
    whiteboardFontSize,
    setWhiteboardFontSize,
    whiteboardTextAlign,
    setWhiteboardTextAlign,
    whiteboardCanvasRef,
    handleClearWhiteboard,
    handleSaveWhiteboard,
    handleDownloadWhiteboard,
    focusedParticipant,
    setFocusedParticipant,
    handleToggleRecording,
    formatDuration,
  } = props;

  const value = useMemo(() => ({
    classroomSlug,
    sessionId,
    participantName,
    userRole,
    classroomColor,
    layout,
    setLayout,
    isChatOpen,
    setIsChatOpen,
    isParticipantsOpen,
    setIsParticipantsOpen,
    isWhiteboardOpen,
    setIsWhiteboardOpen,
    sessionDuration,
    isRecording,
    panelWidth,
    setPanelWidth,
    isResizing,
    setIsResizing,
    whiteboardTool,
    setWhiteboardTool,
    whiteboardColor,
    setWhiteboardColor,
    whiteboardBrushSize,
    setWhiteboardBrushSize,
    whiteboardFontSize,
    setWhiteboardFontSize,
    whiteboardTextAlign,
    setWhiteboardTextAlign,
    whiteboardCanvasRef,
    handleClearWhiteboard,
    handleSaveWhiteboard,
    handleDownloadWhiteboard,
    focusedParticipant,
    setFocusedParticipant,
    handleToggleRecording,
    formatDuration,
  }), [
    classroomSlug,
    sessionId,
    participantName,
    userRole,
    classroomColor,
    layout,
    isChatOpen,
    isParticipantsOpen,
    isWhiteboardOpen,
    sessionDuration,
    isRecording,
    panelWidth,
    isResizing,
    whiteboardTool,
    whiteboardColor,
    whiteboardBrushSize,
    whiteboardFontSize,
    whiteboardTextAlign,
    focusedParticipant,
    handleToggleRecording,
    formatDuration,
    handleClearWhiteboard,
    handleSaveWhiteboard,
    handleDownloadWhiteboard,
  ]);

  return (
    <ClassroomContext.Provider value={value}>
      {children}
    </ClassroomContext.Provider>
  );
}

// ============================================
// LiveClassroom Component
// ============================================

interface LiveClassroomProps {
  classroomSlug: string;
  sessionId: string;
  participantName: string;
  userRole: 'student' | 'tutor' | 'owner';
  onSessionEnd?: () => void;
  classroomColor?: string;
  sessionEndsAt?: string | null;
}

export default function RedesiLiveClassroom({
  classroomSlug,
  sessionId,
  participantName,
  userRole,
  sessionEndsAt,
  onSessionEnd,
  classroomColor = '#6366f1'
}: LiveClassroomProps) {
  const t = useTranslations('LiveClassroom');
  
  // Debug logging
  useEffect(() => {
    console.log('🎯 userRole in LiveClassroom:', userRole);
  }, [userRole]);

  const [isConnected, setIsConnected] = useState(true);
  const [layout, setLayout] = useState('grid');
  const [isRecording, setIsRecording] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Whiteboard toolbar state
  const [whiteboardTool, setWhiteboardTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle' | 'text'>('pen');
  const [whiteboardColor, setWhiteboardColor] = useState('#000000');
  const [whiteboardBrushSize, setWhiteboardBrushSize] = useState(4);
  const [whiteboardFontSize, setWhiteboardFontSize] = useState(16); // 🎯 Independent font size state (pixel value)
  const [whiteboardTextAlign, setWhiteboardTextAlign] = useState<'left' | 'center' | 'right'>('left'); // 🎯 Text alignment state

  // Whiteboard canvas reference - store all canvas references
  const whiteboardCanvasRefs = useRef<{ [key: string]: LiveblocksWhiteboardRef | null }>({});
  // Single whiteboard canvas reference for the main whiteboard
  const whiteboardCanvasRef = useRef<LiveblocksWhiteboardRef>(null);

  // Function to register a canvas ref
  const registerCanvasRef = useCallback((key: string, ref: any) => {
    if (ref) {
      whiteboardCanvasRefs.current[key] = ref;
    } else {
      delete whiteboardCanvasRefs.current[key];
    }
  }, []);

  // Whiteboard clear function
  const handleClearWhiteboard = () => {
    console.log('🎯 handleClearWhiteboard called');
    console.log('Main canvas ref:', whiteboardCanvasRef.current);
    console.log('Canvas refs collection:', whiteboardCanvasRefs.current);

    // Try the main ref first
    if (whiteboardCanvasRef.current) {
      console.log('Clearing via main ref');
      whiteboardCanvasRef.current.clearCanvas();
      return;
    }

    // Fallback to the collection of refs
    Object.values(whiteboardCanvasRefs.current).forEach((canvasRef) => {
      if (canvasRef) {
        console.log('Clearing via collection ref');
        canvasRef.clearCanvas();
      }
    });
  };

  // Whiteboard save function
  const handleSaveWhiteboard = async () => {
    if (whiteboardCanvasRef.current) {
      await whiteboardCanvasRef.current.saveCanvas();
      return;
    }

    // Try collection refs
    Object.values(whiteboardCanvasRefs.current).forEach((canvasRef) => {
      if (canvasRef) {
        canvasRef.saveCanvas();
      }
    });
  };

  // Whiteboard download function
  const handleDownloadWhiteboard = () => {
    if (whiteboardCanvasRef.current) {
      whiteboardCanvasRef.current.downloadCanvas();
      return;
    }

    // Try collection refs
    Object.values(whiteboardCanvasRefs.current).forEach((canvasRef) => {
      if (canvasRef) {
        canvasRef.downloadCanvas();
      }
    });
  };
  const [reactions, setReactions] = useState<Array<{ id: number; type: string; at: number }>>([]);
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: number; type: string; x: number; y: number }>>([]);
  const [reactionEmojis, setReactionEmojis] = useState<Array<{ id: string; emoji: string; timestamp: number }>>([]);
  const [focusedParticipant, setFocusedParticipant] = useState<any>(null);
  const [focusedView, setFocusedView] = useState<'camera' | 'screenshare' | 'whiteboard'>('camera'); // 🎯 Track what view is focused
  const [panelWidth, setPanelWidth] = useState(35); // panel width percentage, default 35%
  const [isResizing, setIsResizing] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set()); // 举手的参与者 identity 集合
  const [whiteboardOwner, setWhiteboardOwner] = useState<string | null>(null); // 🎯 Track who owns the whiteboard
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
    console.log('🎯 [LiveClassroom] Token generation check:', {
      hasTokenData: !!tokenData,
      isLoading,
      hasError: !!error,
      classroomSlug,
      sessionId,
      participantName,
      userRole
    });

    if (!tokenData && !isLoading && !error && classroomSlug && sessionId && participantName) {
      console.log('✅ [LiveClassroom] Conditions met, calling generateToken()');
      generateToken();
    } else {
      console.log('⏭️ [LiveClassroom] Skipping token generation:', {
        reason: !tokenData ? 'no tokenData' :
          isLoading ? 'isLoading' :
            error ? 'has error' :
              !classroomSlug ? 'no classroomSlug' :
                !sessionId ? 'no sessionId' :
                  !participantName ? 'no participantName' :
                    'already has token'
      });

      if (!classroomSlug || !sessionId || !participantName) {
        console.warn('⚠️ [LiveClassroom] Missing required parameters for token generation:', {
          classroomSlug: !!classroomSlug,
          sessionId: !!sessionId,
          participantName: !!participantName
        });
      }
    }
  }, [tokenData, isLoading, error, generateToken, classroomSlug, sessionId, participantName]);

  // 🎯 获取 session 开始时间
  useEffect(() => {
    const fetchSessionStartTime = async () => {
      try {
        const response = await fetch(`/api/classroom/${classroomSlug}/live-sessions`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.sessions) {
            // 查找当前 session
            const currentSession = data.sessions.find((s: any) =>
              s.id === sessionId || s.public_id === sessionId || s.slug === sessionId
            );

            if (currentSession && currentSession.starts_at) {
              const startTime = new Date(currentSession.starts_at).getTime();
              setSessionStartTime(startTime);
              console.log('🕐 Session start time set:', new Date(startTime).toISOString());
            } else {
              // 如果找不到 session，使用当前时间
              console.warn('⚠️ Session not found, using current time');
              setSessionStartTime(Date.now());
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch session start time:', error);
        // 如果获取失败，使用当前时间作为开始时间
        setSessionStartTime(Date.now());
      }
    };

    if (classroomSlug && sessionId) {
      fetchSessionStartTime();
    }
  }, [classroomSlug, sessionId]);

  // 🎯 Session timer - 从开始时间计算经过的时间
  useEffect(() => {
    if (!sessionStartTime) return;

    const updateDuration = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - sessionStartTime) / 1000);
      setSessionDuration(elapsed > 0 ? elapsed : 0);
    };

    // 立即更新一次
    updateDuration();

    // 每秒更新
    const timer = setInterval(updateDuration, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  // DataChannel error handling will be added in LiveClassroomContent where room context is available

  const handleConnect = () => {
    if (!tokenData) {
      generateToken();
    }
  };

  const handleDisconnected = () => {
    setIsConnected(false);
    toast.info(t('disconnected'));
  };

  const handleConnected = () => {
    setIsConnected(true);
    toast.success(t('successfully_connected'));
  };

  const handleError = (error: Error) => {
    toast.error(`${t('connection_problem')}: ${error.message}`);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const addReaction = useCallback((emojiKey: string) => {
    console.log('🎯 addReaction called with key:', emojiKey);
    console.log('🎯 reactionEmojiMap:', reactionEmojiMap);

    // Convert emoji key to actual emoji symbol
    const emojiSymbol = reactionEmojiMap[emojiKey as keyof typeof reactionEmojiMap] || emojiKey;
    console.log('🎯 Emoji symbol:', emojiSymbol);

    const newReaction = {
      id: Math.random().toString(36).substr(2, 9),
      emoji: emojiSymbol,
      timestamp: Date.now(),
    };

    console.log('🎯 Adding reaction:', newReaction);
    setReactionEmojis((prev: Array<{ id: string; emoji: string; timestamp: number }>) => {
      const updated = [...prev, newReaction];
      console.log('🎯 Updated reactionEmojis:', updated);
      return updated;
    });

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
    onSessionEnd?.();
    toast.info(t('classroom_ended'));
  };

  // Panel drag resize handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const containerWidth = window.innerWidth;
    const newPanelWidth = ((containerWidth - e.clientX) / containerWidth) * 100;

    // Limit panel width between 20% and 60%
    const clampedWidth = Math.max(20, Math.min(60, newPanelWidth));
    setPanelWidth(clampedWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleToggleRecording = useCallback(() => {
    // Simple state toggle - actual recording logic is handled in BottomControls
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast.success(t('recording_started'));
    } else {
      toast.success(t('recording_stopped'));
    }
  }, [isRecording, t]);

  // 🎯 举手功能：切换本地举手状态
  const handleToggleHandRaise = useCallback(() => {
    // 这个函数会在 LiveClassroomContent 中被调用
    // 实际的状态更新在那里处理
  }, []);

  // 🎯 处理远程举手消息
  const handleRemoteHandRaise = useCallback((userId: string, isRaised: boolean) => {
    setRaisedHands(prev => {
      const newSet = new Set(prev);
      if (isRaised) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  }, []);

  const onRefreshToken = () => {
    generateToken();
    toast.info('Refreshing connection token...');
  };

  if (isLoading) {
    console.log('🔄 [LiveClassroom] Showing loading state:', {
      isLoading,
      hasTokenData: !!tokenData,
      hasError: !!error
    });

    return (
      <Card className="w-full h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>{t('preparing_classroom')}</p>
            <p className="text-xs text-slate-500">{t('generating_token')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !tokenData) {
    const errorMessage = error instanceof Error ? error.message :
      typeof error === 'string' ? error :
        'Unable to obtain classroom access';

    return (
      <Card className="w-full h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center space-y-4 max-w-md text-center">
            <div className="text-red-500 text-6xl mb-2">⚠️</div>
            <h3 className="text-lg font-medium text-slate-800">{t('connection_problem')}</h3>
            <p className="text-red-500 text-sm">
              {errorMessage}
            </p>
            <div className="flex gap-2">
              <Button onClick={handleConnect} variant="outline" size="sm">
                {t('reconnect')}
              </Button>
              <Button onClick={() => window.location.reload()} variant="default" size="sm">
                {t('refresh_page')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="relative w-full mb-12 px-2 md:px-0"
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
        className="flex flex-col relative rounded-lg md:rounded-xl overflow-hidden"
        style={{
          margin: '0',
          background: `linear-gradient(to bottom right, ${classroomColor}15, ${classroomColor}05, ${classroomColor}15)`,
          backgroundColor: '#0f172a',
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
          sessionEndsAt={sessionEndsAt}
          isConnected={isConnected}
          connectionError={connectionError}
          onRefreshToken={onRefreshToken}
          layout={layout}
          setLayout={setLayout}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          isParticipantsOpen={isParticipantsOpen}
          setIsParticipantsOpen={setIsParticipantsOpen}
          isWhiteboardOpen={isWhiteboardOpen}
          setIsWhiteboardOpen={setIsWhiteboardOpen}
          sessionDuration={sessionDuration}
          reactions={reactions}
          floatingReactions={floatingReactions}
          focusedParticipant={focusedParticipant}
          setFocusedParticipant={setFocusedParticipant}
          focusedView={focusedView}
          setFocusedView={setFocusedView}
          participants={[]}
          reactionEmojis={{}}
          reactionEmojiMap={reactionEmojiMap}
          toggleMedia={toggleMedia}
          handleToggleRecording={handleToggleRecording}
          isRecording={isRecording}
          localMediaState={localMediaState}
          addReaction={addReaction}
          formatDuration={formatDuration}
          panelWidth={panelWidth}
          handleMouseDown={handleMouseDown}
          isResizing={isResizing}
          whiteboardTool={whiteboardTool}
          setWhiteboardTool={setWhiteboardTool}
          whiteboardColor={whiteboardColor}
          setWhiteboardColor={setWhiteboardColor}
          whiteboardBrushSize={whiteboardBrushSize}
          setWhiteboardBrushSize={setWhiteboardBrushSize}
          whiteboardFontSize={whiteboardFontSize}
          setWhiteboardFontSize={setWhiteboardFontSize}
          whiteboardTextAlign={whiteboardTextAlign}
          setWhiteboardTextAlign={setWhiteboardTextAlign}
          handleClearWhiteboard={handleClearWhiteboard}
          handleSaveWhiteboard={handleSaveWhiteboard}
          handleDownloadWhiteboard={handleDownloadWhiteboard}
          whiteboardCanvasRef={whiteboardCanvasRef}
          whiteboardCanvasRefs={whiteboardCanvasRefs}
          registerCanvasRef={registerCanvasRef}
          raisedHands={raisedHands}
          whiteboardOwner={whiteboardOwner}
          setWhiteboardOwner={setWhiteboardOwner}
          onToggleHandRaise={handleToggleHandRaise}
          onRemoteHandRaise={handleRemoteHandRaise}
        />
      </LiveKitRoom>
    </div>
  );
}

interface LiveClassroomContentProps {
  classroomSlug: string;
  sessionId: string;
  participantName: string;
  userRole: 'student' | 'tutor' | 'owner';
  onSessionEnd?: () => void;
  classroomColor?: string;
  sessionEndsAt?: string | null;
  isConnected?: boolean;
  connectionError?: string | null;
  onRefreshToken?: () => void;
  layout: string;
  setLayout: (layout: string) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isParticipantsOpen: boolean;
  setIsParticipantsOpen: (open: boolean) => void;
  isWhiteboardOpen: boolean;
  setIsWhiteboardOpen: (open: boolean) => void;
  sessionDuration: number;
  reactions: Array<{ id: number; type: string; at: number }>;
  floatingReactions: Array<{ id: number; type: string; x: number; y: number }>;
  focusedParticipant: any;
  setFocusedParticipant: (participant: any) => void;
  focusedView: 'camera' | 'screenshare' | 'whiteboard';
  setFocusedView: (view: 'camera' | 'screenshare' | 'whiteboard') => void;
  participants: any[];
  reactionEmojis: Record<string, string>;
  toggleMedia: (type: 'camera' | 'microphone' | 'screenShare') => void;
  handleToggleRecording: () => void;
  isRecording: boolean;
  localMediaState: { camera: boolean; microphone: boolean; screenShare: boolean };
  addReaction: (type: string) => void;
  reactionEmojiMap: Record<string, string>;
  formatDuration: (seconds: number) => string;
  panelWidth: number;
  handleMouseDown: (e: React.MouseEvent) => void;
  isResizing: boolean;
  // Whiteboard toolbar state
  whiteboardTool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  setWhiteboardTool: (tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text') => void;
  whiteboardColor: string;
  setWhiteboardColor: (color: string) => void;
  whiteboardBrushSize: number;
  setWhiteboardBrushSize: (size: number) => void;
  whiteboardFontSize: number;
  setWhiteboardFontSize: (size: number) => void;
  whiteboardTextAlign: 'left' | 'center' | 'right';
  setWhiteboardTextAlign: (align: 'left' | 'center' | 'right') => void;
  // Whiteboard operations functions
  handleClearWhiteboard: () => void;
  handleSaveWhiteboard: () => Promise<void>;
  handleDownloadWhiteboard: () => void;
  whiteboardCanvasRef: React.RefObject<any>;
  whiteboardCanvasRefs: React.MutableRefObject<{ [key: string]: any }>;
  registerCanvasRef: (key: string, ref: any) => void;
  raisedHands: Set<string>;
  whiteboardOwner: string | null;
  setWhiteboardOwner: (owner: string | null) => void;
  onToggleHandRaise: () => void;
  onRemoteHandRaise: (userId: string, isRaised: boolean) => void;
}

function LiveClassroomContent({
  classroomSlug,
  sessionId,
  participantName: originalParticipantName,
  userRole,
  onSessionEnd,
  classroomColor = '#6366f1',
  sessionEndsAt,
  isConnected,
  connectionError,
  onRefreshToken,
  layout,
  setLayout,
  isChatOpen,
  setIsChatOpen,
  isParticipantsOpen,
  setIsParticipantsOpen,
  isWhiteboardOpen,
  setIsWhiteboardOpen,
  sessionDuration,
  reactions,
  floatingReactions,
  focusedParticipant,
  setFocusedParticipant,
  focusedView,
  setFocusedView,
  participants: propParticipants,
  reactionEmojis,
  toggleMedia,
  handleToggleRecording,
  isRecording,
  localMediaState,
  addReaction,
  formatDuration,
  reactionEmojiMap,
  panelWidth,
  handleMouseDown,
  isResizing,
  whiteboardTool,
  setWhiteboardTool,
  whiteboardColor,
  setWhiteboardColor,
  whiteboardBrushSize,
  setWhiteboardBrushSize,
  whiteboardFontSize,
  setWhiteboardFontSize,
  whiteboardTextAlign,
  setWhiteboardTextAlign,
  handleClearWhiteboard,
  handleSaveWhiteboard,
  handleDownloadWhiteboard,
  whiteboardCanvasRef,
  whiteboardCanvasRefs,
  registerCanvasRef,
  raisedHands,
  whiteboardOwner,
  setWhiteboardOwner,
  onToggleHandRaise,
  onRemoteHandRaise
}: LiveClassroomContentProps) {
  const t = useTranslations('LiveClassroom');
  const room = useRoomContext();
  const livekitParticipants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  // 🎯 Debug: Log userRole whenever it changes
  useEffect(() => {
    console.log('🔍 [LiveClassroomContent] userRole changed:', userRole);
  }, [userRole]);
  const { data: participantsInfo = [] } = useParticipantsInfo(classroomSlug);

  // Get all tracks using useTracks for better subscription handling
  const allTracks = useTracks([Track.Source.Camera, Track.Source.Microphone, Track.Source.ScreenShare]);

  // Create a Map for O(1) lookup of participant info
  const participantsInfoMap = useMemo(() => {
    console.log('🔍 [participantsInfoMap] Building map from participantsInfo:', participantsInfo);

    const m = new Map<string, ParticipantInfo>();
    // Ensure participantsInfo is an array before calling forEach
    if (Array.isArray(participantsInfo)) {
      participantsInfo.forEach(info => {
        console.log('🔍 [participantsInfoMap] Processing info:', {
          id: info.id,
          user_id: info.user_id,
          display_name: info.display_name,
          role: info.role
        });

        // LiveKit identity format is 'user-{profile.id}', so we create both mappings
        if (info.id) {
          // Map both the raw ID and the LiveKit format
          m.set(String(info.id), info);           // Direct profile ID mapping
          m.set(`user-${info.id}`, info);         // LiveKit identity format
          console.log(`🔍 [participantsInfoMap] Added mappings: "${info.id}" and "user-${info.id}"`);
        }
        // Also map by user_id if available (UUID format)
        if (info.user_id) {
          m.set(String(info.user_id), info);
          console.log(`🔍 [participantsInfoMap] Added UUID mapping: "${info.user_id}"`);
        }
      });
    } else {
      console.warn('⚠️ [participantsInfoMap] participantsInfo is not an array:', participantsInfo);
    }

    console.log('🔍 [participantsInfoMap] Final map keys:', Array.from(m.keys()));
    return m;
  }, [participantsInfo]);

  // Merge LiveKit participants with database participant info
  const mergedParticipants = useMemo(() => {

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
            // If avatar_url is relative path, convert to absolute path
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


      return mergedParticipant;
    });
  }, [livekitParticipants, participantsInfoMap]);

  // Add track subscription event listeners
  useEffect(() => {
    if (!room) return;

    const handleTrackSubscribed = (track: any, publication: any, participant: any) => {
      // Track subscribed
    };

    const handleTrackUnsubscribed = (track: any, publication: any, participant: any) => {
      // Track unsubscribed
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    };
  }, [room]);

  // Monitor participant connections and disconnections
  useEffect(() => {
    if (!room) return;

    const handleParticipantConnected = (participant: any) => {
      // Get participant display name from merged data
      const participantInfo = participantsInfoMap.get(String(participant.identity));
      const displayName = participantInfo?.display_name ||
        participantInfo?.name ||
        participantInfo?.full_name ||
        participant.name ||
        `User ${participant.identity}`;

      console.log(`✅ ${displayName} joined the session`);
      console.log(`👥 Total participants: ${room.numParticipants}`);

      // Show toast notification
      toast.success(t('joined_session', { name: displayName }), {
        duration: 3000,
        icon: '👋',
      });
    };

    const handleParticipantDisconnected = (participant: any) => {
      // Get participant display name from merged data
      const participantInfo = participantsInfoMap.get(String(participant.identity));
      const displayName = participantInfo?.display_name ||
        participantInfo?.name ||
        participantInfo?.full_name ||
        participant.name ||
        `User ${participant.identity}`;

      console.log(`👋 ${displayName} left the session`);
      console.log(`👥 Total participants: ${room.numParticipants}`);

      // Show toast notification
      toast.info(t('left_session', { name: displayName }), {
        duration: 3000,
        icon: '👋',
      });
    };

    const handleDisconnected = () => {
      console.log('🔌 You have been disconnected from the session');
      toast.info(t('you_left_session'));
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [room, participantsInfoMap]);

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

  // Keep camera and microphone OFF by default when joining
  // Users can manually enable them using the controls
  useEffect(() => {
    if (!localParticipant || !room) return;

    const disableLocalTracks = async () => {
      try {
        // Start with camera and microphone OFF
        await localParticipant.setCameraEnabled(false);
        await localParticipant.setMicrophoneEnabled(false);

        console.log('🎥 [LiveClassroom] Local tracks initialized (OFF by default)');
      } catch (error) {
        console.error('Failed to initialize local tracks:', error);
      }
    };

    // Small delay to ensure room is fully connected
    const timer = setTimeout(disableLocalTracks, 1000);
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
        camera: 'Camera',
        microphone: 'Microphone',
        screenShare: 'Screen Share'
      };
      toast.success(`${mediaNames[type]} ${localParticipant.isCameraEnabled || localParticipant.isMicrophoneEnabled || localParticipant.isScreenShareEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error(`Failed to toggle ${type}:`, error);
      toast.error(`Cannot toggle ${type === 'camera' ? 'camera' : type === 'microphone' ? 'microphone' : 'screen share'}`);
    }
  }, [localParticipant, toggleMedia]);

  // Session timer is handled in parent component

  // Use LiveKit's lossy DataChannel for reactions only (not chat)
  const { message: reactionMessage } = useDataChannel('reactions');

  // Disable DataChannel chat handling - chat uses API persistence
  useEffect(() => {
    if (!room) return;

    const handleDataPacket = () => {
      // ❌ Don't handle DataChannel messages
      // Because we use API persistence, don't need LiveKit DataChannel
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

  // 🎯 通过 DataChannel 广播举手状态
  const broadcastHandRaise = useCallback((isRaised: boolean) => {
    if (room?.localParticipant) {
      const handRaiseData = {
        type: 'hand_raise',
        isRaised,
        userId: room.localParticipant.identity,
        userName: originalParticipantName,
        timestamp: Date.now()
      };

      room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(handRaiseData)),
        { reliable: true } // 使用可靠传输确保消息送达
      ).catch((error: any) => {
        console.error('Failed to broadcast hand raise:', error);
      });
    }
  }, [room, originalParticipantName]);

  // 🎯 本地举手切换（同时广播）
  const handleLocalHandRaise = useCallback(() => {
    if (!room?.localParticipant) return;

    const myIdentity = room.localParticipant.identity;
    const isCurrentlyRaised = raisedHands.has(myIdentity);
    const newState = !isCurrentlyRaised;

    // 更新本地状态
    onRemoteHandRaise(myIdentity, newState);

    // 广播新状态
    broadcastHandRaise(newState);

    // 显示本地提示
    if (newState) {
      toast.success(t('hand_raised_success'));
    } else {
      toast.info(t('hand_lowered'));
    }
  }, [room, raisedHands, onRemoteHandRaise, broadcastHandRaise]);

  // 🎯 广播 whiteboard 状态
  const broadcastWhiteboardState = useCallback((isOpen: boolean) => {
    if (room?.localParticipant) {
      const whiteboardData = {
        type: 'whiteboard_state',
        isOpen,
        userId: room.localParticipant.identity,
        userName: originalParticipantName,
        timestamp: Date.now()
      };

      room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(whiteboardData)),
        { reliable: true } // 使用可靠传输确保消息送达
      ).catch((error: any) => {
        console.error('Failed to broadcast whiteboard state:', error);
      });

      console.log(`📋 Broadcasting whiteboard state: ${isOpen ? 'opened' : 'closed'}`);
    }
  }, [room, originalParticipantName]);

  // Get all tracks at component level (not inside callback)
  const allTracksForClick = useTracks([Track.Source.Camera, Track.Source.Microphone, Track.Source.ScreenShare]);

  // 🎯 Handle participant click - cycle through camera, screenshare, whiteboard
  const handleParticipantClick = useCallback((participant: any) => {
    const livekitParticipant = participant.livekitParticipant || participant;
    if (!livekitParticipant) return;

    // Get participant's tracks
    const participantTracks = allTracksForClick.filter(t => t.participant.identity === livekitParticipant.identity);
    const hasScreenShare = participantTracks.some(t => t.source === Track.Source.ScreenShare && !t.publication?.isMuted);
    const hasWhiteboard = whiteboardOwner === livekitParticipant.identity;

    // If clicking the same participant, cycle through views
    if (focusedParticipant?.identity === livekitParticipant.identity) {
      if (focusedView === 'camera' && hasScreenShare) {
        setFocusedView('screenshare');
        toast.success(t('viewing_screen_share', { name: participant.displayName }));
      } else if (focusedView === 'screenshare' && hasWhiteboard) {
        setFocusedView('whiteboard');
        toast.success(t('viewing_whiteboard', { name: participant.displayName }));
      } else if (focusedView === 'camera' && hasWhiteboard) {
        setFocusedView('whiteboard');
        toast.success(t('viewing_whiteboard', { name: participant.displayName }));
      } else {
        // Cycle back to camera
        setFocusedView('camera');
        toast.success(t('viewing_camera', { name: participant.displayName }));
      }
    } else {
      // New participant selected
      setFocusedParticipant(participant);
      setFocusedView('camera');
      toast.success(t('focused_on', { name: participant.displayName }));
    }
  }, [allTracksForClick, focusedParticipant, focusedView, whiteboardOwner]);

  // 🎯 Monitor whiteboard state changes
  useEffect(() => {
    console.log('📋 Whiteboard state changed:', {
      isWhiteboardOpen,
      whiteboardOwner,
      layout,
      focusedView
    });
  }, [isWhiteboardOpen, whiteboardOwner, layout, focusedView]);

  // 🎯 处理 whiteboard 切换（同时广播）
  const handleWhiteboardToggle = useCallback(() => {
    console.log('🎯 handleWhiteboardToggle called', {
      hasRoom: !!room,
      hasLocalParticipant: !!room?.localParticipant,
      identity: room?.localParticipant?.identity,
      isWhiteboardOpen,
      whiteboardOwner
    });

    const myIdentity = room?.localParticipant?.identity;
    if (!myIdentity) {
      console.warn('⚠️ Cannot toggle whiteboard: No local participant identity');
      toast.error('Please wait for connection to establish');
      return;
    }

    const newState = !isWhiteboardOpen;
    console.log('🎯 Toggling whiteboard to:', newState);

    // 更新本地状态
    setIsWhiteboardOpen(newState);

    // 🎯 Update whiteboard owner (for tracking, but not restricting)
    if (newState) {
      setWhiteboardOwner(myIdentity);
      setIsChatOpen(false);

      // 🎯 Switch to whiteboard view if in focus/presentation layout
      if (layout === 'focus' || layout === 'presentation') {
        setFocusedView('whiteboard');
        // Set focused participant to self
        const selfParticipant = mergedParticipants.find((p: any) => p.identity === myIdentity);
        if (selfParticipant) {
          setFocusedParticipant(selfParticipant);
        }
      }
    } else {
      setWhiteboardOwner(null);
      // 🎯 Switch back to camera view when closing whiteboard
      if (focusedView === 'whiteboard') {
        setFocusedView('camera');
      }
    }

    // 广播新状态
    broadcastWhiteboardState(newState);

    // 显示本地提示
    if (newState) {
      toast.success(t('whiteboard_opened_success'));
    } else {
      toast.info(t('whiteboard_closed'));
    }
  }, [isWhiteboardOpen, whiteboardOwner, room, setIsWhiteboardOpen, setIsChatOpen, broadcastWhiteboardState, layout, focusedView, mergedParticipants, setFocusedView, setFocusedParticipant]);

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

  // 🎯 监听举手消息和 whiteboard 状态 - 通过 room 的 DataReceived 事件
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant: any) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));

        if (data.type === 'hand_raise') {
          const { userId, userName, isRaised } = data;

          // 更新举手状态
          onRemoteHandRaise(userId, isRaised);

          // 只有老师/owner 才显示举手通知
          if (isRaised && (userRole === 'tutor' || userRole === 'owner')) {
            toast.info(t('hand_raised', { name: userName }), {
              duration: 3000,
            });
          }
        }

        // 🎯 处理 whiteboard 状态同步
        if (data.type === 'whiteboard_state') {
          const { isOpen, userName, userId } = data;
          console.log(`📋 Whiteboard state changed by ${userName}: ${isOpen ? 'opened' : 'closed'}`);

          // 🎯 Update whiteboard owner
          if (isOpen) {
            setWhiteboardOwner(userId);
          } else {
            setWhiteboardOwner(null);
          }

          // 显示通知
          if (isOpen) {
            toast.info(t('whiteboard_opened', { name: userName }), {
              duration: 3000,
              icon: '📋',
            });
          }
        }
      } catch (error) {
        console.error('Error parsing DataChannel message:', error);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, userRole, onRemoteHandRaise]);

  const handleStartRecording = () => {
    toast.success(t('recording_started'));
  };

  const handleStopRecording = () => {
    toast.info(t('recording_stopped'));
  };

  const handleEndSession = () => {
    if (room) {
      room.disconnect();
    }
    onSessionEnd?.();
    toast.info(t('classroom_ended'));
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
    <div className="h-full flex flex-col relative">
      {/* Floating Reactions */}
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        <AnimatePresence>
          {Array.isArray(reactionEmojis) && reactionEmojis.map((reaction: { id: string; emoji: string; timestamp: number }) => (
            <motion.div
              key={reaction.id}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: -200,
                x: [0, Math.random() * 100 - 50],
                scale: [0.5, 1.2, 1, 0.8]
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 3, ease: "easeOut" }}
              className="absolute bottom-20 text-6xl"
              style={{
                left: `${Math.random() * 80 + 10}%`,
                filter: `drop-shadow(0 0 8px ${classroomColor}80)`,
                textShadow: `0 0 20px ${classroomColor}`,
              }}
            >
              <div
                className="relative inline-block p-3 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${classroomColor}40 0%, ${classroomColor}20 50%, transparent 100%)`,
                }}
              >
                {reaction.emoji}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Header
        isConnected={isConnected}
        participantCount={participants.length}
        sessionDuration={sessionDuration}
        formatDuration={formatDuration}
        isRecording={isRecording}
        userRole={userRole}
        layout={layout}
        setLayout={setLayout}
        sessionEndsAt={sessionEndsAt}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - fixed width on desktop, hidden on mobile */}
        <div className="hidden md:flex flex-shrink-0">
          <Sidebar
            participants={participants}
            isParticipantsOpen={isParticipantsOpen}
            setIsParticipantsOpen={setIsParticipantsOpen}
            isChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
            isWhiteboardOpen={isWhiteboardOpen}
            onWhiteboardToggle={handleWhiteboardToggle}
            userRole={userRole}
            onHandRaise={handleLocalHandRaise}
            isHandRaised={room?.localParticipant ? raisedHands.has(room.localParticipant.identity) : false}
            raisedHandsCount={raisedHands.size}
            whiteboardOwner={whiteboardOwner}
            localIdentity={room?.localParticipant?.identity}
          />
        </div>

        {/* Middle content area - contains video area and panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video Area - responsive width and padding */}
          <div
            className="relative p-2 md:p-4 z-[10] transition-all duration-300 flex-shrink-0"
            style={{
              width: (isChatOpen || isWhiteboardOpen)
                ? window.innerWidth < 768 ? '100%' : `calc(100% - ${panelWidth}% - 4px)` // Full width on mobile
                : '100%',
              height: '100%'
            }}
          >
            <VideoArea
              layout={layout}
              participants={participants}
              focusedParticipant={focusedParticipant}
              setFocusedParticipant={handleParticipantClick}
              focusedView={focusedView}
              isWhiteboardOpen={isWhiteboardOpen}
              classroomSlug={classroomSlug}
              sessionId={sessionId}
              userRole={userRole}
              panelsOpen={isChatOpen || isWhiteboardOpen}
              whiteboardTool={whiteboardTool}
              whiteboardColor={whiteboardColor}
              whiteboardBrushSize={whiteboardBrushSize}
              whiteboardFontSize={whiteboardFontSize}
              whiteboardTextAlign={whiteboardTextAlign}
              whiteboardCanvasRef={whiteboardCanvasRef}
              registerCanvasRef={registerCanvasRef}
              raisedHands={raisedHands}
              whiteboardOwner={whiteboardOwner}
              localParticipant={localParticipant}
              originalParticipantName={originalParticipantName}
            />
          </div>

          {/* Drag divider - only on desktop */}
          {(isChatOpen || isWhiteboardOpen) && (
            <div
              className={`hidden md:block w-1 bg-slate-600/20 hover:bg-slate-500/40 cursor-col-resize z-[15] flex-shrink-0 ${isResizing ? 'bg-slate-400/60' : ''
                } transition-colors`}
              onMouseDown={handleMouseDown}
            />
          )}

          {/* Right Panel Container - full screen on mobile, side panel on desktop */}
          {(isChatOpen || isWhiteboardOpen) && (
            <div
              className="panel-container fixed md:relative inset-0 md:inset-auto transition-all duration-300 flex-shrink-0 overflow-hidden bg-slate-900 md:bg-transparent z-50 md:z-10"
              style={{
                width: window.innerWidth < 768 ? '100%' : `${panelWidth}%`,
                height: '100%',
                minWidth: window.innerWidth < 768 ? 'auto' : '200px',
                maxWidth: window.innerWidth < 768 ? 'none' : '600px',
                flexShrink: 0,
                overflow: 'hidden'
              }}
            >
              <div className="w-full h-full flex flex-col">
                {/* Chat Panel - LiveKit DataChannel real-time communication */}
                <div className={`flex-1 ${isChatOpen ? 'block' : 'hidden'} overflow-hidden`}>
                  <SessionChatPanel
                    isOpen={isChatOpen}
                    classroomSlug={classroomSlug}
                    sessionId={sessionId}
                    userInfo={{
                      id: localParticipant?.identity || `${classroomSlug}-${sessionId}`,
                      name: originalParticipantName,
                      avatar: '', // Can add avatar support later
                      role: userRole
                    }}
                    participants={participants.map((p: any) => ({
                      identity: p.identity,
                      displayName: p.displayName,
                      avatarUrl: p.avatarUrl,
                      role: p.role
                    }))}
                    onParticipantClick={(participant: any) => {
                      // Find the full participant object from the participants array
                      const fullParticipant = participants.find((p: any) => p.identity === participant.identity);
                      if (fullParticipant) {
                        setFocusedParticipant(fullParticipant);
                        toast.success(`Focused on ${participant.displayName}`);
                      }
                    }}
                    focusedParticipantIdentity={focusedParticipant?.identity}
                  />
                </div>

                {/* Whiteboard Panel */}
                <div className={`flex-1 ${isWhiteboardOpen ? 'block' : 'hidden'} overflow-hidden`}>
                  <WhiteboardPanel
                    isOpen={isWhiteboardOpen}
                    classroomSlug={classroomSlug}
                    sessionId={sessionId}
                    userRole={userRole}
                    currentTool={whiteboardTool}
                    setCurrentTool={setWhiteboardTool}
                    currentColor={whiteboardColor}
                    setCurrentColor={setWhiteboardColor}
                    currentBrushSize={whiteboardBrushSize}
                    setCurrentBrushSize={setWhiteboardBrushSize}
                    currentFontSize={whiteboardFontSize}
                    setCurrentFontSize={setWhiteboardFontSize}
                    currentTextAlign={whiteboardTextAlign}
                    setCurrentTextAlign={setWhiteboardTextAlign}
                    onClearCanvas={handleClearWhiteboard}
                    onSaveCanvas={handleSaveWhiteboard}
                    onDownloadCanvas={handleDownloadWhiteboard}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <BottomControls
        colors={{ primary: classroomColor, light: '#818cf8', dark: '#4338ca' }}
        userRole={userRole}
        isRecording={isRecording}
        onStartRecording={() => handleToggleRecording()}
        onStopRecording={() => handleToggleRecording()}
        onEndSession={handleEndSession}
        classroomSlug={classroomSlug}
        sessionId={sessionId?.toString()}
        onLeaveSession={() => {
          // Log leave action
          console.log(`👋 You (${currentUserDisplayName}) are leaving the session`);

          // Disconnect from room and redirect to classroom dashboard
          if (room) {
            room.disconnect();
          }

          // Small delay to ensure disconnect event is processed
          setTimeout(() => {
            window.location.href = `/classroom/${classroomSlug}`;
          }, 100);
        }}
      />

      {/* Participants List Overlay - Independent positioned element */}
      <AnimatePresence>
        {isParticipantsOpen && (
          <motion.div
            className="participants-list-container absolute left-16 top-19 w-80 h-full bg-slate-800/95 backdrop-blur-sm border-r border-slate-700/50 pointer-events-auto"
            style={{
              zIndex: 100
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ParticipantsList
              participants={participants}
              userRole={userRole}
              raisedHands={raisedHands}
              onParticipantClick={handleParticipantClick}
              focusedParticipant={focusedParticipant}
              whiteboardOwner={whiteboardOwner}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}


function Header({ isConnected, participantCount, sessionDuration, formatDuration, isRecording, userRole, layout, setLayout, sessionEndsAt }: any) {
  const t = useTranslations('LiveClassroom');
  // Calculate time until session ends
  const [timeUntilEnd, setTimeUntilEnd] = React.useState<string | null>(null);
  const [isEndingSoon, setIsEndingSoon] = React.useState(false);

  React.useEffect(() => {
    if (!sessionEndsAt) return;

    const updateTimeUntilEnd = () => {
      const now = Date.now();
      const endTime = new Date(sessionEndsAt).getTime();
      const diffMs = endTime - now;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      if (diffMs <= 0) {
        setTimeUntilEnd(t('ending_now'));
        setIsEndingSoon(true);
      } else if (diffMinutes < 1) {
        setTimeUntilEnd(`${diffSeconds}s`);
        setIsEndingSoon(true);
      } else if (diffMinutes < 10) {
        setTimeUntilEnd(`${diffMinutes}m`);
        setIsEndingSoon(true);
      } else if (diffMinutes < 60) {
        setTimeUntilEnd(`${diffMinutes}m`);
        setIsEndingSoon(false);
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        setTimeUntilEnd(`${hours}h ${mins}m`);
        setIsEndingSoon(false);
      }
    };

    updateTimeUntilEnd();
    const interval = setInterval(updateTimeUntilEnd, 1000);

    return () => clearInterval(interval);
  }, [sessionEndsAt]);

  return (
    <motion.header
      className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 px-3 md:px-6 py-2 md:py-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Status & Info */}
        <div className="flex items-center space-x-2 md:space-x-6 flex-1 min-w-0">
          <div className="flex items-center space-x-1.5 md:space-x-3">
            <div className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`} />
            <h1 className="text-sm md:text-xl font-semibold text-white truncate">Live</h1>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4 text-xs md:text-sm text-slate-300">
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3 md:w-4 md:h-4" />
              <span>{participantCount}</span>
            </div>
            <div className="hidden sm:flex items-center space-x-1">
              <Clock className="w-3 h-3 md:w-4 md:h-4" />
              <span>{formatDuration(sessionDuration)}</span>
            </div>
            {timeUntilEnd && (
              <div className={`flex items-center space-x-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full border ${isEndingSoon
                ? 'bg-orange-500/20 border-orange-400/30 animate-pulse'
                : 'bg-blue-500/20 border-blue-400/30'
                }`}>
                <Timer className="w-3 h-3 md:w-4 md:h-4" />
                <span className={`text-[10px] md:text-xs font-medium ${isEndingSoon ? 'text-orange-300' : 'text-blue-300'
                  }`}>
                  {isEndingSoon ? '⏰ ' : ''}{timeUntilEnd}
                </span>
              </div>
            )}
            {isRecording && (
              <div className="flex items-center space-x-1 bg-red-500/20 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full border border-red-400/30">
                <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-red-400 rounded-full animate-pulse" />
                <span className="text-red-300 text-[10px] md:text-xs font-medium">REC</span>
              </div>
            )}
          </div>
        </div>

        {/* Layout Controls - hidden on mobile */}
        <div className="hidden md:block">
          <LayoutControls layout={layout} setLayout={setLayout} />
        </div>
      </div>
    </motion.header>
  );
}

// Layout Controls Component
function LayoutControls({ layout, setLayout }: any) {
  const t = useTranslations('LiveClassroom');
  const layouts = [
    { key: 'grid', icon: Grid3X3, label: t('grid') },
    { key: 'presentation', icon: Presentation, label: t('presentation') },
    { key: 'focus', icon: Maximize, label: t('focus') }
  ];

  return (
    <div className="flex justify-center items-center bg-slate-700/30 backdrop-blur-sm rounded-lg p-1">
      {layouts.map(({ key, icon: Icon, label }) => (
        <motion.button
          key={key}
          onClick={() => setLayout(key)}
          className={`relative flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${layout === key
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
function Sidebar({ participants, isParticipantsOpen, setIsParticipantsOpen, isChatOpen, setIsChatOpen, isWhiteboardOpen, onWhiteboardToggle, userRole, onHandRaise, isHandRaised, raisedHandsCount, whiteboardOwner, localIdentity }: any) {
  const t = useTranslations('LiveClassroom');
  // 🎯 Allow all participants to use whiteboard simultaneously
  const isWhiteboardDisabled = false; // Removed ownership restriction

  return (
    <motion.aside
      className="w-16 h-full bg-slate-800/30 backdrop-blur-sm border-r border-slate-700/50 flex flex-col z-20"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="flex-1 flex flex-col items-center py-4 space-y-4">
        {/* Participants Toggle */}
        <motion.button
          onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
          className={`p-3 rounded-xl transition-all relative ${isParticipantsOpen
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
          {/* 🎯 举手数量徽章 */}
          {raisedHandsCount > 0 && (userRole === 'tutor' || userRole === 'owner') && (
            <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              🖐️
            </div>
          )}
        </motion.button>

        {/* Chat Toggle */}
        <motion.button
          onClick={() => {
            setIsChatOpen(!isChatOpen);
          }}
          className={`p-3 rounded-xl transition-all ${isChatOpen
            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200'
            }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MessageCircle className="w-5 h-5" />
        </motion.button>

        {/* Whiteboard Toggle */}
        <motion.button
          onClick={() => {
            console.log('🖱️ Whiteboard button clicked', {
              isDisabled: isWhiteboardDisabled,
              isOpen: isWhiteboardOpen,
              owner: whiteboardOwner,
              localIdentity
            });
            if (!isWhiteboardDisabled) {
              onWhiteboardToggle();
            }
          }}
          disabled={isWhiteboardDisabled}
          className={`p-3 rounded-xl transition-all relative ${isWhiteboardOpen
            ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
            : isWhiteboardDisabled
              ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
              : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200'
            }`}
          whileHover={{ scale: isWhiteboardDisabled ? 1 : 1.05 }}
          whileTap={{ scale: isWhiteboardDisabled ? 1 : 0.95 }}
          title={isWhiteboardDisabled ? t('someone_using_whiteboard') : t('whiteboard')}
        >
          <PenTool className="w-5 h-5" />
          {isWhiteboardDisabled && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              🔒
            </div>
          )}
        </motion.button>

        {/* 🎯 Hand Raise - 点击切换举手状态 */}
        <motion.button
          onClick={onHandRaise}
          className={`p-3 rounded-xl transition-all relative ${isHandRaised
            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 animate-pulse'
            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200'
            }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={isHandRaised ? t('lower_hand') : t('raise_hand')}
        >
          <Hand className="w-5 h-5" />
          {isHandRaised && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
          )}
        </motion.button>
      </div>

    </motion.aside>
  );
}

// Participants List Component
function ParticipantsList({ participants, userRole, raisedHands, onParticipantClick, focusedParticipant, whiteboardOwner }: any) {
  const t = useTranslations('LiveClassroom');
  // 🎯 将举手的参与者排在前面
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const aRaised = raisedHands.has(a.identity);
      const bRaised = raisedHands.has(b.identity);
      if (aRaised && !bRaised) return -1;
      if (!aRaised && bRaised) return 1;
      return 0;
    });
  }, [participants, raisedHands]);

  const raisedCount = raisedHands.size;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          {t('participants_count', { count: participants.length })}
        </h3>
        {raisedCount > 0 && (
          <div className="mt-2 flex items-center gap-2 text-yellow-400 text-sm">
            <Hand className="w-4 h-4" />
            <span>{t('hands_raised', { count: raisedCount })}</span>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-400">
          {t('click_to_cycle')}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50 hover:scrollbar-thumb-slate-500">
        <div className="space-y-3">
          {sortedParticipants.map((participant: any, index: number) => (
            <ParticipantCard
              key={participant.sid || participant.identity || participant.id || `participant-${index}`}
              participant={participant}
              userRole={userRole}
              isHandRaised={raisedHands.has(participant.identity)}
              onParticipantClick={onParticipantClick}
              isFocused={focusedParticipant?.identity === participant.identity}
              hasWhiteboard={whiteboardOwner === participant.identity}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Participant Card Component - Updated to use merged participant data
function ParticipantCard({ participant, userRole, isHandRaised, onParticipantClick, isFocused, hasWhiteboard }: any) {
  const t = useTranslations('LiveClassroom');
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

  return (
    <motion.div
      className={`bg-slate-700/30 backdrop-blur-sm rounded-lg p-3 border cursor-pointer transition-all ${isFocused
        ? 'border-indigo-500/50 bg-indigo-500/10'
        : 'border-slate-600/30 hover:border-slate-500/50 hover:bg-slate-700/50'
        }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={() => onParticipantClick?.(participant)}
      title={t('click_to_cycle')}
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
            className={`w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center justify-center text-white font-medium ${avatarUrl ? 'hidden' : 'flex'
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
              <span className="text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">{t('you')}</span>
            )}
            {/* 🎯 举手状态指示 */}
            {isHandRaised && (
              <motion.span
                className="text-xs text-yellow-400 bg-yellow-400/20 px-1.5 py-0.5 rounded border border-yellow-400/30"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                🖐️
              </motion.span>
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
            <div className="p-1 rounded bg-blue-500/20 text-blue-400" title={t('has_screen_share')}>
              <Presentation className="w-3 h-3" />
            </div>
          )}
          {hasWhiteboard && (
            <div className="p-1 rounded bg-purple-500/20 text-purple-400" title={t('has_whiteboard')}>
              <PenTool className="w-3 h-3" />
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
function VideoArea({ layout, participants, focusedParticipant, setFocusedParticipant, focusedView, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen, whiteboardTool, whiteboardColor, whiteboardBrushSize, whiteboardFontSize, whiteboardTextAlign, whiteboardCanvasRef, registerCanvasRef, raisedHands, whiteboardOwner, localParticipant, originalParticipantName }: any) {
  const t = useTranslations('LiveClassroom');
  return (
    <motion.div
      className="video-area-container h-700px bg-slate-800/20 backdrop-blur-sm rounded-2xl border border-slate-700/30 overflow-hidden relative flex-shrink-0"
      style={{
        zIndex: 10,
        position: 'relative',
        flexShrink: 0,
        overflow: 'hidden',
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* 🎯 Whiteboard overlay - ONLY in Focus Layout */}
      {isWhiteboardOpen && layout === 'focus' && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          style={{
            pointerEvents: 'auto',
          }}
        >
          <div
            className="w-full h-full bg-white rounded-xl overflow-hidden border border-slate-300/60 relative"
            style={{
              height: '600px',
            }}
          >
            {/* Label */}
            <div className="absolute top-3 left-3 z-50">
              <span className="bg-purple-600 text-white text-xs font-medium px-2 py-1 rounded-md shadow-md">
                {t('whiteboard_full_screen')}
              </span>
            </div>
            <LiveblocksWhiteboard
              classroomSlug={classroomSlug}
              sessionId={sessionId}
              userId={localParticipant?.identity || 'unknown'}
              userName={originalParticipantName}
              userRole={userRole}
              currentTool={whiteboardTool}
              currentColor={whiteboardColor}
              currentBrushSize={whiteboardBrushSize}
              currentFontSize={whiteboardFontSize}
              currentTextAlign={whiteboardTextAlign}
              ref={(ref) => {
                whiteboardCanvasRef.current = ref;
                registerCanvasRef('video-area', ref);
              }}
            />
          </div>
        </div>
      )}
      <AnimatePresence mode="wait">
        {layout === 'grid' && (
          <GridVideoLayout
            key="grid"
            participants={participants}
            setFocusedParticipant={setFocusedParticipant}
            focusedView={focusedView}
            isWhiteboardOpen={isWhiteboardOpen}
            classroomSlug={classroomSlug}
            sessionId={sessionId}
            userRole={userRole}
            panelsOpen={panelsOpen}
            whiteboardTool={whiteboardTool}
            whiteboardColor={whiteboardColor}
            whiteboardBrushSize={whiteboardBrushSize}
            whiteboardFontSize={whiteboardFontSize}
            whiteboardTextAlign={whiteboardTextAlign}
            registerCanvasRef={registerCanvasRef}
            raisedHands={raisedHands}
            whiteboardOwner={whiteboardOwner}
            localParticipant={localParticipant}
            originalParticipantName={originalParticipantName}
          />
        )}
        {layout === 'presentation' && (
          <PresentationVideoLayout
            key="presentation"
            participants={participants}
            focusedParticipant={focusedParticipant}
            focusedView={focusedView}
            isWhiteboardOpen={isWhiteboardOpen}
            classroomSlug={classroomSlug}
            sessionId={sessionId}
            userRole={userRole}
            panelsOpen={panelsOpen}
            whiteboardTool={whiteboardTool}
            whiteboardColor={whiteboardColor}
            whiteboardBrushSize={whiteboardBrushSize}
            whiteboardFontSize={whiteboardFontSize}
            whiteboardTextAlign={whiteboardTextAlign}
            registerCanvasRef={registerCanvasRef}
            raisedHands={raisedHands}
            whiteboardOwner={whiteboardOwner}
            localParticipant={localParticipant}
            originalParticipantName={originalParticipantName}
          />
        )}
        {layout === 'focus' && (
          <FocusVideoLayout
            key="focus"
            participants={participants}
            focusedParticipant={focusedParticipant}
            setFocusedParticipant={setFocusedParticipant}
            focusedView={focusedView}
            isWhiteboardOpen={isWhiteboardOpen}
            classroomSlug={classroomSlug}
            sessionId={sessionId}
            userRole={userRole}
            panelsOpen={panelsOpen}
            whiteboardTool={whiteboardTool}
            whiteboardColor={whiteboardColor}
            whiteboardBrushSize={whiteboardBrushSize}
            whiteboardFontSize={whiteboardFontSize}
            whiteboardTextAlign={whiteboardTextAlign}
            registerCanvasRef={registerCanvasRef}
            raisedHands={raisedHands}
            whiteboardOwner={whiteboardOwner}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Grid Video Layout - intelligent grid algorithm (Google Meet style)
function GridVideoLayout({ participants, setFocusedParticipant, focusedView, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen, whiteboardTool, whiteboardColor, whiteboardBrushSize, whiteboardFontSize, whiteboardTextAlign, registerCanvasRef, raisedHands, whiteboardOwner, localParticipant, originalParticipantName }: any) {
  const t = useTranslations('LiveClassroom');
  // 🎯 Calculate total item count (participants + whiteboard if open)
  // Whiteboard is shown as a tile in grid/presentation layouts
  const totalItems = participants.length + (isWhiteboardOpen ? 1 : 0);
  const whiteboardContainerRef = useRef<HTMLDivElement>(null);
  const [whiteboardDimensions, setWhiteboardDimensions] = useState({ width: 1280, height: 720 });

  // 🎯 FIX: Move useMemo to top level to avoid conditional hook calls
  const memoizedClassroomSlug = useMemo(() => classroomSlug, [classroomSlug]);
  const memoizedSessionId = useMemo(() => sessionId, [sessionId]);

  const getGridClasses = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-2';

    // Intelligent grid algorithm: Google Meet style
    // rows = floor(sqrt(N))
    // cols = ceil(N / rows)
    const rows = Math.floor(Math.sqrt(count));
    const cols = Math.ceil(count / rows);

    // Return corresponding Tailwind CSS classes
    if (cols <= 2) return 'grid-cols-2';
    if (cols <= 3) return 'grid-cols-3';
    if (cols <= 4) return 'grid-cols-4';
    if (cols <= 5) return 'grid-cols-5';
    if (cols <= 6) return 'grid-cols-6';
    if (cols <= 7) return 'grid-cols-7';
    if (cols <= 8) return 'grid-cols-8';
    return 'grid-cols-8'; // Maximum 8 columns
  };

  const getGridRows = (count: number) => {
    if (count <= 1) return '';
    if (count <= 2) return '';

    const rows = Math.floor(Math.sqrt(count));

    // Return corresponding row classes (if row limit needed)
    if (rows <= 2) return 'grid-rows-2';
    if (rows <= 3) return 'grid-rows-3';
    if (rows <= 4) return 'grid-rows-4';
    if (rows <= 5) return 'grid-rows-5';
    if (rows <= 6) return 'grid-rows-6';
    if (rows <= 7) return 'grid-rows-7';
    return 'grid-rows-8'; // Maximum 8 rows
  };

  // Update whiteboard dimensions based on container size
  useEffect(() => {
    if (!whiteboardContainerRef.current) return;

    const updateDimensions = () => {
      if (whiteboardContainerRef.current) {
        const rect = whiteboardContainerRef.current.getBoundingClientRect();
        // Use 16:9 aspect ratio, fit within container
        const containerAspect = rect.width / rect.height;
        const targetAspect = 16 / 9;

        let width, height;
        if (containerAspect > targetAspect) {
          // Container is wider, constrain by height
          height = Math.floor(rect.height);
          width = Math.floor(height * targetAspect);
        } else {
          // Container is taller, constrain by width
          width = Math.floor(rect.width);
          height = Math.floor(width / targetAspect);
        }

        setWhiteboardDimensions({ width, height });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(whiteboardContainerRef.current);

    return () => resizeObserver.disconnect();
  }, [isWhiteboardOpen]);

  return (
    <motion.div
      className="h-full pl-8 pr-8 pb-4 pt-4 z-10 flex-shrink-0 overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`grid gap-2 md:gap-4 h-full w-full ${getGridClasses(totalItems)} ${getGridRows(totalItems)} auto-rows-fr`}>
        {/* Whiteboard item (if opened) */}
        {isWhiteboardOpen && (
          <div ref={whiteboardContainerRef} className="w-full h-full flex-shrink-0">
            <motion.div
              className="w-full h-full relative rounded-xl overflow-hidden bg-white border border-slate-300/60"
              whileHover={{ scale: 1.005 }}
              transition={{ duration: 0.2 }}
            >
              <LiveblocksWhiteboard
                classroomSlug={memoizedClassroomSlug}
                sessionId={memoizedSessionId}
                userId={localParticipant?.identity || 'unknown'}
                userName={originalParticipantName}
                userRole={userRole}
                currentTool={whiteboardTool}
                currentColor={whiteboardColor}
                currentBrushSize={whiteboardBrushSize}
                currentFontSize={whiteboardFontSize}
                currentTextAlign={whiteboardTextAlign}
                width={whiteboardDimensions.width}
                height={whiteboardDimensions.height}
                ref={(ref) => registerCanvasRef('grid', ref)}
              />
              <div className="absolute top-2 left-2 bg-purple-500/80 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                <PenTool className="w-3 h-3" />
                <span>{t('shared_whiteboard')}</span>
              </div>
              <div className="absolute top-2 right-2 bg-green-500/80 text-white px-2 py-1 rounded-full text-xs font-medium animate-pulse">
                Live
              </div>
            </motion.div>
          </div>
        )}

        {/* Participant items */}
        {participants.map((participant: any, index: number) => (
          <div
            key={participant.sid || participant.identity || `participant-${index}`}
            className="relative w-full aspect-video min-h-0"
          >
            <VideoTile
              participant={participant}
              size="grid"
              onFocus={() => setFocusedParticipant(participant)}
              focusedView="camera"
              isWhiteboardOpen={false}
              classroomSlug={classroomSlug}
              sessionId={sessionId}
              userRole={userRole}
              showFocusButton={true}
              panelsOpen={panelsOpen}
              raisedHands={raisedHands}
              whiteboardOwner={whiteboardOwner}
              registerCanvasRef={registerCanvasRef}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Presentation Video Layout - large container on left, right side shrunk to one-third
function PresentationVideoLayout({ participants, focusedParticipant, focusedView, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen, whiteboardTool, whiteboardColor, whiteboardBrushSize, whiteboardFontSize, whiteboardTextAlign, registerCanvasRef, raisedHands, whiteboardOwner, localParticipant, originalParticipantName }: any) {
  const t = useTranslations('LiveClassroom');
  // Use focusedParticipant if available, otherwise default to tutor or first participant
  const presenter = focusedParticipant || participants.find((p: any) => p.role === 'tutor' || p.role === 'owner') || participants[0];
  const others = participants.filter((p: any) => p.identity !== presenter?.identity);
  const whiteboardContainerRef = useRef<HTMLDivElement>(null);
  const [whiteboardDimensions, setWhiteboardDimensions] = useState({ width: 1280, height: 720 });

  // 🎯 FIX: Move useMemo to top level to avoid conditional hook calls
  const memoizedClassroomSlug = useMemo(() => classroomSlug, [classroomSlug]);
  const memoizedSessionId = useMemo(() => sessionId, [sessionId]);

  // Update whiteboard dimensions based on container size
  useEffect(() => {
    if (!whiteboardContainerRef.current) return;

    const updateDimensions = () => {
      if (whiteboardContainerRef.current) {
        const rect = whiteboardContainerRef.current.getBoundingClientRect();
        const containerAspect = rect.width / rect.height;
        const targetAspect = 16 / 9;

        let width, height;
        if (containerAspect > targetAspect) {
          height = Math.floor(rect.height);
          width = Math.floor(height * targetAspect);
        } else {
          width = Math.floor(rect.width);
          height = Math.floor(width / targetAspect);
        }

        setWhiteboardDimensions({ width, height });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(whiteboardContainerRef.current);

    return () => resizeObserver.disconnect();
  }, [isWhiteboardOpen]);

  return (
    <motion.div
      className="h-full flex p-4 flex-shrink-0 overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Large left container - Show focused presenter */}
      <div className={`pr-2 transition-all duration-300 ${panelsOpen ? 'w-4/5' : 'w-3/4'}`}>
        <VideoTile
          participant={presenter}
          size="large"
          focusedView={focusedView}
          isWhiteboardOpen={false}
          classroomSlug={classroomSlug}
          sessionId={sessionId}
          userRole={userRole}
          panelsOpen={panelsOpen}
          raisedHands={raisedHands}
          whiteboardOwner={whiteboardOwner}
          registerCanvasRef={registerCanvasRef}
        />
      </div>

      {/* Right container - participants list + whiteboard (if open) */}
      <div className={`pl-2 transition-all duration-300 flex-shrink-0 ${panelsOpen ? 'w-1/5' : 'w-1/4'}`}>
        <div className="flex flex-col space-y-2 h-full overflow-y-auto">
          {/* 🎯 Whiteboard tile (if opened) - shown as a regular tile */}
          {isWhiteboardOpen && (
            <div ref={whiteboardContainerRef} className="w-full aspect-video flex-shrink-0">
              <motion.div
                className="w-full h-full relative rounded-xl overflow-hidden bg-white border border-purple-400/60"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <LiveblocksWhiteboard
                  classroomSlug={memoizedClassroomSlug}
                  sessionId={memoizedSessionId}
                  userId={localParticipant?.identity || 'unknown'}
                  userName={originalParticipantName}
                  userRole={userRole}
                  currentTool={whiteboardTool}
                  currentColor={whiteboardColor}
                  currentBrushSize={whiteboardBrushSize}
                  currentFontSize={whiteboardFontSize}
                  currentTextAlign={whiteboardTextAlign}
                  width={whiteboardDimensions.width}
                  height={whiteboardDimensions.height}
                  className="h-full w-full"
                  ref={(ref) => registerCanvasRef('presentation', ref)}
                />
                <div className="absolute top-2 left-2 bg-purple-500/80 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                  <PenTool className="w-3 h-3" />
                  <span>Shared Whiteboard</span>
                </div>
                <div className="absolute top-2 right-2 bg-green-500/80 text-white px-2 py-1 rounded-full text-xs font-medium animate-pulse">
                  Live
                </div>
              </motion.div>
            </div>
          )}

          {/* Other participants */}
          {others.map((participant: any, index: number) => (
            <div key={participant.sid || participant.identity || `other-${index}`}>
              <VideoTile
                participant={participant}
                size="grid"
                focusedView="camera"
                isWhiteboardOpen={false}
                classroomSlug={classroomSlug}
                sessionId={sessionId}
                userRole={userRole}
                panelsOpen={panelsOpen}
                raisedHands={raisedHands}
                whiteboardOwner={whiteboardOwner}
                registerCanvasRef={registerCanvasRef}
              />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Focus Video Layout - show only one container
function FocusVideoLayout({ participants, focusedParticipant, setFocusedParticipant, focusedView, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen, whiteboardTool, whiteboardColor, whiteboardBrushSize, whiteboardFontSize, whiteboardTextAlign, registerCanvasRef, raisedHands, whiteboardOwner }: any) {
  const t = useTranslations('LiveClassroom');
  const focused = focusedParticipant || participants[0];
  const whiteboardContainerRef = useRef<HTMLDivElement>(null);
  const [whiteboardDimensions, setWhiteboardDimensions] = useState({ width: 1280, height: 720 });

  // 🎯 FIX: Move useMemo to top level to avoid conditional hook calls
  const memoizedClassroomSlug = useMemo(() => classroomSlug, [classroomSlug]);
  const memoizedSessionId = useMemo(() => sessionId, [sessionId]);

  // Update whiteboard dimensions based on container size
  useEffect(() => {
    if (!whiteboardContainerRef.current) return;

    const updateDimensions = () => {
      if (whiteboardContainerRef.current) {
        const rect = whiteboardContainerRef.current.getBoundingClientRect();
        const containerAspect = rect.width / rect.height;
        const targetAspect = 16 / 9;

        let width, height;
        if (containerAspect > targetAspect) {
          height = Math.floor(rect.height);
          width = Math.floor(height * targetAspect);
        } else {
          width = Math.floor(rect.width);
          height = Math.floor(width / targetAspect);
        }

        setWhiteboardDimensions({ width, height });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(whiteboardContainerRef.current);

    return () => resizeObserver.disconnect();
  }, [isWhiteboardOpen]);

  return (
    <motion.div
      className="h-full p-4 flex-shrink-0 overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-full h-full relative">
        {/* 🎯 In Focus Layout, show focused participant with selected view */}
        <VideoTile
          participant={focused}
          size="large"
          focusedView={focusedView}
          isWhiteboardOpen={false}
          classroomSlug={classroomSlug}
          sessionId={sessionId}
          userRole={userRole}
          panelsOpen={panelsOpen}
          raisedHands={raisedHands}
          whiteboardOwner={whiteboardOwner}
          registerCanvasRef={registerCanvasRef}
        />

        {!isWhiteboardOpen && (
          <motion.button
            onClick={() => setFocusedParticipant(null)}
            className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg hover:bg-slate-700/80 transition-colors z-20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t('exit_focus')}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function VideoTile({ participant, size = 'normal', onFocus, showFocusButton = false, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen, raisedHands, focusedView = 'camera', whiteboardOwner, registerCanvasRef }: any) {
  const t = useTranslations('LiveClassroom');
  // Define consistent height classes for different sizes
  const sizeClasses: Record<string, string> = {
    thumbnail: 'w-full max-w-32 h-20 flex-shrink-0',
    small: 'w-full max-w-48 h-32 md:max-w-56 md:h-36 flex-shrink-0',
    normal: panelsOpen
      ? 'w-full aspect-video flex-shrink-0' // Consistent height regardless of panelsOpen state
      : 'w-full aspect-video flex-shrink-0', // Same height for consistency
    large: 'w-full aspect-video flex-shrink-0',
    grid: 'w-full aspect-video flex-shrink-0' // Consistent height for grid layout instead of aspect-video
  };

  // Use the original LiveKit participant object for track operations
  // Support both new (livekitParticipant) and old (participantObj) formats for compatibility
  const livekitParticipant = participant.livekitParticipant || participant.participantObj || participant;

  // Safety check
  if (!livekitParticipant) {
    console.error('❌ VideoTile: No valid participant found:', participant);
    return (
      <div className={`${sizeClasses[size]} relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center`}>
        <span className="text-slate-400 text-sm">{t('no_participant')}</span>
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
  const isHandRaised = raisedHands?.has(livekitParticipant.identity) || false;
  const hasWhiteboard = whiteboardOwner === livekitParticipant.identity;

  // 🎯 Determine what to show based on focusedView
  const showScreenShare = focusedView === 'screenshare' && screenShareTrackRef;
  const showWhiteboard = focusedView === 'whiteboard' && hasWhiteboard;
  const showCamera = focusedView === 'camera' || (!showScreenShare && !showWhiteboard);

  return (
    <motion.div
      className={`${sizeClasses[size]} relative rounded-xl overflow-hidden`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* 🎯 Show Screen Share */}
      {showScreenShare && screenShareTrackRef && (
        <div className="absolute inset-0 bg-black">
          <VideoTrack
            trackRef={screenShareTrackRef}
            className="w-full h-full object-contain"
          />
          <div className="absolute top-2 left-2 bg-blue-500/80 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <Presentation className="w-3 h-3" />
            <span>{t('screen_share')} - {participantName}</span>
          </div>
        </div>
      )}

      {/* 🎯 Show Whiteboard */}
      {showWhiteboard && (
        <div className="absolute inset-0 bg-white">
          <LiveblocksWhiteboard
            classroomSlug={classroomSlug}
            sessionId={sessionId}
            userId={participant?.identity || 'unknown'}
            userName={participantName}
            userRole={userRole}
            currentTool="pen"
            currentColor="#000000"
            currentBrushSize={4}
            currentFontSize={16}
            currentTextAlign="left"
            ref={(ref) => registerCanvasRef('fullscreen', ref)}
          />
          <div className="absolute top-2 left-2 bg-purple-500/80 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <PenTool className="w-3 h-3" />
            <span>{t('whiteboard')} - {participantName}</span>
          </div>
        </div>
      )}

      {/* 🎯 Show Camera */}
      {showCamera && (
        <>
          {(() => {
            const hasCameraTrack = !!cameraTrackRef;
            const hasTrack = !!cameraTrackRef?.publication?.track;
            const isMuted = !!cameraTrackRef?.publication?.isMuted;
            const showCameraVideo = hasCameraTrack && hasTrack && !isMuted;

            return showCameraVideo;
          })() ? (
            <div className="relative w-full h-full">
              <VideoTrack
                trackRef={cameraTrackRef}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-gradient-to-br from-slate-700 to-slate-800">
              <VideoOff className="w-12 h-12 mb-2 text-slate-400" />
              <span className="text-sm font-medium">{t('no_camera')}</span>
              <span className="text-xs mt-1 opacity-75">{t('camera_off_for', { name: participantName })}</span>
            </div>
          )}
        </>
      )}

      {/* Overlay */}
      <div className="absolute top-3 left-3 flex items-center space-x-2 z-20">
        {isLocal && (
          <div className="bg-yellow-400/20 text-yellow-300 px-2 py-1 rounded-full text-xs font-medium border border-yellow-400/30">
            You
          </div>
        )}
        {/* View indicator */}
        {focusedView === 'screenshare' && (
          <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs font-medium border border-blue-500/30">
            {t('screen')}
          </div>
        )}
        {focusedView === 'whiteboard' && (
          <div className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs font-medium border border-purple-500/30">
            {t('whiteboard')}
          </div>
        )}
        {/* 🎯 Hand Raise indicator */}
        {isHandRaised && (
          <motion.div
            className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full text-xs font-medium border border-yellow-400/30 flex items-center space-x-1"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Hand className="w-3 h-3" />
            <span>{t('hand_raised_badge')}</span>
          </motion.div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 z-20">
        <div className="text-white font-medium text-sm truncate">{participantName}</div>
        <div className="text-slate-300 text-xs capitalize flex items-center gap-2">
          <span>{role}</span>
          {/* 🎯 Available views indicator */}
          {(screenShareTrackRef || hasWhiteboard) && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span>•</span>
              {screenShareTrackRef && (
                <div title="Has screen share">
                  <Presentation className="w-3 h-3" />
                </div>
              )}
              {hasWhiteboard && (
                <div title="Has whiteboard">
                  <PenTool className="w-3 h-3" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Audio - always play regardless of view */}
      {micTrackRef && <AudioTrack trackRef={micTrackRef} />}
    </motion.div>
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

// ============================================
// Refactored VideoArea Component
// ============================================

/**
 * ✅ Refactored VideoArea component
 * 
 * Key improvements:
 * 1. WhiteboardCanvas only renders once, never gets unmounted
 * 2. Use CSS Grid to control different layouts
 * 3. Layout switching by changing CSS classes rather than component mount/unmount
 */

interface VideoAreaRefactoredProps {
  participants: any[];
  layout: string;
  isWhiteboardOpen: boolean;
  classroomSlug: string;
  sessionId: string;
  userRole: 'student' | 'tutor' | 'owner';
  participantName: string;
  whiteboardTool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  whiteboardColor: string;
  whiteboardBrushSize: number;
  whiteboardFontSize: number;
  whiteboardTextAlign: 'left' | 'center' | 'right';
  whiteboardCanvasRef: React.RefObject<any>;
  registerCanvasRef: (key: string, ref: any) => void;
  setFocusedParticipant: (participant: any) => void;
  localParticipant: any;
  originalParticipantName: string;
}

export function VideoAreaRefactored({
  participants,
  layout,
  isWhiteboardOpen,
  classroomSlug,
  sessionId,
  userRole,
  participantName,
  whiteboardTool,
  whiteboardColor,
  whiteboardBrushSize,
  whiteboardFontSize,
  whiteboardTextAlign,
  whiteboardCanvasRef,
  registerCanvasRef,
  setFocusedParticipant,
  localParticipant,
  originalParticipantName,
}: VideoAreaRefactoredProps) {
  // 🎯 Calculate CSS Grid layout classes
  const gridClasses = getLayoutGridClasses(layout, participants.length, isWhiteboardOpen);

  return (
    <motion.div
      className="h-full bg-slate-800/20 backdrop-blur-sm rounded-2xl border border-slate-700/30 overflow-hidden relative"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* 🎯 Unified Grid container - contains all videos and Whiteboard */}
      <div className={`h-full w-full p-4 ${gridClasses}`}>

        {/* 
          🎯 Key improvement: WhiteboardCanvas only renders once!
          Use CSS Grid Area to control its position in different layouts
        */}
        {isWhiteboardOpen && (
          <div
            className="whiteboard-grid-item rounded-xl overflow-hidden bg-white border border-slate-300/60"
            style={getWhiteboardGridStyle(layout)}
          >
            <LiveblocksWhiteboard
              classroomSlug={classroomSlug}
              sessionId={sessionId}
              userId={localParticipant?.identity || 'unknown'}
              userName={originalParticipantName}
              userRole={userRole}
              currentTool={whiteboardTool}
              currentColor={whiteboardColor}
              currentBrushSize={whiteboardBrushSize}
              currentFontSize={whiteboardFontSize}
              currentTextAlign={whiteboardTextAlign}
              className="h-full w-full"
              ref={(ref) => {
                whiteboardCanvasRef.current = ref;
                registerCanvasRef('grid-whiteboard', ref);
              }}
            />
            <div className="absolute top-2 left-2 bg-purple-500/80 text-white px-2 py-1 rounded text-xs font-medium">
              Whiteboard
            </div>
          </div>
        )}

        {/* 
          🎯 All participant video tiles
          Also positioned via CSS Grid Area
        */}
        {participants.map((participant, index) => (
          <div
            key={participant.sid || participant.identity}
            className="video-tile-grid-item relative"
            style={getVideoTileGridStyle(layout, index, participants.length)}
          >
            <VideoTileSimple
              participant={participant}
              layout={layout}
              onFocus={() => setFocusedParticipant(participant)}
            />
          </div>
        ))}

      </div>

    </motion.div>
  );
}

/**
 * 🎯 Return CSS Grid classes based on layout mode
 */
function getLayoutGridClasses(
  layout: string,
  participantCount: number,
  hasWhiteboard: boolean
): string {
  const totalItems = participantCount + (hasWhiteboard ? 1 : 0);

  switch (layout) {
    case 'grid': {
      // Grid layout: intelligently calculate rows and columns
      if (totalItems <= 1) return 'grid grid-cols-1 gap-4';
      if (totalItems <= 2) return 'grid grid-cols-2 gap-4';
      if (totalItems <= 4) return 'grid grid-cols-2 gap-4';
      if (totalItems <= 6) return 'grid grid-cols-3 gap-4';
      if (totalItems <= 9) return 'grid grid-cols-3 gap-4';
      return 'grid grid-cols-4 gap-4';
    }

    case 'presentation': {
      // Presentation layout: main area + sidebar
      return 'grid grid-cols-[4fr_1fr] gap-4';
    }

    case 'focus': {
      // Focus layout: single large view
      return 'grid grid-cols-1';
    }

    default:
      return 'grid grid-cols-2 gap-4';
  }
}

/**
 * 🎯 Return Whiteboard Grid style (position/size)
 */
function getWhiteboardGridStyle(layout: string): React.CSSProperties {
  switch (layout) {
    case 'grid':
      // In grid: occupy first position
      return {
        gridColumn: '1',
        gridRow: '1',
      };

    case 'presentation':
      // Presentation mode: occupy main area (large left area)
      return {
        gridColumn: '1',
        gridRow: 'span 10', // Fill left side
      };

    case 'focus':
      // Focus mode: fill entire area
      return {
        gridColumn: '1',
        gridRow: '1',
      };

    default:
      return {};
  }
}

/**
 * 🎯 Return video tile Grid style
 */
function getVideoTileGridStyle(
  layout: string,
  index: number,
  total: number
): React.CSSProperties {
  switch (layout) {
    case 'grid':
      // Grid mode: automatic flow layout
      return {};

    case 'presentation':
      // Presentation mode: all videos stacked on right side
      return {
        gridColumn: '2',
        gridRow: `${index + 1}`,
      };

    case 'focus':
      // Focus mode: hide other videos (or show in small window)
      return {
        display: index === 0 ? 'block' : 'none',
      };

    default:
      return {};
  }
}

/**
 * Simplified VideoTile component (for refactored layout) with camera overlay
 */
function VideoTileSimple({ participant, layout, onFocus }: any) {
  // Use the original LiveKit participant object for track operations
  const livekitParticipant = participant.livekitParticipant || participant.participantObj || participant;

  // Safety check
  if (!livekitParticipant) {
    return (
      <div className="w-full h-full relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
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

  // Check camera status
  const hasCameraTrack = !!cameraTrackRef;
  const hasTrack = !!cameraTrackRef?.publication?.track;
  const isMuted = !!cameraTrackRef?.publication?.isMuted;
  const showCamera = hasCameraTrack && hasTrack && !isMuted;

  return (
    <motion.div
      className="w-full h-full relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800"
      whileHover={{ scale: layout === 'grid' ? 1.02 : 1 }}
      onClick={onFocus}
    >
      {/* Screen Share */}
      {screenShareTrackRef && (
        <div className="absolute inset-0 bg-black">
          <VideoTrack
            trackRef={screenShareTrackRef}
            className="w-full h-full object-contain"
          />
          <div className="absolute top-2 left-2 bg-blue-500/80 text-white px-2 py-1 rounded text-xs font-medium">
            Screen Share - {participantName}
          </div>
        </div>
      )}

      {/* Camera Video */}
      {!screenShareTrackRef && showCamera ? (
        <div className="absolute inset-0">
          <VideoTrack
            trackRef={cameraTrackRef}
            className="w-full h-full object-cover"
          />
        </div>
      ) : !screenShareTrackRef && (
        /* Camera Off Overlay */
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
          <VideoOff className="w-12 h-12 mb-2 text-slate-400" />
          <span className="text-sm font-medium">{participantName}</span>
          <span className="text-xs opacity-75">Camera Off</span>
        </div>
      )}

      {/* Participant Name Overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <div className="bg-slate-900/80 backdrop-blur-sm px-2 py-1 rounded flex items-center space-x-2">
          <span className="text-white text-sm font-medium truncate">{participantName}</span>
          {isLocal && (
            <span className="text-yellow-400 text-xs">(You)</span>
          )}
        </div>

        {/* Mic Status */}
        <div className="bg-slate-900/80 backdrop-blur-sm p-1.5 rounded">
          {micTrackRef && !micTrackRef.publication?.isMuted ? (
            <Mic className="w-3 h-3 text-green-400" />
          ) : (
            <MicOff className="w-3 h-3 text-red-400" />
          )}
        </div>
      </div>

      {/* Audio */}
      {micTrackRef && <AudioTrack trackRef={micTrackRef} />}
    </motion.div>
  );
}