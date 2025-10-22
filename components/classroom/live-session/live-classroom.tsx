'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext, ReactNode } from 'react';

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
  userRole: 'student' | 'tutor';
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
  const [sessionDuration, setSessionDuration] = useState(2347);
  
  // Whiteboard toolbar state
  const [whiteboardTool, setWhiteboardTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle' | 'text'>('pen');
  const [whiteboardColor, setWhiteboardColor] = useState('#000000');
  const [whiteboardBrushSize, setWhiteboardBrushSize] = useState(4);
  const [whiteboardFontSize, setWhiteboardFontSize] = useState(16); // 🎯 Independent font size state (pixel value)
  const [whiteboardTextAlign, setWhiteboardTextAlign] = useState<'left' | 'center' | 'right'>('left'); // 🎯 Text alignment state
  
  // Whiteboard canvas reference - store all canvas references
  const whiteboardCanvasRefs = useRef<{ [key: string]: any }>({});
  // Single whiteboard canvas reference for the main whiteboard
  const whiteboardCanvasRef = useRef<any>(null);
  
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
    if (whiteboardCanvasRef.current?.clearCanvas) {
      console.log('Clearing via main ref');
      whiteboardCanvasRef.current.clearCanvas();
      return;
    }
    
    // Fallback to the collection of refs
    Object.values(whiteboardCanvasRefs.current).forEach((canvasRef: any) => {
      if (canvasRef?.clearCanvas) {
        console.log('Clearing via collection ref');
        canvasRef.clearCanvas();
      }
    });
  };

  // Whiteboard save function
  const handleSaveWhiteboard = async () => {
    // Try the main ref first
    if (whiteboardCanvasRef.current?.saveCanvas) {
      await whiteboardCanvasRef.current.saveCanvas();
      return;
    }
    
    // Fallback to the collection of refs
    const firstCanvasRef = Object.values(whiteboardCanvasRefs.current).find((ref: any) => ref?.saveCanvas);
    if (firstCanvasRef?.saveCanvas) {
      await firstCanvasRef.saveCanvas();
    }
  };

  // Whiteboard download function
  const handleDownloadWhiteboard = () => {
    // Try the main ref first
    if (whiteboardCanvasRef.current?.downloadCanvas) {
      whiteboardCanvasRef.current.downloadCanvas();
      return;
    }
    
    // Fallback to the collection of refs
    const firstCanvasRef = Object.values(whiteboardCanvasRefs.current).find((ref: any) => ref?.downloadCanvas);
    if (firstCanvasRef?.downloadCanvas) {
      firstCanvasRef.downloadCanvas();
    }
  }; 
  const [reactions, setReactions] = useState<Array<{ id: number; type: string; at: number }>>([]);
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: number; type: string; x: number; y: number }>>([]);
  const [reactionEmojis, setReactionEmojis] = useState<Array<{ id: string; emoji: string; timestamp: number }>>([]);
  const [focusedParticipant, setFocusedParticipant] = useState<any>(null);
  const [panelWidth, setPanelWidth] = useState(35); // panel width percentage, default 35%
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
    toast.info('Disconnected');
  };

  const handleConnected = () => {
    setIsConnected(true);
    toast.success('Successfully connected to classroom');
  };

  const handleError = (error: Error) => {
    toast.error(`Connection error: ${error.message}`);
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
    onSessionEnd?.();
    toast.info('Classroom ended');
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
      toast.success('Recording started');
    } else {
      toast.success('Recording stopped');
    }
  }, [isRecording]);

  const onRefreshToken = () => {
    generateToken();
    toast.info('Refreshing connection token...');
  };

  if (isLoading) {
    return (
      <Card className="w-full h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Preparing classroom...</p>
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
            <h3 className="text-lg font-medium text-slate-800">Connection Problem</h3>
            <p className="text-red-500 text-sm">
              {errorMessage}
            </p>
            <div className="flex gap-2">
              <Button onClick={handleConnect} variant="outline" size="sm">
                Reconnect
              </Button>
              <Button onClick={() => window.location.reload()} variant="default" size="sm">
                Refresh Page
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
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col relative rounded-lg md:rounded-xl overflow-hidden"
        style={{
          margin: '0',
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
          registerCanvasRef={registerCanvasRef}
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
  whiteboardCanvasRefs: React.MutableRefObject<{ [key: string]: any }>;
  registerCanvasRef: (key: string, ref: any) => void;
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
  whiteboardCanvasRefs,
  registerCanvasRef
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
    toast.success('Recording started');
  };

  const handleStopRecording = () => {
    toast.info('Recording stopped');
  };

  const handleEndSession = () => {
    if (room) {
      room.disconnect();
    }
    onSessionEnd?.();
    toast.info('Classroom ended');
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
        {/* Sidebar - fixed width on desktop, hidden on mobile */}
        <div className="hidden md:flex flex-shrink-0">
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
              setFocusedParticipant={setFocusedParticipant}
              isWhiteboardOpen={isWhiteboardOpen}
              classroomSlug={classroomSlug}
              sessionId={sessionId}
              userRole={userRole}
              panelsOpen={isChatOpen || isWhiteboardOpen}
              whiteboardTool={whiteboardTool}
              whiteboardColor={whiteboardColor}
              whiteboardBrushSize={whiteboardBrushSize}
              registerCanvasRef={registerCanvasRef}
            />
          </div>

          {/* Drag divider - only on desktop */}
          {(isChatOpen || isWhiteboardOpen) && (
            <div
              className={`hidden md:block w-1 bg-slate-600/20 hover:bg-slate-500/40 cursor-col-resize z-[15] flex-shrink-0 ${
                isResizing ? 'bg-slate-400/60' : ''
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
        Participants ({participants.length})
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
                      <span className="text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">You</span>
                    )}
                  </div>
                  <div className="text-xs text-white/60 capitalize">
                    {isLocal ? 'Local User' : 'Remote User'}
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
      className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 px-3 md:px-6 py-2 md:py-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Status & Info */}
        <div className="flex items-center space-x-2 md:space-x-6 flex-1 min-w-0">
          <div className="flex items-center space-x-1.5 md:space-x-3">
            <div className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
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
          title="Whiteboard"
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
function VideoArea({ layout, participants, focusedParticipant, setFocusedParticipant, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen, whiteboardTool, whiteboardColor, whiteboardBrushSize, whiteboardFontSize, whiteboardCanvasRef, registerCanvasRef }: any) {
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
  {/* 🎯 Whiteboard overlay */}
  {isWhiteboardOpen && (
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
            Whiteboard
          </span>
        </div>
        <WhiteboardCanvas 
          classroomSlug={useMemo(() => classroomSlug, [])}
          sessionId={useMemo(() => sessionId, [])}
          userRole={userRole}
          participantName={"Whiteboard"}
          currentTool={whiteboardTool}
          currentColor={whiteboardColor}
          currentBrushSize={whiteboardBrushSize}
          currentFontSize={whiteboardFontSize}
          ref={whiteboardCanvasRef}
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
            isWhiteboardOpen={isWhiteboardOpen}
            classroomSlug={classroomSlug}
            sessionId={sessionId}
            userRole={userRole}
            panelsOpen={panelsOpen}
            whiteboardTool={whiteboardTool}
            whiteboardColor={whiteboardColor}
            whiteboardBrushSize={whiteboardBrushSize}
            whiteboardFontSize={whiteboardFontSize}
            registerCanvasRef={registerCanvasRef}
          />
        )}
        {layout === 'presentation' && (
          <PresentationVideoLayout 
            key="presentation" 
            participants={participants}
            isWhiteboardOpen={isWhiteboardOpen}
            classroomSlug={classroomSlug}
            sessionId={sessionId}
            userRole={userRole}
            panelsOpen={panelsOpen}
            whiteboardTool={whiteboardTool}
            whiteboardColor={whiteboardColor}
            whiteboardBrushSize={whiteboardBrushSize}
            whiteboardFontSize={whiteboardFontSize}
            registerCanvasRef={registerCanvasRef}
          />
        )}
        {layout === 'focus' && (
          <FocusVideoLayout 
            key="focus" 
            participants={participants}
            focusedParticipant={focusedParticipant}
            setFocusedParticipant={setFocusedParticipant}
            isWhiteboardOpen={isWhiteboardOpen}
            classroomSlug={classroomSlug}
            sessionId={sessionId}
            userRole={userRole}
            panelsOpen={panelsOpen}
            whiteboardTool={whiteboardTool}
            whiteboardColor={whiteboardColor}
            whiteboardBrushSize={whiteboardBrushSize}
            whiteboardFontSize={whiteboardFontSize}
            registerCanvasRef={registerCanvasRef}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Grid Video Layout - intelligent grid algorithm (Google Meet style)
function GridVideoLayout({ participants, setFocusedParticipant, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen, whiteboardTool, whiteboardColor, whiteboardBrushSize, whiteboardFontSize, registerCanvasRef }: any) {
  // Calculate total item count (participants + whiteboard)
  const totalItems = participants.length + (isWhiteboardOpen ? 1 : 0);
  
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
          <div className="w-full h-full flex-shrink-0">
            <motion.div 
              className="w-full h-full relative rounded-xl overflow-hidden bg-white border border-slate-300/60"
              whileHover={{ scale: 1.005 }}
              transition={{ duration: 0.2 }}
            >
              <WhiteboardCanvas 
  classroomSlug={useMemo(() => classroomSlug, [])} // ✅ 固定引用
  sessionId={useMemo(() => sessionId, [])}
                userRole={userRole}
                participantName={"Whiteboard"}
                currentTool={whiteboardTool}
                currentColor={whiteboardColor}
                currentBrushSize={whiteboardBrushSize}
                currentFontSize={whiteboardFontSize}
                ref={(ref) => registerCanvasRef('focus', ref)}
              />
              <div className="absolute top-2 left-2 bg-purple-500/80 text-white px-2 py-1 rounded text-xs font-medium">
                Whiteboard
              </div>
            </motion.div>
          </div>
        )}
        
        {/* Participant items */}
        {participants.map((participant: any, index: number) => (
          <div 
            key={participant.sid || participant.identity || `participant-${index}`}
            className="relative w-full aspect-video min-h-0" // Consistent height with VideoTile
          >
            <VideoTile 
              participant={participant}
              size="grid"
              onFocus={() => setFocusedParticipant(participant)}
              isWhiteboardOpen={false} // No need to repeatedly show Whiteboard in grid
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

// Presentation Video Layout - large container on left, right side shrunk to one-third
function PresentationVideoLayout({ participants, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen, whiteboardTool, whiteboardColor, whiteboardBrushSize, whiteboardFontSize, registerCanvasRef }: any) {
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
      {/* Large left container - Whiteboard priority, otherwise show presenter */}
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
              classroomSlug={useMemo(() => classroomSlug, [])} // ✅ 固定引用
              sessionId={useMemo(() => sessionId, [])}
              userRole={userRole}
              participantName={"Whiteboard"}
              currentTool={whiteboardTool}
              currentColor={whiteboardColor}
              currentBrushSize={whiteboardBrushSize}
              currentFontSize={whiteboardFontSize}
              className="h-full w-full"
              registerCanvasRef={registerCanvasRef}
            />
              <div className="absolute top-2 left-2 bg-purple-500/80 text-white px-2 py-1 rounded text-xs font-medium">
                Whiteboard
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
      
      {/* Right container - participants list, narrower when panel is open */}
      <div className={`pl-2 transition-all duration-300 flex-shrink-0 ${
        panelsOpen ? 'w-1/5' : 'w-1/4'
      }`}>
        <div className="flex flex-col space-y-2 h-full overflow-y-auto">
          {/* If Whiteboard is open, move presenter to right side */}
          {isWhiteboardOpen && presenter && (
              <VideoTile 
                participant={presenter}
                size="grid"
                isWhiteboardOpen={false}
                classroomSlug={classroomSlug}
                sessionId={sessionId}
                userRole={userRole}
                panelsOpen={panelsOpen}
              />
          )}
          
          {/* Other participants */}
          {others.map((participant: any, index: number) => (
            <div  key={participant.sid || participant.identity || `other-${index}`}> {/* Consistent height with VideoTile */}
              <VideoTile 
                participant={participant}
                size="grid"
                isWhiteboardOpen={false}
                classroomSlug={classroomSlug}
                sessionId={sessionId}
                userRole={userRole}
                panelsOpen={panelsOpen}
              />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Focus Video Layout - show only one container
function FocusVideoLayout({ participants, focusedParticipant, setFocusedParticipant, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen, whiteboardTool, whiteboardColor, whiteboardBrushSize, whiteboardFontSize, registerCanvasRef }: any) {
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
        {/* Whiteboard priority display, otherwise show focused participant */}
        {isWhiteboardOpen ? (
          <div className="w-full h-full flex-shrink-0">
            <motion.div 
              className="w-full h-full relative rounded-xl overflow-hidden bg-white border border-slate-300/60"
              whileHover={{ scale: 1.005 }}
              transition={{ duration: 0.2 }}
            >
              <WhiteboardCanvas 
                classroomSlug={useMemo(() => classroomSlug, [])} // ✅ 固定引用
                sessionId={useMemo(() => sessionId, [])}
                userRole={userRole}
                participantName={"Whiteboard"}
                currentTool={whiteboardTool}
                currentColor={whiteboardColor}
                currentBrushSize={whiteboardBrushSize}
                currentFontSize={whiteboardFontSize}
                registerCanvasRef={registerCanvasRef}
              />
              <div className="absolute top-2 left-2 bg-purple-500/80 text-white px-2 py-1 rounded text-xs font-medium">
                Whiteboard
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
          Exit Focus
        </motion.button>
      </div>
    </motion.div>
  );
}

function VideoTile({ participant, size = 'normal', onFocus, showFocusButton = false, isWhiteboardOpen, classroomSlug, sessionId, userRole, panelsOpen }: any) {
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
      
      {/* --- Screen Share independent container --- */}
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

      {/* --- Camera independent container --- */}
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
            className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-gradient-to-br from-slate-700 to-slate-800"
          >
            {/* Fixed absolute size (48px x 48px) across all layouts */}
            <VideoOff className="w-12 h-12 mb-2 text-slate-400" />
            <span className="text-sm font-medium">No Camera</span>
            <span className="text-xs mt-1 opacity-75">Camera is off for {participantName}</span>
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
  userRole: 'student' | 'tutor';
  participantName: string;
  whiteboardTool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  whiteboardColor: string;
  whiteboardBrushSize: number;
  whiteboardFontSize: number;
  whiteboardCanvasRef: React.RefObject<any>;
  registerCanvasRef: (key: string, ref: any) => void;
  setFocusedParticipant: (participant: any) => void;
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
  whiteboardCanvasRef,
  registerCanvasRef,
  setFocusedParticipant,
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
            <WhiteboardCanvas 
              classroomSlug={useMemo(() => classroomSlug, [])}
              sessionId={useMemo(() => sessionId, [])}
              userRole={userRole}
              participantName={"Whiteboard"}
              currentTool={whiteboardTool}
              currentColor={whiteboardColor}
              currentBrushSize={whiteboardBrushSize}
              currentFontSize={whiteboardFontSize}
              className="h-full w-full"
              ref={whiteboardCanvasRef}
              registerCanvasRef={registerCanvasRef}
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