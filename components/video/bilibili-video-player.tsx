'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  MessageCircle,
  Send,
  MoreHorizontal,
  SkipBack,
  SkipForward,
  Subtitles,
  Languages,
  Heart,
  Share2,
  Download,
  Flag
} from 'lucide-react';

interface DanmakuMessage {
  id: string;
  text: string;
  color: string;
  size: 'small' | 'medium' | 'large';
  position: number; // 0-1 representing video progress
  timestamp: number;
  userId: string;
  username: string;
}

interface Comment {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  timestamp: number;
  likes: number;
  replies: Comment[];
  isLiked: boolean;
}

interface VideoStats {
  views: number;
  likes: number;
  dislikes: number;
  publishedAt: string;
  duration: number;
}

interface VideoPlayerProps {
  src?: string;
  attachmentId?: number; // Support MEGA attachment streaming
  title: string;
  poster?: string;
  danmakuMessages?: DanmakuMessage[];
  comments?: Comment[];
  videoStats?: VideoStats;
  currentUserLiked?: boolean;
  onDanmakuSend?: (message: string) => void;
  onCommentSend?: (content: string) => void;
  onLike?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
}

export default function BilibiliVideoPlayer({
  src,
  attachmentId,
  title,
  poster,
  danmakuMessages = [],
  comments = [],
  videoStats,
  currentUserLiked = false,
  onDanmakuSend,
  onCommentSend,
  onLike,
  onShare,
  onDownload
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const danmakuContainerRef = useRef<HTMLDivElement>(null);

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // UI state
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showDanmakuInput, setShowDanmakuInput] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [danmakuEnabled, setDanmakuEnabled] = useState(true);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);

  // Input state
  const [danmakuText, setDanmakuText] = useState('');
  const [commentText, setCommentText] = useState('');
  
  // Internationalization
  const t = useTranslations();
  
  // Helper functions
  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };
  
  const formatTimeAgo = (publishedAt: string) => {
    const now = new Date();
    const published = new Date(publishedAt);
    const diffInDays = Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24));
    return `${diffInDays}${t('VideoPlayer.days_ago')}`;
  };

  // Control visibility timer
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper functions for embed URLs
  const getYouTubeEmbedUrl = useCallback((url: string): string => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  }, []);
  
  const getVimeoEmbedUrl = useCallback((url: string): string => {
    const regex = /vimeo\.com\/(\d+)/;
    const match = url.match(regex);
    return match ? `https://player.vimeo.com/video/${match[1]}` : url;
  }, []);

  // Detect video source type and calculate appropriate source
  const videoSourceInfo = useMemo(() => {
    if (attachmentId) {
      return {
        src: `/api/attachments/${attachmentId}/stream`,
        type: 'direct',
        canPlay: true
      };
    }
    
    if (!src) {
      return {
        src: null,
        type: 'none',
        canPlay: false
      };
    }
    
    // Check if it's a YouTube URL
    if (src.includes('youtube.com') || src.includes('youtu.be')) {
      return {
        src: src,
        type: 'youtube',
        canPlay: false, // HTML video can't play YouTube directly
        embedUrl: getYouTubeEmbedUrl(src)
      };
    }
    
    // Check if it's a Vimeo URL
    if (src.includes('vimeo.com')) {
      return {
        src: src,
        type: 'vimeo',
        canPlay: false, // HTML video can't play Vimeo directly
        embedUrl: getVimeoEmbedUrl(src)
      };
    }
    
    // Check if it's a direct video file
    if (src.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
      return {
        src: src,
        type: 'direct',
        canPlay: true
      };
    }
    
    // Default: assume it's a direct URL and try to play
    return {
      src: src,
      type: 'direct',
      canPlay: true
    };
  }, [attachmentId, src, getYouTubeEmbedUrl, getVimeoEmbedUrl]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  // Video event handlers
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  const skipTime = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  }, [currentTime, duration]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipTime(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipTime(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyD':
          e.preventDefault();
          setDanmakuEnabled(!danmakuEnabled);
          break;
        case 'KeyC':
          e.preventDefault();
          setShowComments(!showComments);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipTime, handleVolumeChange, volume, toggleMute, toggleFullscreen, danmakuEnabled, showComments]);

  // Mouse movement handler
  useEffect(() => {
    const handleMouseMove = () => {
      showControlsTemporarily();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, [showControlsTemporarily]);

  // Danmaku rendering
  const renderDanmaku = () => {
    if (!danmakuEnabled || !danmakuContainerRef.current) return null;

    const currentProgress = duration > 0 ? currentTime / duration : 0;
    const visibleDanmaku = danmakuMessages.filter(msg => {
      const msgProgress = msg.position;
      return Math.abs(msgProgress - currentProgress) < 0.1; // Show danmaku within 10% of current time
    });

    return visibleDanmaku.map((msg, index) => (
      <motion.div
        key={msg.id}
        className={`absolute text-white font-bold pointer-events-none select-none ${
          msg.size === 'small' ? 'text-sm' : msg.size === 'large' ? 'text-xl' : 'text-base'
        }`}
        style={{
          color: msg.color,
          top: `${20 + (index * 40)}px`,
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
        }}
        initial={{ x: '100vw' }}
        animate={{ x: '-100%' }}
        transition={{ duration: 8, ease: 'linear' }}
      >
        {msg.text}
      </motion.div>
    ));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const sendDanmaku = () => {
    if (danmakuText.trim() && onDanmakuSend) {
      onDanmakuSend(danmakuText);
      setDanmakuText('');
      setShowDanmakuInput(false);
    }
  };

  const sendComment = () => {
    if (commentText.trim() && onCommentSend) {
      onCommentSend(commentText);
      setCommentText('');
    }
  };

  return (
    <div className="w-full bg-black">
      {/* Video Player Container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => {
          if (isPlaying) {
            setShowControls(false);
          }
        }}
      >
        {/* Video Content - Handle different video types */}
        {videoSourceInfo.type === 'youtube' && videoSourceInfo.embedUrl ? (
          <iframe
            src={videoSourceInfo.embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
          />
        ) : videoSourceInfo.type === 'vimeo' && videoSourceInfo.embedUrl ? (
          <iframe
            src={videoSourceInfo.embedUrl}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={title}
          />
        ) : videoSourceInfo.canPlay && videoSourceInfo.src ? (
          <video
            ref={videoRef}
            src={videoSourceInfo.src}
            poster={poster}
            className="w-full h-full object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={togglePlay}
          />
        ) : (
          // No video source or unsupported format
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center text-white/60">
              <Play size={64} className="mx-auto mb-4" />
              <p className="text-xl mb-2">No video content available</p>
              <p className="text-sm">{title}</p>
              {src && (
                <p className="text-xs mt-2 opacity-60">
                  Source: {videoSourceInfo.type === 'youtube' ? 'YouTube' : videoSourceInfo.type === 'vimeo' ? 'Vimeo' : 'Unknown format'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Danmaku Container */}
        <div
          ref={danmakuContainerRef}
          className="absolute inset-0 pointer-events-none overflow-hidden"
        >
          {renderDanmaku()}
        </div>

        {/* Video Controls Overlay - Only show for direct video, not for YouTube/Vimeo */}
        <AnimatePresence>
          {showControls && videoSourceInfo.type === 'direct' && videoSourceInfo.canPlay && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Top Controls */}
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
                <h2 className="text-white text-lg font-semibold truncate flex-1 mr-4">
                  {title}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDanmakuEnabled(!danmakuEnabled)}
                    className={`p-2 rounded-lg transition-colors ${
                      danmakuEnabled ? 'bg-blue-600 text-white' : 'bg-white/20 text-white/70'
                    }`}
                    title="Toggle Danmaku (D)"
                  >
                    <MessageCircle size={20} />
                  </button>
                  <button
                    onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                    className={`p-2 rounded-lg transition-colors ${
                      subtitlesEnabled ? 'bg-blue-600 text-white' : 'bg-white/20 text-white/70'
                    }`}
                    title="Toggle Subtitles"
                  >
                    <Subtitles size={20} />
                  </button>
                  <button
                    onClick={() => setAutoTranslate(!autoTranslate)}
                    className={`p-2 rounded-lg transition-colors ${
                      autoTranslate ? 'bg-blue-600 text-white' : 'bg-white/20 text-white/70'
                    }`}
                    title="Auto Translate"
                  >
                    <Languages size={20} />
                  </button>
                </div>
              </div>

              {/* Center Play Button */}
              {!isPlaying && (
                <motion.button
                  className="absolute inset-0 flex items-center justify-center"
                  onClick={togglePlay}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-6">
                    <Play size={48} className="text-white ml-2" />
                  </div>
                </motion.button>
              )}

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {/* Progress Bar */}
                <div
                  ref={progressRef}
                  className="w-full h-2 bg-white/20 rounded-full cursor-pointer mb-4 group/progress"
                  onClick={handleProgressClick}
                >
                  <div
                    className="h-full bg-blue-500 rounded-full relative"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => skipTime(-10)}
                      className="text-white hover:text-blue-400 transition-colors"
                      title="Backward 10s (←)"
                    >
                      <SkipBack size={24} />
                    </button>
                    
                    <button
                      onClick={togglePlay}
                      className="text-white hover:text-blue-400 transition-colors"
                      title="Play/Pause (Space)"
                    >
                      {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                    </button>

                    <button
                      onClick={() => skipTime(10)}
                      className="text-white hover:text-blue-400 transition-colors"
                      title="Forward 10s (→)"
                    >
                      <SkipForward size={24} />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMute}
                        className="text-white hover:text-blue-400 transition-colors"
                        title="Mute (M)"
                      >
                        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-20 h-1 bg-white/20 rounded-full appearance-none slider"
                      />
                    </div>

                    <span className="text-white text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDanmakuInput(!showDanmakuInput)}
                      className="text-white hover:text-blue-400 transition-colors"
                      title="Send Danmaku"
                    >
                      <Send size={20} />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="text-white hover:text-blue-400 transition-colors"
                        title="Settings"
                      >
                        <Settings size={20} />
                      </button>

                      {/* Settings Panel */}
                      <AnimatePresence>
                        {showSettings && (
                          <motion.div
                            className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg p-4 min-w-48"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                          >
                            <div className="space-y-3">
                              <div>
                                <label className="text-white text-sm block mb-1">{t('VideoPlayer.playback_speed')}</label>
                                <select
                                  value={playbackRate}
                                  onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                                  className="w-full bg-white/10 text-white rounded px-2 py-1 text-sm"
                                >
                                  <option value={0.5}>0.5x</option>
                                  <option value={0.75}>0.75x</option>
                                  <option value={1}>1x</option>
                                  <option value={1.25}>1.25x</option>
                                  <option value={1.5}>1.5x</option>
                                  <option value={2}>2x</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-white text-sm block mb-1">画质</label>
                                <select className="w-full bg-white/10 text-white rounded px-2 py-1 text-sm">
                                  <option>自动</option>
                                  <option>1080P</option>
                                  <option>720P</option>
                                  <option>480P</option>
                                </select>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      onClick={toggleFullscreen}
                      className="text-white hover:text-blue-400 transition-colors"
                      title="Fullscreen (F)"
                    >
                      {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Simple title overlay for YouTube/Vimeo videos */}
        {(videoSourceInfo.type === 'youtube' || videoSourceInfo.type === 'vimeo') && (
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <h2 className="text-white text-lg font-semibold">{title}</h2>
            <p className="text-white/80 text-sm">
              {videoSourceInfo.type === 'youtube' ? 'YouTube Video' : 'Vimeo Video'}
            </p>
          </div>
        )}

        {/* Danmaku Input - Only for direct videos */}
        <AnimatePresence>
          {showDanmakuInput && videoSourceInfo.type === 'direct' && (
            <motion.div
              className="absolute bottom-20 left-4 right-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 flex gap-2">
                <input
                  type="text"
                  value={danmakuText}
                  onChange={(e) => setDanmakuText(e.target.value)}
                  placeholder="发个弹幕见证当下"
                  className="flex-1 bg-white/10 text-white placeholder-white/50 rounded px-3 py-2 outline-none focus:bg-white/20"
                  onKeyPress={(e) => e.key === 'Enter' && sendDanmaku()}
                  autoFocus
                />
                <button
                  onClick={sendDanmaku}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                >
{t('VideoPlayer.send_danmaku')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Video Info and Actions */}
      <div className="bg-white dark:bg-gray-900 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              {videoStats && (
                <>
                  <span>{formatViews(videoStats.views)} {t('VideoPlayer.views_count')}</span>
                  <span>{formatTimeAgo(videoStats.publishedAt)}</span>
                  {attachmentId && <span>ID: {attachmentId}</span>}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentUserLiked 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              <Heart size={16} className={currentUserLiked ? 'fill-current' : ''} />
              <span>{t('VideoPlayer.like')} {videoStats?.likes ? `(${videoStats.likes})` : ''}</span>
            </button>
            <button 
              onClick={onShare}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors"
            >
              <Share2 size={16} />
              <span>{t('VideoPlayer.share')}</span>
            </button>
            <button 
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors"
            >
              <Download size={16} />
              <span>{t('VideoPlayer.download')}</span>
            </button>
            <button className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            className="bg-white border-t"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  {t('VideoPlayer.comments')} {videoSourceInfo.type === 'youtube' || videoSourceInfo.type === 'vimeo' ? t('VideoPlayer.external_video') : comments.length}
                </h3>
                <button
                  onClick={() => setShowComments(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  title="Hide Comments (C)"
                >
                  ×
                </button>
              </div>

              {/* Comment Input - Only for direct videos */}
              {videoSourceInfo.type === 'direct' ? (
                <div className="flex gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    U
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={t('VideoPlayer.comment_placeholder')}
                      className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-blue-500"
                      rows={3}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={sendComment}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
{t('VideoPlayer.publish')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('VideoPlayer.external_video_notice', { 
                      platform: videoSourceInfo.type === 'youtube' ? 'YouTube' : 'Vimeo' 
                    })}
                  </p>
                  {videoSourceInfo.src && (
                    <a 
                      href={videoSourceInfo.src} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                    >
{t('VideoPlayer.watch_on_platform', { 
                        platform: videoSourceInfo.type === 'youtube' ? 'YouTube' : 'Vimeo' 
                      })}
                    </a>
                  )}
                </div>
              )}

              {/* Comments List - Only show for direct videos */}
              {videoSourceInfo.type === 'direct' && (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                    <img
                      src={comment.avatar}
                      alt={comment.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{comment.username}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-900 dark:text-gray-100 mb-2">{comment.content}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <button className={`flex items-center gap-1 hover:text-blue-600 ${comment.isLiked ? 'text-blue-600' : ''}`}>
                          <Heart size={14} className={comment.isLiked ? 'fill-current' : ''} />
                          <span>{comment.likes}</span>
                        </button>
                        <button className="hover:text-blue-600">{t('VideoPlayer.reply')}</button>
                        <button className="hover:text-red-600">
                          <Flag size={14} />
                        </button>
                      </div>
                      
                      {/* Replies */}
                      {comment.replies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-gray-100 space-y-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-2">
                              <img
                                src={reply.avatar}
                                alt={reply.username}
                                className="w-6 h-6 rounded-full"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-xs">{reply.username}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(reply.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-900 dark:text-gray-100">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Help */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex flex-wrap gap-4">
          <span><kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">Space</kbd> {t('VideoPlayer.keyboard_shortcuts.play_pause')}</span>
          <span><kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">←/→</kbd> {t('VideoPlayer.keyboard_shortcuts.seek_backward_forward')}</span>
          <span><kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">↑/↓</kbd> {t('VideoPlayer.keyboard_shortcuts.volume_up_down')}</span>
          <span><kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">M</kbd> {t('VideoPlayer.keyboard_shortcuts.mute')}</span>
          <span><kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">F</kbd> {t('VideoPlayer.keyboard_shortcuts.fullscreen')}</span>
          <span><kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">D</kbd> {t('VideoPlayer.keyboard_shortcuts.toggle_danmaku')}</span>
          <span><kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">C</kbd> {t('VideoPlayer.keyboard_shortcuts.toggle_comments')}</span>
        </div>
      </div>
    </div>
  );
}
