'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src?: string;
  hlsSrc?: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  onError?: (error: string) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export default function VideoPlayer({
  src,
  hlsSrc,
  poster,
  className,
  autoPlay = false,
  controls = true,
  onLoadStart,
  onCanPlay,
  onError,
  onTimeUpdate,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hlsSupported, setHlsSupported] = useState<boolean | null>(null); // null = checking, false = not supported, true = supported
  const [activeSource, setActiveSource] = useState<'hls' | 'mp4' | null>(null);

  // Check HLS support and load HLS.js if needed
  useEffect(() => {
    const checkHlsSupport = async () => {
      const video = videoRef.current;
      if (!video) {
        return;
      }

      // Check native HLS support (Safari)
      const nativeSupport = video.canPlayType('application/vnd.apple.mpegurl');
      if (nativeSupport) {
        setHlsSupported(true);
        return;
      }

      // Check if HLS.js can be used
      if (typeof window !== 'undefined') {
        try {
          const { default: Hls } = await import('hls.js');
          
          const isSupported = Hls.isSupported();
          
          if (isSupported) {
            setHlsSupported(true);
          } else {
            console.warn('🎬 HLS.js not supported in this browser');
            setHlsSupported(false);
          }
        } catch (error) {
          console.error('🎬 Failed to load HLS.js:', error);
          setHlsSupported(false);
        }
      } else {
        console.warn('🎬 Window not available for HLS.js check');
        setHlsSupported(false);
      }
    };

    checkHlsSupport();
  }, []);

  // Initialize video source
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const initializeVideo = async () => {
      setIsLoading(true);
      setError(null);
      onLoadStart?.();

      try {
        // Priority 1: Try HLS if available and supported
        if (hlsSrc && hlsSupported === true) {
          await loadHlsSource(hlsSrc);
          setActiveSource('hls');
        
        // Check video element and try to play
        setTimeout(() => {
          const videoElement = videoRef.current;
          if (videoElement) {
            const rect = videoElement.getBoundingClientRect();
            
            // Try to trigger play to see if video appears
            if (videoElement.paused) {
              videoElement.play().then(() => {
              }).catch(error => {
                console.error('🎬 Video play failed:', error);
              });
            }
          }
        }, 2000);
        
        return;
        }

        // Priority 2: Fallback to MP4
        if (src) {
          video.src = src;
          setActiveSource('mp4');
          return;
        }

        // Priority 3: Try HLS as direct source (fallback for unsupported browsers)
        if (hlsSrc && hlsSupported === false) {
          video.src = hlsSrc;
          setActiveSource('hls');
          return;
        }

        throw new Error('No compatible video source available');

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load video';
        console.error('🎬 Video initialization failed:', errorMessage);
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    // Only initialize video after HLS support check is complete
    if ((hlsSrc || src) && hlsSupported !== null) {
      initializeVideo();
    }

    return () => {
      // Cleanup HLS instance if exists
      if ((video as any).hls) {
        (video as any).hls.destroy();
      }
    };
  }, [hlsSrc, src, hlsSupported]);

  // Load HLS source
  const loadHlsSource = async (hlsUrl: string): Promise<void> => {
    const video = videoRef.current;
    if (!video) throw new Error('Video element not available');

    // First, test if the HLS URL is accessible
    try {
      const response = await fetch(hlsUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`HLS URL not accessible: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('🎬 HLS URL accessibility test failed:', error);
      throw new Error(`HLS URL not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Native HLS support (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      return new Promise((resolve, reject) => {
        const handleCanPlay = () => {
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('error', handleError);
          resolve();
        };
        const handleError = (e: Event) => {
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('error', handleError);
          console.error('🎬 Native HLS error:', e);
          reject(new Error('Failed to load HLS stream natively'));
        };
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);
      });
    }

    // HLS.js support
    const { default: Hls } = await import('hls.js');
    if (!Hls.isSupported()) {
      throw new Error('HLS not supported in this browser');
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90,
      debug: true, // Enable debug for troubleshooting
    });

    hls.loadSource(hlsUrl);
    hls.attachMedia(video);

    // Store HLS instance for cleanup
    (video as any).hls = hls;

    return new Promise((resolve, reject) => {
      let resolved = false;

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('🎬 HLS error:', data);
        console.error('🎬 HLS error details:', {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          reason: data.reason,
          response: data.response
        });
        
        if (data.fatal && !resolved) {
          resolved = true;
          reject(new Error(`HLS fatal error: ${data.details || data.type} - ${data.reason || 'Unknown reason'}`));
        }
      });

      // Reduce timeout to 10 seconds for faster fallback
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('🎬 HLS loading timeout after 10 seconds');
          reject(new Error('HLS loading timeout after 10 seconds'));
        }
      }, 10000);
    });
  };

  // Video event handlers
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      onCanPlay?.();
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime, video.duration);
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const handleError = () => {
    const video = videoRef.current;
    if (video?.error) {
      const errorMessage = `Video error: ${video.error.message}`;
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  // Control handlers
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(error => {
        console.error('Play failed:', error);
        setError('Failed to play video');
      });
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = value[0];
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const retry = () => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setIsLoading(true);
    video.load();
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className={cn("relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center", className)}>
        <div className="text-center text-white space-y-4">
          <div className="text-red-400 text-lg">Video Error</div>
          <div className="text-sm opacity-80">{error}</div>
          <Button variant="outline" size="sm" onClick={retry} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative bg-black rounded-lg overflow-hidden group", className)}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        autoPlay={autoPlay}
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
        onLoadStart={() => {
          // Don't override loading state if we're already successfully loaded
          if (!activeSource) {
            setIsLoading(true);
          }
        }}
        onCanPlay={() => {
          setIsLoading(false);
        }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <div className="text-sm">
              Loading {activeSource === 'hls' ? 'HLS stream' : 'video'}...
            </div>
          </div>
        </div>
      )}

      {/* Custom controls */}
      {controls && !isLoading && !error && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Progress bar */}
          <div className="mb-3">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>

              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                />
              </div>

              <div className="text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              {activeSource && (
                <div className="text-xs opacity-60 ml-2">
                  {activeSource.toUpperCase()}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Click to play overlay */}
      {!isPlaying && !isLoading && !error && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="bg-black/50 rounded-full p-4 hover:bg-black/70 transition-colors">
            <Play className="h-12 w-12 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
