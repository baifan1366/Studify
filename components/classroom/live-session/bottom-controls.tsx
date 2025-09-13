'use client';

import { motion } from 'framer-motion';
import {
  MediaDeviceMenu,
  StartAudio,
  TrackToggle,
  DisconnectButton,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Volume2, Settings } from 'lucide-react';

interface BottomControlsProps {
  colors: { primary: string; light: string; dark: string };
  userRole: 'student' | 'tutor';
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onEndSession: () => void;
  sessionDuration: number;
  formatDuration: (s: number) => string;
  addReaction: (type: string) => void;
  reactionEmojis: Record<string, string>;
  onOpenDevices?: () => void;
}

export default function BottomControls({
  colors,
  userRole,
  isRecording,
  onStartRecording,
  onStopRecording,
  onEndSession,
  sessionDuration,
  formatDuration,
  addReaction,
  reactionEmojis,
  onOpenDevices,
}: BottomControlsProps) {
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
  return (
    <motion.div
      className="fixed left-1/2 z-50 -translate-x-1/2"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        width: '100%',
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
          {/* 左侧: Reactions */}
          <div className="flex items-center justify-start gap-2 w-28 sm:w-40 md:w-64 shrink-0 select-none">
            {Object.entries(reactionEmojis).map(([k, e]) => (
              <button
                key={k}
                onClick={() => addReaction(k)}
                className="p-2 rounded-full hover:scale-105 transition-transform h-9 w-9 md:h-10 md:w-10 flex items-center justify-center"
                aria-label={`reaction-${k}`}
              >
                <span className="text-xl leading-none">{e}</span>
              </button>
            ))}
          </div>

          {/* 中间: LiveKit 控件（自定义 Control Bar，使用 flex 居中） */}
          <div className="flex flex-1 justify-center px-2 pointer-events-auto">
            <div className="lk-controls no-scrollbar w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg min-w-[240px] flex items-center justify-center gap-1 sm:gap-2 bg-transparent flex-nowrap overflow-x-auto">
              {/* 由于浏览器自动播放策略，首次需 StartAudio 以启用音频 */}
              <StartAudio label="Enable Audio" className={`${pillBtn} text-sm md:text-base`} />

              {/* 麦克风与摄像头开关 */}
              <TrackToggle
                source={Track.Source.Microphone}
                className={roundBtn}
              />
              <TrackToggle
                source={Track.Source.Camera}
                className={roundBtn}
              />

              {/* 屏幕共享 */}
              <TrackToggle
                source={Track.Source.ScreenShare}
                className={roundBtn}
              />

              {/* 离开房间 */}
              <DisconnectButton className={`${pillBtn} bg-red-600 text-white hover:bg-red-500 text-sm md:text-base`} />
            </div>
          </div>

          {/* 右侧: tutor 操作 + DeviceMenu + timer */}
          <div className="flex items-center justify-end gap-2 md:gap-3 w-28 sm:w-40 md:w-64 ml-auto shrink-0">
            {/* 单独的设备选择菜单 */}
            <MediaDeviceMenu kind="audioinput" />
            <MediaDeviceMenu kind="videoinput" />

            {userRole === 'tutor' && (
              <>
                <button
                  onClick={isRecording ? onStopRecording : onStartRecording}
                  className={`h-10 w-10 flex items-center justify-center rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-700'} text-white`}
                  title={isRecording ? 'Stop Recording' : 'Start Recording'}
                >
                  REC
                </button>
                <button
                  onClick={onEndSession}
                  className="h-10 px-3 rounded-full bg-gray-700 text-white hover:bg-gray-600 flex items-center justify-center"
                >
                  End
                </button>
              </>
            )}
            {onOpenDevices && (
              <button
                onClick={onOpenDevices}
                className="h-10 w-10 rounded-full bg-gray-700 text-white hover:bg-gray-600 flex items-center justify-center"
                title="Devices"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
            <div className="text-xs md:text-sm text-white/80 font-mono h-9 md:h-10 flex items-center">
              {formatDuration(sessionDuration)} <Volume2 className="inline-block ml-2 -mt-1" />
            </div>
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
