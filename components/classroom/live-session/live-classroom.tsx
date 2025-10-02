'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext, ReactNode } from 'react';

// CSS Debugging - 确保关键样式被应用
if (typeof window !== 'undefined') {
  // 添加全局样式确保层级和尺寸
  const debugStyle = document.createElement('style');
  debugStyle.textContent = `
    /* 强制ParticipantsList层级 */
    .participants-list-container {
      z-index: 200 !important;
      position: absolute !important;
    }
    
    /* 强制Panel智能宽度 */
    .panel-container {
      min-width: 200px !important;
      max-width: 600px !important;
      flex-shrink: 0 !important;
    }
    
    /* 强制VideoArea层级 */
    .video-area-container {
      z-index: 10 !important;
      position: relative !important;
      flex-shrink: 0 !important;
    }
  `;
  if (!document.head.querySelector('#layout-debug-styles')) {
    debugStyle.id = 'layout-debug-styles';
    document.head.appendChild(debugStyle);
  }
}
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
import { WhiteboardCanvas } from './whiteboard-canvas';
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

// ============================================
// Classroom Context
// ============================================

/**
 * Classroom Context - 解决 prop drilling 问题
 * 管理整个课堂的状态，避免通过多层组件传递 props
 */
interface ClassroomState {
  // 基础信息
  classroomSlug: string;
  sessionId: string;
  participantName: string;
  userRole: 'student' | 'tutor';
  classroomColor: string;
  
  // 布局状态
  layout: string;
  setLayout: (layout: string) => void;
  
  // 面板状态
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isParticipantsOpen: boolean;
  setIsParticipantsOpen: (open: boolean) => void;
  isWhiteboardOpen: boolean;
  setIsWhiteboardOpen: (open: boolean) => void;
  
  // 会话状态
  sessionDuration: number;
  isRecording: boolean;
  
  // 面板尺寸
  panelWidth: number;
  setPanelWidth: (width: number) => void;
  isResizing: boolean;
  setIsResizing: (resizing: boolean) => void;
  
  // 白板状态
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
  
  // 白板操作
  whiteboardCanvasRef: React.RefObject<any>;
  handleClearWhiteboard: () => void;
  handleSaveWhiteboard: () => Promise<void>;
  handleDownloadWhiteboard: () => void;
  
  // 聚焦参与者
  focusedParticipant: any;
  setFocusedParticipant: (participant: any) => void;
  
  // 操作函数
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
  userRole: 'student' | 'tutor';
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
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(2347);
  
