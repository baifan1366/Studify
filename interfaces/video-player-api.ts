// Video Player API Interface for AI Assistant Integration
export interface VideoPlayerAPI {
  /**
   * Seek to specific timestamp in seconds
   * @param timestamp - Time in seconds to seek to
   */
  seekTo(timestamp: number): Promise<void>;
  
  /**
   * Get current playback time in seconds
   * @returns Current timestamp
   */
  getCurrentTime(): number;
  
  /**
   * Start or resume video playback
   */
  play(): Promise<void>;
  
  /**
   * Pause video playback
   */
  pause(): Promise<void>;
  
  /**
   * Get video duration in seconds
   * @returns Total video duration
   */
  getDuration(): number;
  
  /**
   * Check if video is currently playing
   * @returns True if playing, false if paused
   */
  isPlaying(): boolean;
  
  /**
   * Set playback speed
   * @param speed - Playback speed (0.5, 1.0, 1.25, 1.5, 2.0)
   */
  setPlaybackSpeed(speed: number): void;
  
  /**
   * Get current playback speed
   * @returns Current playback speed
   */
  getPlaybackSpeed(): number;
  
  /**
   * Register event listeners
   */
  addEventListener(event: VideoPlayerEvent, callback: (data: any) => void): void;
  removeEventListener(event: VideoPlayerEvent, callback: (data: any) => void): void;
}

export type VideoPlayerEvent = 
  | 'play'
  | 'pause' 
  | 'timeupdate'
  | 'ended'
  | 'loadedmetadata'
  | 'error'
  | 'seeked';

export interface VideoPlayerContext {
  player: VideoPlayerAPI | null;
  isLoaded: boolean;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
}

// Hook for video player integration
export interface UseVideoPlayerHook {
  (): VideoPlayerContext;
}
