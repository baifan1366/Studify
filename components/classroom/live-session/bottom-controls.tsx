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
import { Volume2, VolumeX, Settings, LogOut } from 'lucide-react';
import { useCreateRecording } from '@/hooks/classroom/use-recordings';

interface BottomControlsProps {
  colors: { primary: string; light: string; dark: string };
  userRole: 'student' | 'tutor' | 'owner';
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onEndSession: () => void;
  onOpenDevices?: () => void;
  classroomSlug?: string;
  sessionId?: string;
  onLeaveSession?: () => void;
}

export default function BottomControls({
  colors,
  userRole,
  isRecording,
  onStartRecording,
  onStopRecording,
  onEndSession,
  onOpenDevices,
  classroomSlug,
  sessionId,
  onLeaveSession,
}: BottomControlsProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [currentTab, setCurrentTab] = useState<string | null>(null); // 记录录制时的标签页

  // Recording hook
  const createRecording = classroomSlug ? useCreateRecording(classroomSlug) : null;

  // Debug logging
  useEffect(() => {
    console.log('🎯 userRole in BottomControls:', userRole);
    console.log('BottomControls debug:', {
      userRole,
      classroomSlug,
      hasCreateRecording: !!createRecording,
      isRecording,
      sessionId
    });
  }, [userRole, classroomSlug, createRecording, isRecording, sessionId]);

  // 🎯 锁定标签页功能：录制时禁止切换标签
  useEffect(() => {
    if (isRecording && currentTab) {
      // 添加事件监听，阻止标签切换
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '录制正在进行中，确定要离开吗？';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isRecording, currentTab]);

  // Start recording function
  const handleStartRecording = async () => {
    try {
      // 防止重复启动
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.warn('Recording is already in progress');
        return;
      }

      // 🎯 自动选择当前标签页进行录制
      setCurrentTab('current-tab');

      // 捕获当前标签页的屏幕与音频
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser', // 优先选择浏览器标签页
        },
        audio: {
          suppressLocalAudioPlayback: false, // 允许录制标签页音频
        },
        preferCurrentTab: true, // Chrome 94+ 自动选择当前标签页
        selfBrowserSurface: 'include', // 包含当前浏览器
        surfaceSwitching: 'exclude', // 禁止切换到其他窗口/标签
        systemAudio: 'include', // 包含系统音频
      } as any); // 使用 any 因为 TypeScript 类型定义可能不完整

      // Safari 兼容：有时需单独捕获麦克风
      if (!stream.getAudioTracks().length) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStream.getAudioTracks().forEach(track => stream.addTrack(track));
        } catch (micError) {
          console.warn('⚠️ No microphone audio captured:', micError);
        }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });

      const chunks: Blob[] = [];
      const startTime = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const durationSec = Math.floor((Date.now() - startTime) / 1000);
        const blob = new Blob(chunks, { type: 'video/webm' });

        console.log('🎬 Recording complete', {
          sizeMB: (blob.size / 1024 / 1024).toFixed(2),
          durationSec,
          userRole,
          classroomSlug,
          sessionId,
        });

        // 停止所有 track
        stream.getTracks().forEach(track => track.stop());

        // 🎯 自动下载录制文件
        const downloadUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadUrl);
        console.log('📥 Recording downloaded automatically');

        // 上传逻辑（tutor 和 owner 可上传）
        if ((userRole === 'tutor' || userRole === 'owner') && createRecording && sessionId && classroomSlug) {
          try {
            const file = new File([blob], `recording_${Date.now()}.webm`, {
              type: 'video/webm',
            });

            await createRecording.mutateAsync({
              file,
              session_id: sessionId,
              duration_sec: durationSec,
            });

            alert('✅ Recording uploaded successfully!');
          } catch (err) {
            console.error('❌ Upload failed:', err);
            const message = err instanceof Error ? err.message : 'Unknown upload error';
            alert(`Recording upload failed: ${message}`);
          }
        } else {
          console.warn('Skipped upload: not tutor or missing info');
        }

        // 🎯 清理状态，解锁标签页
        setMediaRecorder(null);
        setRecordedChunks([]);
        setCurrentTab(null);
      };

      recorder.start(1000); // 每秒触发一次 dataavailable
      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
      onStartRecording();

      console.log('🎥 Recording started, current tab locked');
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Please allow screen sharing permissions.');
      onStopRecording();
    }
  };

  // Stop recording function
  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log('🛑 Stopping recording...');
      mediaRecorder.stop();
    } else {
      console.warn('No active recording to stop.');
    }
    setMediaRecorder(null);
    onStopRecording();
  };



  // Calculate button contrast based on theme primary color (no need to import additional libraries)
  const hex = colors.primary.startsWith('#') ? colors.primary.slice(1) : colors.primary;
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  // Calculate relative luminance
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const isPrimaryDark = luminance < 0.5;

  const baseBtn = isPrimaryDark
    ? 'bg-white/90 text-black hover:bg-white'
    : 'bg-gray-800 text-white hover:bg-gray-700';
  const roundBtn = `${baseBtn} h-9 w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center`;
  const pillBtn = `${baseBtn} h-9 md:h-10 px-2 md:px-3 rounded-full`;
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
            background: `linear-gradient(135deg, ${colors.primary}40, ${colors.primary}20)`,
            border: `1px solid ${colors.primary}50`,
            backdropFilter: 'blur(8px)',
            boxShadow: `0 4px 12px ${colors.primary}20`,
          }}
        >
          {/* Center: LiveKit controls (custom Control Bar, centered with flex) */}
          <div className="flex flex-1 justify-center px-2 pointer-events-auto">
            <div className="lk-controls no-scrollbar w-full flex items-center justify-center gap-1 sm:gap-2 bg-transparent flex-nowrap overflow-x-auto">
              {/* Due to browser autoplay policy, need StartAudio to enable audio on first use */}
              <StartAudio label="Enable Audio" className={`${pillBtn} text-sm md:text-base`} />

              {/* Audio control group - microphone toggle + audio device selection */}
              <div className="flex items-center bg-white/10 rounded-full">
                <TrackToggle
                  source={Track.Source.Microphone}
                  className={`${roundBtn} rounded-r-none border-r border-white/20`}
                />
                <MediaDeviceMenu kind="audioinput" className="h-9 w-9 md:h-10 md:w-10 rounded-l-none" />
              </div>

              {/* Video control group - camera toggle + video device selection */}
              <div className="flex items-center bg-white/10 rounded-full">
                <TrackToggle
                  source={Track.Source.Camera}
                  className={`${roundBtn} rounded-r-none border-r border-white/20`}
                />
                <MediaDeviceMenu kind="videoinput" className="h-9 w-9 md:h-10 md:w-10 rounded-l-none" />
              </div>

              {/* Screen sharing */}
              <TrackToggle
                source={Track.Source.ScreenShare}
                className={roundBtn}
              />

              {/* Leave room */}
              <DisconnectButton
                className={`${pillBtn} bg-red-600 text-white hover:bg-red-500 text-sm md:text-base flex items-center gap-2`}
                onClick={() => {
                  // Redirect to classroom dashboard after leaving
                  if (onLeaveSession) {
                    onLeaveSession();
                  } else if (classroomSlug) {
                    window.location.href = `/classroom/${classroomSlug}`;
                  }
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>Leave</span>
              </DisconnectButton>
            </div>
          </div>

          {/* Right side: tutor/owner operations + volume control */}
          <div className="flex items-center justify-end gap-2">
            {/* Recording button - show for tutors and owners */}
            {userRole && (userRole.toLowerCase() === 'tutor' || userRole.toLowerCase() === 'owner') && (
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className="h-9 w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center bg-red-600 text-white hover:bg-red-500 border-2 border-white"
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
                disabled={createRecording?.isPending}
                style={{ minWidth: '40px', minHeight: '40px' }}
              >
                <span className={`text-xs font-bold ${isRecording ? 'animate-pulse' : ''}`}>
                  {createRecording?.isPending ? 'SAVE' : (isRecording ? '● REC' : 'REC')}
                </span>
              </button>
            )}

            {userRole && (userRole.toLowerCase() === 'tutor' || userRole.toLowerCase() === 'owner') && (
              <button
                onClick={onEndSession}
                className={`${pillBtn} bg-red-600 hover:bg-red-500 text-black`}
                title="End Session"
              >
                End
              </button>
            )}

            {/* Volume control button */}
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
        /* Hide horizontal scrollbar but allow scrolling */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        /* Try to display center control area in single line in landscape mode */
        @media (orientation: landscape) {
          .lk-controls { flex-wrap: nowrap; }
        }
      `}</style>
    </motion.div>
  );
}