  // 白板工具栏状态
  const [whiteboardTool, setWhiteboardTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle' | 'text'>('pen');
  const [whiteboardColor, setWhiteboardColor] = useState('#000000');
  const [whiteboardBrushSize, setWhiteboardBrushSize] = useState(4);
  const [whiteboardFontSize, setWhiteboardFontSize] = useState(16); // 🎯 独立的字体大小状态（像素值）
  const [whiteboardTextAlign, setWhiteboardTextAlign] = useState<'left' | 'center' | 'right'>('left'); // 🎯 文本对齐状态
  
  // 白板画布引用 - 存储所有canvas引用
  const whiteboardCanvasRefs = useRef<{ [key: string]: any }>({});

  // 白板清除功能
  const handleClearWhiteboard = () => {
    Object.values(whiteboardCanvasRefs.current).forEach((canvasRef: any) => {
      if (canvasRef?.clearCanvas) {
        canvasRef.clearCanvas();
      }
    });
  };

  // 白板保存功能
  const handleSaveWhiteboard = async () => {
    // 获取第一个可用的canvas引用
    const firstCanvasRef = Object.values(whiteboardCanvasRefs.current).find((ref: any) => ref?.saveCanvas);
    if (firstCanvasRef?.saveCanvas) {
      await firstCanvasRef.saveCanvas();
    }
  };

  // 白板下载功能
  const handleDownloadWhiteboard = () => {
    // 获取第一个可用的canvas引用
    const firstCanvasRef = Object.values(whiteboardCanvasRefs.current).find((ref: any) => ref?.downloadCanvas);
    if (firstCanvasRef?.downloadCanvas) {
      firstCanvasRef.downloadCanvas();
    }
  }; 
  const [reactions, setReactions] = useState<Array<{ id: number; type: string; at: number }>>([]);
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: number; type: string; x: number; y: number }>>([]);
  const [reactionEmojis, setReactionEmojis] = useState<Array<{ id: string; emoji: string; timestamp: number }>>([]);
  const [focusedParticipant, setFocusedParticipant] = useState<any>(null);
  const [panelWidth, setPanelWidth] = useState(35); // panel宽度百分比，默认35%
  const [isResizing, setIsResizing] = useState(false);
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
      console.log('🚀 [LiveClassroom] Triggering token generation...');
      generateToken();
    } else if (!classroomSlug || !sessionId || !participantName) {
      console.warn('⚠️ [LiveClassroom] Missing required parameters for token generation:', {
        classroomSlug: !!classroomSlug,
        sessionId: !!sessionId, 
        participantName: !!participantName
      });
    }
  }, [tokenData, isLoading, error, generateToken, classroomSlug, sessionId, participantName]);

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

  // Panel拖拽调节大小处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const containerWidth = window.innerWidth;
    const newPanelWidth = ((containerWidth - e.clientX) / containerWidth) * 100;
    
    // 限制panel宽度在20%到60%之间
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
      toast.success('开始录制');
    } else {
      toast.success('停止录制');
    }
  }, [isRecording]);

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
    const errorMessage = error instanceof Error ? error.message : 
                        typeof error === 'string' ? error : 
                        '无法获取课堂访问权限';
    
    return (
      <Card className="w-full h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center space-y-4 max-w-md text-center">
            <div className="text-red-500 text-6xl mb-2">⚠️</div>
            <h3 className="text-lg font-medium text-slate-800">连接问题</h3>
            <p className="text-red-500 text-sm">
              {errorMessage}
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-slate-100 p-3 rounded text-xs text-slate-600 w-full">
                <div className="font-medium mb-1">🔧 调试信息</div>
                <div>教室: {classroomSlug}</div>
                <div>会话: {sessionId}</div>
                <div>参与者: {participantName}</div>
                <div>角色: {userRole}</div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleConnect} variant="outline" size="sm">
                重新连接
              </Button>
              <Button onClick={() => window.location.reload()} variant="default" size="sm">
                刷新页面
              </Button>
            </div>
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
          isWhiteboardOpen={isWhiteboardOpen}
          setIsWhiteboardOpen={setIsWhiteboardOpen}
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
          whiteboardCanvasRefs={whiteboardCanvasRefs}
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
  isWhiteboardOpen: boolean;
  setIsWhiteboardOpen: (open: boolean) => void;
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
  panelWidth: number;
  handleMouseDown: (e: React.MouseEvent) => void;
  isResizing: boolean;
  // 白板工具栏状态
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
  // 白板操作函数
  handleClearWhiteboard: () => void;
  handleSaveWhiteboard: () => Promise<void>;
  handleDownloadWhiteboard: () => void;
  whiteboardCanvasRefs: React.MutableRefObject<{ [key: string]: any }>;
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
  isWhiteboardOpen,
  setIsWhiteboardOpen,
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
  whiteboardCanvasRefs
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
    <div className="h-full flex flex-col">
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
        {/* Sidebar - 固定宽度，不被panel影响 */}
        <div className="flex-shrink-0">
          <Sidebar 
            participants={participants}
            isParticipantsOpen={isParticipantsOpen}
            setIsParticipantsOpen={setIsParticipantsOpen}
            isChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
            isWhiteboardOpen={isWhiteboardOpen}
            setIsWhiteboardOpen={setIsWhiteboardOpen}
            userRole={userRole}
          />
        </div>

        {/* 中间内容区域 - 包含video area和panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video Area - 固定高度，动态宽度 */}
          <div 
            className="relative p-4 z-[10] transition-all duration-300 flex-shrink-0"
            style={{
              width: (isChatOpen || isWhiteboardOpen) 
                ? `calc(100% - ${panelWidth}% - 4px)` // 减去分隔条宽度
                : '100%',
              height: '100%' // 固定高度
            }}
          >
            <VideoArea 
              layout={layout}
              participants={participants}
              focusedParticipant={focusedParticipant}
              setFocusedParticipant={setFocusedParticipant}
              isWhiteboardOpen={isWhiteboardOpen}
              classroomSlug={classroomSlug}
              sessionId={sessionId}
              userRole={userRole}
              panelsOpen={isChatOpen || isWhiteboardOpen}
              whiteboardTool={whiteboardTool}
              whiteboardColor={whiteboardColor}
              whiteboardBrushSize={whiteboardBrushSize}
            />
          </div>

          {/* 拖拽分隔条 */}
          {(isChatOpen || isWhiteboardOpen) && (
            <div
              className={`w-1 bg-slate-600/20 hover:bg-slate-500/40 cursor-col-resize z-[15] flex-shrink-0 ${
                isResizing ? 'bg-slate-400/60' : ''
              } transition-colors`}
              onMouseDown={handleMouseDown}
            />
          )}

          {/* Right Panel Container - 固定高度，自适应宽度 */}
          {(isChatOpen || isWhiteboardOpen) && (
            <div 
              className="panel-container relative transition-all duration-300 flex-shrink-0 overflow-hidden"
              style={{ 
                width: `${panelWidth}%`,
                height: '100%',
                minWidth: '200px', 
                maxWidth: '600px',
                zIndex: 10,
                flexShrink: 0,
                overflow: 'hidden'
              }}
            >
              <div className="w-full h-full flex flex-col">
                {/* Chat Panel - LiveKit DataChannel 实时通信 */}
                <div className={`flex-1 ${isChatOpen ? 'block' : 'hidden'} overflow-hidden`}>
                  <SessionChatPanel 
                    isOpen={isChatOpen}
                    classroomSlug={classroomSlug}
                    sessionId={sessionId}
                    userInfo={{
                      id: localParticipant?.identity || `${classroomSlug}-${sessionId}`,
                      name: originalParticipantName,
                      avatar: '', // 可以后续添加头像支持
                      role: userRole
                    }}
                    participants={participants.map((p: any) => ({
                      identity: p.identity,
                      displayName: p.displayName,
                      avatarUrl: p.avatarUrl,
                      role: p.role
                    }))}
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
        addReaction={sendReaction}
        reactionEmojis={reactionEmojiMap}
        classroomSlug={classroomSlug}
        sessionId={sessionId?.toString()}
      />
      
      {userRole === 'tutor' && (
        <EnhancedParticipantsList participants={participants} />
      )}

      {/* Participants List Overlay - Independent positioned element */}
      <AnimatePresence>
        {isParticipantsOpen && (
          <motion.div
            className="participants-list-container absolute left-16 top-0 w-80 h-full bg-slate-800/95 backdrop-blur-sm border-r border-slate-700/50 pointer-events-auto"
            style={{ 
              zIndex: 200
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ParticipantsList participants={participants} userRole={userRole} />
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}

// Enhanced Participants List Component - Updated for LiveKit participants
function EnhancedParticipantsList({ participants }: any) {
  return (
    <motion.div 
      className="participants-list-container absolute top-20 right-6 w-80 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 p-4"
      style={{
        zIndex: 200,
        position: 'absolute'
      }}
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
        {/* Status & Info */}
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

        {/* Layout Controls */}
        <LayoutControls layout={layout} setLayout={setLayout} />
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
function Sidebar({ participants, isParticipantsOpen, setIsParticipantsOpen, isChatOpen, setIsChatOpen, isWhiteboardOpen, setIsWhiteboardOpen, userRole }: any) {
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

        {/* Whiteboard Toggle */}
        <motion.button
          onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
          className={`p-3 rounded-xl transition-all ${
            isWhiteboardOpen 
              ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' 
              : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="白板"
        >
          <PenTool className="w-5 h-5" />
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
function VideoArea({ layout, participants, focusedParticipant, setFocusedParticipant, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen, whiteboardTool, whiteboardColor, whiteboardBrushSize }: any) {
  return (
    <motion.div 
      className="video-area-container h-full bg-slate-800/20 backdrop-blur-sm rounded-2xl border border-slate-700/30 overflow-hidden relative flex-shrink-0"
      style={{
        zIndex: 10,
        position: 'relative',
        flexShrink: 0,
        overflow: 'hidden'
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* 🎯 关键修复：WhiteboardCanvas 在外部，永远不会被卸载 */}
      {isWhiteboardOpen && (
        <div 
          className="absolute inset-0 z-30 p-4"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
        >
          <div className="w-full h-full bg-white rounded-xl overflow-hidden border border-slate-300/60 relative">
            <WhiteboardCanvas 
              classroomSlug={classroomSlug}
              sessionId={sessionId}
              userRole={userRole}
              participantName={"Whiteboard"}
              currentTool={whiteboardTool}
              currentColor={whiteboardColor}
              currentBrushSize={whiteboardBrushSize}
            />
            <div className="absolute top-2 left-2 bg-purple-500/80 text-white px-2 py-1 rounded text-xs font-medium z-10">
              白板
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {layout === 'grid' && (
          <GridVideoLayout 
            key="grid" 
            participants={participants} 
            setFocusedParticipant={setFocusedParticipant}
            isWhiteboardOpen={false}
            classroomSlug={classroomSlug}
            sessionId={sessionId}
            userRole={userRole}
            panelsOpen={panelsOpen}
            whiteboardTool={whiteboardTool}
            whiteboardColor={whiteboardColor}
            whiteboardBrushSize={whiteboardBrushSize}
          />
        )}
        {layout === 'presentation' && (
          <PresentationVideoLayout 
            key="presentation" 
            participants={participants}
            isWhiteboardOpen={false}
            classroomSlug={classroomSlug}
            sessionId={sessionId}
            userRole={userRole}
            panelsOpen={panelsOpen}
            whiteboardTool={whiteboardTool}
            whiteboardColor={whiteboardColor}
            whiteboardBrushSize={whiteboardBrushSize}
          />
        )}
        {layout === 'focus' && (
          <FocusVideoLayout 
            key="focus" 
            participants={participants}
            focusedParticipant={focusedParticipant}
            setFocusedParticipant={setFocusedParticipant}
            isWhiteboardOpen={false}
            classroomSlug={classroomSlug}
            sessionId={sessionId}
            userRole={userRole}
            panelsOpen={panelsOpen}
            whiteboardTool={whiteboardTool}
            whiteboardColor={whiteboardColor}
            whiteboardBrushSize={whiteboardBrushSize}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Grid Video Layout - 智能网格算法（Google Meet风格）
function GridVideoLayout({ participants, setFocusedParticipant, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen, whiteboardTool, whiteboardColor, whiteboardBrushSize }: any) {
  // 计算总项目数量（参与者 + 白板）
  const totalItems = participants.length + (isWhiteboardOpen ? 1 : 0);
  
  const getGridClasses = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-2';
    
    // 智能网格算法：Google Meet风格
    // rows = floor(sqrt(N))
    // cols = ceil(N / rows)
    const rows = Math.floor(Math.sqrt(count));
    const cols = Math.ceil(count / rows);
    
    // 返回对应的 Tailwind CSS 类
    if (cols <= 2) return 'grid-cols-2';
    if (cols <= 3) return 'grid-cols-3';
    if (cols <= 4) return 'grid-cols-4';
    if (cols <= 5) return 'grid-cols-5';
    if (cols <= 6) return 'grid-cols-6';
    if (cols <= 7) return 'grid-cols-7';
    if (cols <= 8) return 'grid-cols-8';
    return 'grid-cols-8'; // 最大8列
  };

  const getGridRows = (count: number) => {
    if (count <= 1) return '';
    if (count <= 2) return '';
    
    const rows = Math.floor(Math.sqrt(count));
    
    // 返回对应的行数类（如果需要限制行数）
    if (rows <= 2) return 'grid-rows-2';
    if (rows <= 3) return 'grid-rows-3';
    if (rows <= 4) return 'grid-rows-4';
    if (rows <= 5) return 'grid-rows-5';
    if (rows <= 6) return 'grid-rows-6';
    if (rows <= 7) return 'grid-rows-7';
    return 'grid-rows-8'; // 最大8行
  };

  return (
    <motion.div 
      className="h-full pl-8 pr-8 pb-4 pt-4 z-10 flex-shrink-0 overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`grid gap-2 md:gap-4 h-full w-full ${getGridClasses(totalItems)} ${getGridRows(totalItems)} auto-rows-fr`}>
        {/* 白板项目（如果打开） */}
        {isWhiteboardOpen && (
          <div className="relative w-full aspect-video flex-shrink-0">
            <motion.div 
              className="w-full h-full relative rounded-xl overflow-hidden bg-white border border-slate-300/60"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <WhiteboardCanvas 
                classroomSlug={classroomSlug}
                sessionId={sessionId}
                userRole={userRole}
                participantName={"Whiteboard"}
                currentTool={whiteboardTool}
                currentColor={whiteboardColor}
                currentBrushSize={whiteboardBrushSize}
              />
              <div className="absolute top-2 left-2 bg-purple-500/80 text-white px-2 py-1 rounded text-xs font-medium">
                白板
              </div>
            </motion.div>
          </div>
        )}
        
        {/* 参与者项目 */}
        {participants.map((participant: any, index: number) => (
          <div 
            key={participant.sid || participant.identity || `participant-${index}`}
            className="relative w-full min-h-0"
          >
            <VideoTile 
              participant={participant}
              size="grid"
              onFocus={() => setFocusedParticipant(participant)}
              isWhiteboardOpen={false} // 在网格中不需要重复显示白板
              classroomSlug={classroomSlug}
              sessionId={sessionId}
              userRole={userRole}
              showFocusButton={true}
              panelsOpen={panelsOpen}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Presentation Video Layout - 左边大容器，右边缩小到三分之一
function PresentationVideoLayout({ participants, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen, whiteboardTool, whiteboardColor, whiteboardBrushSize }: any) {
  const presenter = participants.find((p: any) => p.metadata?.includes('tutor')) || participants[0];
  const others = participants.filter((p: any) => p.sid !== presenter?.sid);

  return (
    <motion.div 
      className="h-full flex p-4 flex-shrink-0 overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      {/* 左边大容器 - 白板优先，否则显示主讲人 */}
      <div className={`pr-2 transition-all duration-300 ${
        panelsOpen ? 'w-4/5' : 'w-3/4'
      }`}>
        {isWhiteboardOpen ? (
          <div className="w-full h-full flex-shrink-0">
            <motion.div 
              className="w-full h-full relative rounded-xl overflow-hidden bg-white border border-slate-300/60"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <WhiteboardCanvas 
                classroomSlug={classroomSlug}
                sessionId={sessionId}
                userRole={userRole}
                participantName={"Whiteboard"}
                currentTool={whiteboardTool}
                currentColor={whiteboardColor}
                currentBrushSize={whiteboardBrushSize}
              />
              <div className="absolute top-2 left-2 bg-purple-500/80 text-white px-2 py-1 rounded text-xs font-medium">
                白板
              </div>
            </motion.div>
          </div>
        ) : (
          <VideoTile 
            participant={presenter} 
            size="large"
            isWhiteboardOpen={false}
            classroomSlug={classroomSlug}
            sessionId={sessionId}
            userRole={userRole}
            panelsOpen={panelsOpen}
          />
        )}
      </div>
      
      {/* 右边容器 - 参与者列表，panel开启时更窄 */}
      <div className={`pl-2 transition-all duration-300 flex-shrink-0 ${
        panelsOpen ? 'w-1/5' : 'w-1/4'
      }`}>
        <div className="flex flex-col space-y-2 h-full overflow-y-auto">
          {/* 如果白板打开，主讲人移到右边 */}
          {isWhiteboardOpen && presenter && (
            <VideoTile 
              participant={presenter}
              size="normal"
              isWhiteboardOpen={false}
              classroomSlug={classroomSlug}
              sessionId={sessionId}
              userRole={userRole}
              panelsOpen={panelsOpen}
            />
          )}
          
          {/* 其他参与者 */}
          {others.map((participant: any, index: number) => (
            <VideoTile 
              key={participant.sid || participant.identity || `other-${index}`}
              participant={participant}
              size="normal"
              isWhiteboardOpen={false}
              classroomSlug={classroomSlug}
              sessionId={sessionId}
              userRole={userRole}
              panelsOpen={panelsOpen}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Focus Video Layout - 只显示一个容器
function FocusVideoLayout({ participants, focusedParticipant, setFocusedParticipant, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen, whiteboardTool, whiteboardColor, whiteboardBrushSize }: any) {
  const focused = focusedParticipant || participants[0];

  return (
    <motion.div 
      className="h-full p-4 flex-shrink-0 overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-full h-full relative">
        {/* 白板优先显示，否则显示聚焦的参与者 */}
        {isWhiteboardOpen ? (
          <div className="w-full h-full flex-shrink-0">
            <motion.div 
              className="w-full h-full relative rounded-xl overflow-hidden bg-white border border-slate-300/60"
              whileHover={{ scale: 1.005 }}
              transition={{ duration: 0.2 }}
            >
              <WhiteboardCanvas 
                classroomSlug={classroomSlug}
                sessionId={sessionId}
                userRole={userRole}
                participantName={"Whiteboard"}
                currentTool={whiteboardTool}
                currentColor={whiteboardColor}
                currentBrushSize={whiteboardBrushSize}
              />
              <div className="absolute top-2 left-2 bg-purple-500/80 text-white px-2 py-1 rounded text-xs font-medium">
                白板
              </div>
            </motion.div>
          </div>
        ) : (
          <VideoTile 
            participant={focused} 
            size="large" 
            isWhiteboardOpen={false}
            classroomSlug={classroomSlug}
            sessionId={sessionId}
            userRole={userRole}
            panelsOpen={panelsOpen}
          />
        )}
        
        <motion.button
          onClick={() => setFocusedParticipant(null)}
          className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg hover:bg-slate-700/80 transition-colors z-20"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          退出聚焦
        </motion.button>
      </div>
    </motion.div>
  );
}

function VideoTile({ participant, size = 'normal', onFocus, showFocusButton = false, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen }: any) {
  const sizeClasses: Record<string, string> = {
    thumbnail: 'w-full max-w-32 h-20 flex-shrink-0',
    small: 'w-full max-w-48 h-32 md:max-w-56 md:h-36 flex-shrink-0',
    normal: panelsOpen 
      ? 'w-full h-32 md:h-36 lg:h-40 flex-shrink-0' // panel开启时更紧凑，固定高度
      : 'w-full h-40 md:h-48 lg:h-56 flex-shrink-0', // panel关闭时更宽松，固定高度
    large: 'w-full h-full flex-shrink-0', // 固定高度，不伸缩
    grid: 'w-full aspect-video flex-shrink-0' // 使用固定宽高比，不伸缩
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
            className={`${sizeClasses[size]} flex flex-col items-center justify-center text-slate-400 bg-gradient-to-br from-slate-700 to-slate-800`}
          >
            <VideoOff className="w-20 h-20 mb-2 text-slate-400" />
            <span className="text-m font-large">No Camera</span>
            <span className="text-sm mt-1 opacity-75">Camera is off for {participantName}</span>
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
          {isLocal && (
            <>
              {(!cameraTrackRef || !cameraTrackRef.publication?.track || cameraTrackRef.publication?.isMuted) ? (
                <div className="bg-red-500/20 text-red-300 px-2 py-1 rounded-full text-xs font-medium border border-red-500/30 flex items-center space-x-1">
                  <VideoOff className="w-3 h-3" />
                  <span>Camera Off</span>
                </div>
              ) : (
                <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium border border-green-500/30 flex items-center space-x-1">
                  <Video className="w-3 h-3" />
                  <span>Camera On</span>
                </div>
              )}
            </>
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
 * ✅ 重构后的 VideoArea 组件
 * 
 * 关键改进：
 * 1. WhiteboardCanvas 只渲染一次，永远不会被卸载
 * 2. 使用 CSS Grid 来控制不同布局
 * 3. 布局切换通过改变 CSS 类而不是组件挂载/卸载
 */

interface VideoAreaRefactoredProps {
  participants: any[];
}

export function VideoAreaRefactored({ participants }: VideoAreaRefactoredProps) {
  const {
    layout,
    isWhiteboardOpen,
    classroomSlug,
    sessionId,
    userRole,
    participantName,
    whiteboardTool,
    whiteboardColor,
    whiteboardBrushSize,
    whiteboardCanvasRef,
    setFocusedParticipant,
  } = useClassroom();

  // 🎯 计算 CSS Grid 布局类
  const gridClasses = getLayoutGridClasses(layout, participants.length, isWhiteboardOpen);

  return (
    <motion.div
      className="h-full bg-slate-800/20 backdrop-blur-sm rounded-2xl border border-slate-700/30 overflow-hidden relative"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* 🎯 统一的 Grid 容器 - 包含所有视频和白板 */}
      <div className={`h-full w-full p-4 ${gridClasses}`}>
        
        {/* 
          🎯 关键改进：WhiteboardCanvas 只渲染一次！
          通过 CSS Grid Area 来控制它在不同布局中的位置
        */}
        {isWhiteboardOpen && (
          <div
            className="whiteboard-grid-item rounded-xl overflow-hidden bg-white border border-slate-300/60"
            style={getWhiteboardGridStyle(layout)}
          >
            <WhiteboardCanvas
              ref={whiteboardCanvasRef}
              classroomSlug={classroomSlug}
              sessionId={sessionId}
              userRole={userRole}
              participantName={participantName}
              currentTool={whiteboardTool}
              currentColor={whiteboardColor}
              currentBrushSize={whiteboardBrushSize}
            />
            <div className="absolute top-2 left-2 bg-purple-500/80 text-white px-2 py-1 rounded text-xs font-medium">
              白板
            </div>
          </div>
        )}

        {/* 
          🎯 所有参与者的视频瓦片
          也通过 CSS Grid Area 来定位
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

      {/* 布局标识（调试用） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
          布局: {layout}
        </div>
      )}
    </motion.div>
  );
}

/**
 * 🎯 根据布局模式返回 CSS Grid 类
 */
function getLayoutGridClasses(
  layout: string,
  participantCount: number,
  hasWhiteboard: boolean
): string {
  const totalItems = participantCount + (hasWhiteboard ? 1 : 0);

  switch (layout) {
    case 'grid': {
      // 网格布局：智能计算行列
      if (totalItems <= 1) return 'grid grid-cols-1 gap-4';
      if (totalItems <= 2) return 'grid grid-cols-2 gap-4';
      if (totalItems <= 4) return 'grid grid-cols-2 gap-4';
      if (totalItems <= 6) return 'grid grid-cols-3 gap-4';
      if (totalItems <= 9) return 'grid grid-cols-3 gap-4';
      return 'grid grid-cols-4 gap-4';
    }

    case 'presentation': {
      // 演示布局：主区域 + 侧边栏
      return 'grid grid-cols-[4fr_1fr] gap-4';
    }

    case 'focus': {
      // 聚焦布局：单个大视图
      return 'grid grid-cols-1';
    }

    default:
      return 'grid grid-cols-2 gap-4';
  }
}

/**
 * 🎯 返回白板的 Grid 样式（position/size）
 */
function getWhiteboardGridStyle(layout: string): React.CSSProperties {
  switch (layout) {
    case 'grid':
      // 网格中：占据第一个位置
      return {
        gridColumn: '1',
        gridRow: '1',
      };

    case 'presentation':
      // 演示模式：占据主区域（左侧大区域）
      return {
        gridColumn: '1',
        gridRow: 'span 10', // 占满左侧
      };

    case 'focus':
      // 聚焦模式：占满整个区域
      return {
        gridColumn: '1',
        gridRow: '1',
      };

    default:
      return {};
  }
}

/**
 * 🎯 返回视频瓦片的 Grid 样式
 */
function getVideoTileGridStyle(
  layout: string,
  index: number,
  total: number
): React.CSSProperties {
  switch (layout) {
    case 'grid':
      // 网格模式：自动流式布局
      return {};

    case 'presentation':
      // 演示模式：所有视频在右侧堆叠
      return {
        gridColumn: '2',
        gridRow: `${index + 1}`,
      };

    case 'focus':
      // 聚焦模式：隐藏其他视频（或显示在小窗口）
      return {
        display: index === 0 ? 'block' : 'none',
      };

    default:
      return {};
  }
}

/**
 * 简化的 VideoTile 组件（用于重构后的布局）
 */
function VideoTileSimple({ participant, layout, onFocus }: any) {
  return (
    <motion.div
      className="w-full h-full relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800"
      whileHover={{ scale: layout === 'grid' ? 1.02 : 1 }}
      onClick={onFocus}
    >
      {/* Video 内容 */}
      <div className="absolute inset-0 flex items-center justify-center text-slate-400">
        {participant.displayName || participant.identity}
      </div>
    </motion.div>
  );
}