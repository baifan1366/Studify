import { useEffect, useRef, useState } from 'react';

interface PreloadOptions {
  enabled?: boolean;
  preloadAmount?: number; // Seconds to preload ahead
  minBufferHealth?: number; // Minimum buffer percentage before preloading
}

interface PreloadState {
  isPreloading: boolean;
  preloadProgress: number;
  bufferHealth: number;
  estimatedBandwidth: number; // bytes per second
}

/**
 * Hook for intelligent video preloading
 * Monitors buffer health and preloads content ahead of playback
 */
export function useVideoPreload(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: PreloadOptions = {}
): PreloadState {
  const {
    enabled = true,
    preloadAmount = 30, // Preload 30 seconds ahead
    minBufferHealth = 20, // Start preloading when buffer < 20%
  } = options;

  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [bufferHealth, setBufferHealth] = useState(0);
  const [estimatedBandwidth, setEstimatedBandwidth] = useState(0);

  const downloadStartTime = useRef<number>(0);
  const downloadedBytes = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    const video = videoRef.current;

    const updateBufferHealth = () => {
      if (!video.duration) return;

      const currentTime = video.currentTime;
      const buffered = video.buffered;

      // Calculate how much is buffered ahead of current position
      let bufferedAhead = 0;
      for (let i = 0; i < buffered.length; i++) {
        if (buffered.start(i) <= currentTime && buffered.end(i) > currentTime) {
          bufferedAhead = buffered.end(i) - currentTime;
          break;
        }
      }

      const health = (bufferedAhead / preloadAmount) * 100;
      setBufferHealth(Math.min(health, 100));

      // Trigger preloading if buffer health is low
      if (health < minBufferHealth && !isPreloading) {
        setIsPreloading(true);
      } else if (health >= 100) {
        setIsPreloading(false);
      }
    };

    const updatePreloadProgress = () => {
      if (!video.duration) return;

      const buffered = video.buffered;
      let totalBuffered = 0;

      for (let i = 0; i < buffered.length; i++) {
        totalBuffered += buffered.end(i) - buffered.start(i);
      }

      const progress = (totalBuffered / video.duration) * 100;
      setPreloadProgress(Math.min(progress, 100));
    };

    const estimateBandwidth = () => {
      // Estimate bandwidth based on download progress
      if (downloadStartTime.current === 0) {
        downloadStartTime.current = Date.now();
      }

      const elapsed = (Date.now() - downloadStartTime.current) / 1000; // seconds
      if (elapsed > 0) {
        const bandwidth = downloadedBytes.current / elapsed;
        setEstimatedBandwidth(bandwidth);
      }
    };

    // Event listeners
    const handleProgress = () => {
      updateBufferHealth();
      updatePreloadProgress();
      estimateBandwidth();
    };

    const handleTimeUpdate = () => {
      updateBufferHealth();
    };

    const handleLoadedData = () => {
      updatePreloadProgress();
    };

    video.addEventListener('progress', handleProgress);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadeddata', handleLoadedData);

    // Initial check
    updateBufferHealth();
    updatePreloadProgress();

    return () => {
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [enabled, videoRef, preloadAmount, minBufferHealth, isPreloading]);

  return {
    isPreloading,
    preloadProgress,
    bufferHealth,
    estimatedBandwidth,
  };
}

/**
 * Hook for adaptive bitrate selection based on network conditions
 */
export function useAdaptiveBitrate(
  estimatedBandwidth: number
): { recommendedQuality: string; shouldReduceQuality: boolean } {
  const [recommendedQuality, setRecommendedQuality] = useState('auto');
  const [shouldReduceQuality, setShouldReduceQuality] = useState(false);

  useEffect(() => {
    if (estimatedBandwidth === 0) return;

    // Bandwidth thresholds (bytes per second)
    const BANDWIDTH_1080P = 5 * 1024 * 1024; // 5 MB/s
    const BANDWIDTH_720P = 2.5 * 1024 * 1024; // 2.5 MB/s
    const BANDWIDTH_480P = 1 * 1024 * 1024; // 1 MB/s

    if (estimatedBandwidth >= BANDWIDTH_1080P) {
      setRecommendedQuality('1080p');
      setShouldReduceQuality(false);
    } else if (estimatedBandwidth >= BANDWIDTH_720P) {
      setRecommendedQuality('720p');
      setShouldReduceQuality(false);
    } else if (estimatedBandwidth >= BANDWIDTH_480P) {
      setRecommendedQuality('480p');
      setShouldReduceQuality(true);
    } else {
      setRecommendedQuality('360p');
      setShouldReduceQuality(true);
    }
  }, [estimatedBandwidth]);

  return { recommendedQuality, shouldReduceQuality };
}
