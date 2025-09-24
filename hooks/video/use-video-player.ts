// Video Player Hook for AI Assistant Integration
import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoPlayerAPI, VideoPlayerContext } from '@/interfaces/video-player-api';

export function useVideoPlayer(): VideoPlayerContext & {
  registerPlayer: (player: VideoPlayerAPI) => void;
  unregisterPlayer: () => void;
} {
  const [player, setPlayer] = useState<VideoPlayerAPI | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const updateInterval = useRef<NodeJS.Timeout | null>(null);

  const registerPlayer = useCallback((newPlayer: VideoPlayerAPI) => {
    if (player) {
      console.warn('Video player already registered, replacing...');
    }
    
    setPlayer(newPlayer);
    setIsLoaded(true);
    
    // Set initial values
    const initialDuration = newPlayer.getDuration();
    const initialCurrentTime = newPlayer.getCurrentTime();
    const initialIsPlaying = newPlayer.isPlaying();
    
    setDuration(initialDuration);
    setCurrentTime(initialCurrentTime);
    setIsPlaying(initialIsPlaying);

    // Setup event listeners
    const handleTimeUpdate = (data: any) => {
      setCurrentTime(data.currentTime || newPlayer.getCurrentTime());
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleLoadedMetadata = () => {
      setDuration(newPlayer.getDuration());
      setIsLoaded(true);
    };

    const handleSeeked = () => {
      setCurrentTime(newPlayer.getCurrentTime());
    };

    // Register event listeners
    newPlayer.addEventListener('timeupdate', handleTimeUpdate);
    newPlayer.addEventListener('play', handlePlay);
    newPlayer.addEventListener('pause', handlePause);
    newPlayer.addEventListener('loadedmetadata', handleLoadedMetadata);
    newPlayer.addEventListener('seeked', handleSeeked);

    // Setup polling for time updates (fallback)
    updateInterval.current = setInterval(() => {
      if (newPlayer && newPlayer.isPlaying()) {
        setCurrentTime(newPlayer.getCurrentTime());
      }
    }, 1000);

    console.log('✅ Video player registered successfully');
  }, [player]);

  const unregisterPlayer = useCallback(() => {
    if (updateInterval.current) {
      clearInterval(updateInterval.current);
    }
    
    setPlayer(null);
    setIsLoaded(false);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    
    console.log('🔄 Video player unregistered');
  }, []);

  useEffect(() => {
    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, []);

  return {
    player,
    isLoaded,
    duration,
    currentTime,
    isPlaying,
    registerPlayer,
    unregisterPlayer,
  };
}

// Global video player context (singleton pattern)
let globalVideoPlayer: VideoPlayerAPI | null = null;

export const setGlobalVideoPlayer = (player: VideoPlayerAPI) => {
  globalVideoPlayer = player;
  console.log('🎬 Global video player set');
};

export const getGlobalVideoPlayer = (): VideoPlayerAPI | null => {
  return globalVideoPlayer;
};

export const clearGlobalVideoPlayer = () => {
  globalVideoPlayer = null;
  console.log('🗑️ Global video player cleared');
};
