'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface VideoPlayerProps {
  attachmentId: number
  title?: string
  className?: string
  autoPlay?: boolean
  controls?: boolean
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
}

export default function VideoPlayer({
  attachmentId,
  title = 'Video',
  className,
  autoPlay = false,
  controls = true,
  onTimeUpdate,
  onEnded
}: VideoPlayerProps) {
  const t = useTranslations('VideoPlayer')
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout>(null)

  // Video source URL using the streaming API
  const videoSrc = `/api/attachments/${attachmentId}/stream`

  // Format time for display
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Toggle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return
    
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    if (!videoRef.current) return
    
    videoRef.current.volume = newVolume
    setVolume(newVolume)
    
    if (newVolume === 0) {
      setIsMuted(true)
      videoRef.current.muted = true
    } else if (isMuted) {
      setIsMuted(false)
      videoRef.current.muted = false
    }
  }

  // Handle seek
  const handleSeek = (value: number[]) => {
    const newTime = value[0]
    if (!videoRef.current) return
    
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Skip forward/backward
  const skip = (seconds: number) => {
    if (!videoRef.current) return
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds))
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  // Show controls temporarily
  const showControlsTemporarily = () => {
    setShowControls(true)
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }

  // Video event handlers
  const handleLoadStart = () => {
    setIsLoading(true)
    setError(null)
  }

  const handleCanPlay = () => {
    setIsLoading(false)
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime
      const total = videoRef.current.duration
      
      setCurrentTime(current)
      onTimeUpdate?.(current, total)
    }
  }

  const handlePlay = () => {
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
    setShowControls(true)
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setShowControls(true)
    onEnded?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setError('Failed to load video. Please try again.')
  }

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-black rounded-lg overflow-hidden group',
        isFullscreen ? 'fixed inset-0 z-50' : 'aspect-video',
        className
      )}
      onMouseMove={showControlsTemporarily}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false)
        }
      }}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full object-contain"
        autoPlay={autoPlay}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        onClick={togglePlay}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center text-white p-4">
            <p className="text-lg mb-2">Video Error</p>
            <p className="text-sm text-gray-300">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setError(null)
                if (videoRef.current) {
                  videoRef.current.load()
                }
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Controls */}
      {controls && (
        <div
          className={cn(
            'absolute inset-0 flex flex-col justify-end transition-opacity duration-300',
            showControls ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* Progress bar */}
          <div className="px-4 pb-2">
            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full"
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between px-4 pb-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => skip(-10)}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => skip(10)}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="h-4 w-4" />
              </Button>

              <div className="flex items-center space-x-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                
                <div className="w-20">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.1}
                    onValueChange={handleVolumeChange}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}