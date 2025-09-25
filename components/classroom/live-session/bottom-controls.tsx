'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MediaDeviceMenu,
  StartAudio,
  TrackToggle,
  DisconnectButton,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Volume2, VolumeX, Settings, Smile, LogOut } from 'lucide-react';
import { useCreateRecording } from '@/hooks/classroom/use-recordings';

interface BottomControlsProps {
  colors: { primary: string; light: string; dark: string };
  userRole: 'student' | 'tutor';
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onEndSession: () => void;
  addReaction: (type: string) => void;
  reactionEmojis: Record<string, string>;
  onOpenDevices?: () => void;
  classroomSlug?: string;
  sessionId?: string;
}

export default function BottomControls({
  colors,
  userRole,
  isRecording,
  onStartRecording,
  onStopRecording,
  onEndSession,
  addReaction,
  reactionEmojis,
  onOpenDevices,
  classroomSlug,
  sessionId,
}: BottomControlsProps) {
  const [showReactionPanel, setShowReactionPanel] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  
  // Recording hook
  const createRecording = classroomSlug ? useCreateRecording(classroomSlug) : null;

  // 开始录制函数
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        console.log('Recording stopped:', {
          size: blob.size,
          type: blob.type,
          classroomSlug,
          sessionId,
          hasCreateRecording: !!createRecording
        });
        
        if (createRecording && sessionId && classroomSlug && userRole === 'tutor') {
          try {
            const file = new File([blob], `recording_${Date.now()}.webm`, { type: 'video/webm' });
            console.log('Uploading recording:', {
              fileName: file.name,
              fileSize: file.size,
              sessionId,
              classroomSlug,
              userRole
            });
            
            await createRecording.mutateAsync({
              file,
              session_id: sessionId,
              duration_sec: Math.floor(blob.size / 1000) // 粗略估算时长
            });
            console.log('Recording uploaded successfully');
          } catch (error) {
            console.error('Failed to upload recording:', error);
            // Show user-friendly error message
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            alert(`录制上传失败: ${errorMessage}`);
          }
        } else {
          console.warn('Cannot upload recording - missing data or insufficient permissions:', {
            hasCreateRecording: !!createRecording,
            sessionId,
            classroomSlug,
            userRole,
            isAuthorized: userRole === 'tutor'
          });
          if (userRole !== 'tutor') {
            alert('只有导师可以上传录制文件');
          }
        }
        setRecordedChunks([]);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
      
      // Call parent's onStartRecording callback
      onStartRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      // If screen recording fails, make sure to reset state
      onStopRecording();
    }
  };

  // 停止录制函数
  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
    
    // Call parent's onStopRecording callback
    onStopRecording();
  };

  // 快捷键功能
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            e.preventDefault();
            addReaction('clap');
            break;
          case 't':
            e.preventDefault();
            addReaction('thumbs_up');
            break;
          case 'l':
            e.preventDefault();
            addReaction('laugh');
            break;
          case 'h':
            e.preventDefault();
            addReaction('heart');
            break;
          case 'y':
            e.preventDefault();
            addReaction('party');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [addReaction]);

  // 点击外部关闭表情面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showReactionPanel) {
        const target = e.target as Element;
        if (!target.closest('.reaction-panel-container')) {
          setShowReactionPanel(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReactionPanel]);

  // 根据主题主色计算按钮对比度（无需引入额外库）
  const hex = colors.primary.startsWith('#') ? colors.primary.slice(1) : colors.primary;
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  // 计算相对亮度
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const isPrimaryDark = luminance < 0.5;

  const baseBtn = isPrimaryDark
    ? 'bg-white/90 text-black hover:bg-white'
    : 'bg-gray-800 text-white hover:bg-gray-700';
  const roundBtn = `${baseBtn} h-9 w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center`;
  const pillBtn = `${baseBtn} h-9 md:h-10 px-2 md:px-3 rounded-full`;

  // 获取快捷键提示
  const getShortcutKey = (reactionKey: string) => {
    const keyMap: Record<string, string> = {
      'clap': 'C',
      'thumbs_up': 'T', 
      'laugh': 'L',
      'heart': 'H',
      'party': 'Y'
    };
    return keyMap[reactionKey] || '';
  };
  return (
    <motion.div
      className="fixed left-1/2 z-50 -translate-x-1/2"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        width: '80%',
        // Respect iOS/Android safe area bottom spacing while keeping a consistent offset
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)'
      }}
    >
      <div className="mx-auto max-w-4xl px-4">
        <div
          className="relative flex items-center w-full gap-3 md:gap-4 px-3 md:px-4 rounded-full h-12 md:h-14"
          style={{
            background: `${colors.primary}15`,
            border: `1px solid ${colors.primary}25`,
            backdropFilter: 'blur(6px)',
          }}
        >
          {/* 左侧: Reaction 按钮 */}
          <div className="flex items-center justify-start gap-2 flex-1 max-w-xs shrink-0 select-none relative reaction-panel-container">
            <button
              onClick={() => setShowReactionPanel(!showReactionPanel)}
              className={`${roundBtn} relative`}
              title="表情反应 (Ctrl+Shift+快捷键)"
            >
              <Smile className="w-4 h-4" />
            </button>
            
            {/* 表情面板 */}
            <AnimatePresence>
              {showReactionPanel && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-full mb-2 left-0 bg-black/80 backdrop-blur-sm rounded-lg p-2 flex gap-1 border border-white/10 z-10"
                >
                  {Object.entries(reactionEmojis).map(([k, e]) => (
                    <button
                      key={k}
                      onClick={() => {
                        addReaction(k);
                        setShowReactionPanel(false);
                      }}
                      className="p-2 rounded hover:bg-white/10 transition-colors w-10 h-10 flex items-center justify-center"
                      title={`${e} (Ctrl+Shift+${getShortcutKey(k)})`}
                    >
                      <span className="text-xl leading-none">{e}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 中间: LiveKit 控件（自定义 Control Bar，使用 flex 居中） */}
          <div className="flex flex-[2] justify-center px-2 pointer-events-auto">
            <div className="lk-controls no-scrollbar w-full flex items-center justify-center gap-1 sm:gap-2 bg-transparent flex-nowrap overflow-x-auto">
              {/* 由于浏览器自动播放策略，首次需 StartAudio 以启用音频 */}
              <StartAudio label="Enable Audio" className={`${pillBtn} text-sm md:text-base`} />

              {/* 音频控制组 - 麦克风开关 + 音频设备选择 */}
              <div className="flex items-center bg-white/10 rounded-full">
                <TrackToggle
                  source={Track.Source.Microphone}
                  className={`${roundBtn} rounded-r-none border-r border-white/20`}
                />
                <MediaDeviceMenu kind="audioinput" className="h-9 w-9 md:h-10 md:w-10 rounded-l-none" />
              </div>

              {/* 视频控制组 - 摄像头开关 + 视频设备选择 */}
              <div className="flex items-center bg-white/10 rounded-full">
                <TrackToggle
                  source={Track.Source.Camera}
                  className={`${roundBtn} rounded-r-none border-r border-white/20`}
                />
                <MediaDeviceMenu kind="videoinput" className="h-9 w-9 md:h-10 md:w-10 rounded-l-none" />
              </div>

              {/* 屏幕共享 */}
              <TrackToggle
                source={Track.Source.ScreenShare}
                className={roundBtn}
              />

              {/* 离开房间 */}
              <DisconnectButton className={`${pillBtn} bg-red-600 text-white hover:bg-red-500 text-sm md:text-base flex items-center gap-2`}>
                <LogOut className="w-4 h-4" />
                <span>离开</span>
              </DisconnectButton>
            </div>
          </div>

          {/* 右侧: tutor 操作 + 音量控制 */}
          <div className="flex items-center justify-end gap-2 flex-1 max-w-xs shrink-0">
            {/* Debug: Show userRole */}
            {process.env.NODE_ENV === 'development' && (
              <span className="text-xs text-white/50 mr-2">Role: {userRole}</span>
            )}
            {/* Recording button - only show for tutors */}
            {userRole === 'tutor' && (
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className="h-9 w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center bg-red-600 text-white hover:bg-red-500 border-2 border-white"
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
                disabled={createRecording?.isPending}
                style={{ minWidth: '40px', minHeight: '40px' }}
              >
                <span className="text-xs font-bold">
                  {createRecording?.isPending ? 'SAVE' : 'REC'}
                </span>
              </button>
            )}
            
            {userRole === 'tutor' && (
              <button
                onClick={onEndSession}
                className={`${pillBtn} bg-red-600 hover:bg-red-500 text-white`}
                title="End Session"
              >
                End
              </button>
            )}
            
            {/* 音量控制按钮 */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`${roundBtn}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            
            {onOpenDevices && (
              <button
                onClick={onOpenDevices}
                className={`${roundBtn}`}
                title="Device Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        /* 隐藏横向滚动条，但允许滚动 */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        /* 横屏时尽量单行显示中心控制区 */
        @media (orientation: landscape) {
          .lk-controls { flex-wrap: nowrap; }
        }
      `}</style>
    </motion.div>
  );
}
