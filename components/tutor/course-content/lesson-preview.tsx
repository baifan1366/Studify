'use client';

import React, { useState, useEffect } from 'react';
import { Play, FileText, Image, ExternalLink, Clock, BookOpen, X, Download, Maximize2, List } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { Lesson } from '@/interface/courses/lesson-interface';
import { cn } from '@/lib/utils';
import ChapterManagement from './chapter-management';
import { detectLessonVideoSource, detectAttachmentVideo } from '@/utils/attachment/video-utils';
import VideoPlayer from '@/components/ui/video-player';
import { DocumentPreview, type FileType } from '@/components/ui/document-preview';

interface LessonPreviewProps {
  lesson: Lesson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId?: number;
}

type ContentType = 'video' | 'image' | 'pdf' | 'document' | 'audio' | 'unknown';

export default function LessonPreview({ lesson, open, onOpenChange, ownerId }: LessonPreviewProps) {
  const t = useTranslations('LessonPreview');
  const [contentType, setContentType] = useState<ContentType>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [embedError, setEmbedError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [cloudinaryData, setCloudinaryData] = useState<{
    hls_url?: string;
    fallback_url?: string;
    cached?: boolean;
  } | null>(null);
  const [processingVideo, setProcessingVideo] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [processingStartTime, setProcessingStartTime] = useState<number>(0);

  // Detect content type with priority system
  const detectContentType = (lesson: Lesson): ContentType => {
    // Priority 1: Check attachments first
    if (lesson.attachments && lesson.attachments.length > 0) {
      // Assume attachments are videos (could be enhanced to check file type)
      return 'video';
    }
    
    // Priority 2: Check content_url
    if (!lesson.content_url) return 'unknown';
    
    const url = lesson.content_url;
    const urlLower = url.toLowerCase();
    
    // Check for MEGA attachments in content_url
    const attachmentInfo = detectAttachmentVideo(url);
    if (attachmentInfo?.isMegaAttachment) {
      return 'video';
    }
    
    // Video detection for external sources
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || 
        urlLower.includes('vimeo.com') || urlLower.includes('loom.com') ||
        urlLower.includes('facebook.com') || urlLower.includes('fb.watch') ||
        urlLower.match(/\.(mp4|webm|ogg|avi|mov|wmv|flv|m4v)(\?|$)/)) {
      return 'video';
    }
    
    // Image detection
    if (urlLower.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)(\?|$)/)) {
      return 'image';
    }
    
    // PDF detection
    if (urlLower.includes('.pdf') || urlLower.includes('pdf')) {
      return 'pdf';
    }
    
    // Audio detection
    if (urlLower.match(/\.(mp3|wav|ogg|aac|flac|m4a)(\?|$)/)) {
      return 'audio';
    }
    
    // Document detection
    if (urlLower.match(/\.(doc|docx|txt|rtf|odt)(\?|$)/)) {
      return 'document';
    }
    
    return 'unknown';
  };

  // Convert YouTube URL to embed format
  const getYouTubeEmbedUrl = (url: string): string => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    if (match) {
      // Add necessary parameters for proper embedding
      return `https://www.youtube.com/embed/${match[1]}?enablejsapi=1&origin=${window.location.origin}&rel=0&modestbranding=1`;
    }
    return url;
  };

  // Convert Vimeo URL to embed format
  const getVimeoEmbedUrl = (url: string): string => {
    const regex = /vimeo\.com\/(\d+)/;
    const match = url.match(regex);
    return match ? `https://player.vimeo.com/video/${match[1]}` : url;
  };

  // Convert Loom URL to embed format
  const getLoomEmbedUrl = (url: string): string => {
    const regex = /loom\.com\/share\/([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    return match ? `https://www.loom.com/embed/${match[1]}` : url;
  };

  // Convert Facebook URL to embed format
  const getFacebookEmbedUrl = (url: string): string => {
    // Facebook videos have complex URL patterns, try to extract video ID
    const fbWatchRegex = /fb\.watch\/([a-zA-Z0-9_-]+)/;
    const fbVideoRegex = /facebook\.com\/.*\/videos\/(\d+)/;
    const fbPostRegex = /facebook\.com\/.*\/posts\/(\d+)/;
    
    let match = url.match(fbWatchRegex);
    if (match) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=560`;
    }
    
    match = url.match(fbVideoRegex);
    if (match) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=560`;
    }
    
    match = url.match(fbPostRegex);
    if (match) {
      return `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=false&width=560`;
    }
    
    // Fallback: try generic Facebook embed
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=560`;
  };

  // Get proper embed URL for videos
  const getEmbedUrl = (url: string, type: ContentType): string => {
    if (type !== 'video') return url;
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return getYouTubeEmbedUrl(url);
    }
    if (url.includes('vimeo.com')) {
      return getVimeoEmbedUrl(url);
    }
    if (url.includes('loom.com')) {
      return getLoomEmbedUrl(url);
    }
    if (url.includes('facebook.com') || url.includes('fb.watch')) {
      return getFacebookEmbedUrl(url);
    }
    
    return url;
  };

  useEffect(() => {
    if (lesson) {
      const detectedType = detectContentType(lesson);
      setContentType(detectedType);
      setError(null);
      setEmbedError(false);
      // Reset loading states when lesson changes
      setIsLoading(false);
      setLoadingProgress(0);
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }
    }
  }, [lesson?.attachments, lesson?.content_url, loadingTimeout]);

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTypeIcon = (kind: string) => {
    switch (kind) {
      case 'video': return <Play className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'live': return <Play className="h-4 w-4" />;
      case 'quiz': return <BookOpen className="h-4 w-4" />;
      case 'assignment': return <FileText className="h-4 w-4" />;
      case 'whiteboard': return <FileText className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getKindColor = (kind: string) => {
    switch (kind) {
      case 'video': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'live': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'document': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'quiz': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'assignment': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'whiteboard': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Calculate exponential backoff delay
  const getRetryDelay = (attempt: number): number => {
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
  };

  // Estimate processing time based on file size
  const estimateProcessingTime = (sizeBytes?: number): number => {
    if (!sizeBytes) return 60; // Default 1 minute
    const sizeMB = sizeBytes / (1024 * 1024);
    // Rough estimate: 10 seconds per MB + 30 seconds base time
    return Math.max(30, Math.ceil(sizeMB * 10 + 30));
  };

  // Fetch Cloudinary HLS URL for MEGA videos with retry logic
  const fetchCloudinaryUrl = async (attachmentId: number, attempt: number = 0) => {
    
    if (!attachmentId || attachmentId === undefined) {
      console.error('❌ Invalid attachment ID:', attachmentId);
      setError('Invalid attachment ID');
      return;
    }
    
    setProcessingVideo(true);
    setRetryCount(attempt);
    
    if (attempt === 0) {
      setProcessingStartTime(Date.now());

      // Use default estimate since we only have attachment IDs, not full attachment objects
      // The actual file size would need to be fetched from the database if needed for estimation
      setEstimatedTime(60); // Default estimate
    }
    
    try {
      setProcessingStage(attempt === 0 ? 'Initializing video processing...' : `Retrying... (attempt ${attempt + 1})`);
      
      const url = `/api/video/preview?attachmentId=${attachmentId}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '3600', 10);
        throw new Error(`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`);
      }
      
      // Handle processing in progress
      if (response.status === 202 && data.processing) {
        setProcessingStage('Video is being processed by another request...');
        const retryAfter = parseInt(response.headers.get('retry-after') || '300', 10);
        
        if (attempt < 3) {
          const delay = Math.max(retryAfter * 1000, getRetryDelay(attempt));
          setRetryTimeout(setTimeout(() => {
            fetchCloudinaryUrl(attachmentId, attempt + 1);
          }, delay));
          return;
        } else {
          throw new Error('Video processing is taking longer than expected. Please try again later.');
        }
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process video');
      }
      
      setProcessingStage('Processing completed successfully!');
      const newCloudinaryData = {
        hls_url: data.hls_url,
        fallback_url: data.fallback_url,
        cached: data.cached,
      };
      setCloudinaryData(newCloudinaryData);
      
      // Stop processing since we got the data successfully
      setProcessingVideo(false);
      setProcessingStage('');
      
    } catch (error) {
      console.error('❌ Cloudinary processing failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Video processing failed';
      
      // Implement retry logic with exponential backoff
      if (attempt < 3 && !errorMessage.includes('Rate limit') && !errorMessage.includes('Access denied')) {
        const delay = getRetryDelay(attempt);
        setProcessingStage(`Processing failed. Retrying in ${Math.ceil(delay / 1000)} seconds...`);
        
        setRetryTimeout(setTimeout(() => {
          fetchCloudinaryUrl(attachmentId, attempt + 1);
        }, delay));
        return;
      }
      
      // Final fallback: try direct MEGA streaming
      if (attempt >= 3) {
        setProcessingStage('Falling back to direct streaming...');
        setError('Video processing failed. Attempting direct streaming as fallback.');
        // Note: Direct MEGA streaming would need to be implemented in the streaming API
      } else {
        setError(errorMessage);
      }
    } finally {
      if (attempt >= 3 || cloudinaryData) {
        setProcessingVideo(false);
        setProcessingStage('');
      }
    }
  };

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [retryTimeout]);

  // Render video content with Cloudinary HLS streaming
  const renderVideoContent = () => {
    
    // Use priority-based video source detection
    const videoSource = detectLessonVideoSource(lesson?.attachments, lesson?.content_url);

    // Check if we have any video source
    if (!videoSource) {
      console.error('❌ No video source found');
      setEmbedError(true);
      return null;
    }

    // Handle MEGA attachments with Cloudinary processing
    if (videoSource.sourceType === 'attachment' && lesson?.attachments?.[0]) {
      const attachmentId = lesson.attachments[0]; // This is already the ID number
      
      // If we don't have Cloudinary data yet, fetch it
      if (!cloudinaryData && !processingVideo) {
        fetchCloudinaryUrl(attachmentId);
        return (
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
            <div className="text-center text-white space-y-4 max-w-md">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto"></div>
              <div className="space-y-3">
                <p className="text-lg font-medium">{t('processing_video')}</p>
                {processingStage && (
                  <p className="text-sm opacity-90 font-medium">{processingStage}</p>
                )}
                {estimatedTime > 0 && processingStartTime > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs opacity-70">
                      {t('estimated_time')}: {Math.ceil(estimatedTime / 60)} {t('minutes')}
                    </p>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(100, ((Date.now() - processingStartTime) / (estimatedTime * 1000)) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
                {retryCount > 0 && (
                  <p className="text-xs opacity-70">{t('retry_attempt')}: {retryCount + 1}/4</p>
                )}
                <p className="text-xs opacity-60">{t('large_files_may_take_several_minutes_to_process')}</p>
              </div>
            </div>
          </div>
        );
      }
      
      // Show processing state
      if (processingVideo) {
        return (
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
            <div className="text-center text-white space-y-4 max-w-md">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto"></div>
              <div className="space-y-3">
                <p className="text-lg font-medium">{t('processing_video')}</p>
                {processingStage && (
                  <p className="text-sm opacity-90 font-medium">{processingStage}</p>
                )}
                {estimatedTime > 0 && processingStartTime > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs opacity-70">
                      {t('estimated_time')}: {Math.ceil(estimatedTime / 60)} {t('minutes')}
                    </p>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(100, ((Date.now() - processingStartTime) / (estimatedTime * 1000)) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
                {retryCount > 0 && (
                  <p className="text-xs opacity-70">{t('retry_attempt')}: {retryCount + 1}/4</p>
                )}
                <p className="text-xs opacity-60">{t('converting_to_hls_streaming_format')}</p>
              </div>
            </div>
          </div>
        );
      }
      
      // Use Cloudinary HLS streaming if available
      if (cloudinaryData?.hls_url) {
        return (
          <div className="space-y-2">
            <VideoPlayer
              hlsSrc={cloudinaryData.hls_url}
              src={cloudinaryData.fallback_url}
              className="aspect-video"
              onError={(error) => {
                console.error('🎬 VideoPlayer error:', error);
                setError(`VideoPlayer error: ${error}`);
              }}
              onLoadStart={() => {
                // Only set loading if we don't already have cloudinary data loaded
                if (!cloudinaryData?.hls_url) {
                  setIsLoading(true);
                }
              }}
              onCanPlay={() => {
                setIsLoading(false);
              }}
            />
            {cloudinaryData.cached && (
              <div className="text-xs text-muted-foreground text-center">
                ✓ {t('using_cached_hls_stream')}
              </div>
            )}
            {!cloudinaryData.cached && processingStartTime > 0 && (
              <div className="text-xs text-muted-foreground text-center">
                ✓ {t('processed_in')} {Math.ceil((Date.now() - processingStartTime) / 1000)} {t('seconds')}
              </div>
            )}
          </div>
        );
      } 
    }

    // Error fallback UI
    if (embedError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-muted/30 rounded-lg">
          <Play className="h-16 w-16 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-medium text-foreground mb-2">{t('videoEmbedError')}</h3>
            <p className="text-muted-foreground mb-4">{t('videoEmbedErrorDescription')}</p>
            <Button
              variant="outline"
              onClick={() => window.open(lesson?.content_url as string, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {t('openLink')}
            </Button>
          </div>
        </div>
      );
    }

    // Handle MEGA content_url with Cloudinary processing
    if (videoSource.sourceType === 'content_url' && videoSource.isMegaAttachment) {
      // For content_url MEGA videos, show message to use attachments system
      return (
        <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
          <div className="text-center text-white space-y-4">
            <Play className="h-16 w-16 mx-auto opacity-50" />
            <div>
              <p className="text-lg font-medium">{t('megaVideoDetected')}</p>
              <p className="text-sm opacity-80">{t('pleaseUseAttachmentsSystemForOptimalStreaming')}</p>
              <p className="text-xs opacity-60 mt-2">{t('directMegaUrlsAreNoLongerSupportedForSecurityReasons')}</p>
            </div>
          </div>
        </div>
      );
    }

    // Handle third-party URLs (YouTube, Vimeo, etc.)
    if (videoSource.sourceType === 'content_url' && !videoSource.isMegaAttachment) {
      const videoSrc = videoSource.videoSrc!;
      
      // For third-party videos, use the original embed approach
      return renderThirdPartyVideo(videoSrc);
    }

    console.error('❌ Invalid video source configuration');
    setEmbedError(true);
    return null;
  };

  // Render third-party video content (YouTube, Vimeo, etc.)
  const renderThirdPartyVideo = (videoSrc: string) => {

    // Check for iframe-based embedding (YouTube, Vimeo, etc.)
    const embedUrl = getEmbedUrl(videoSrc, 'video');
    
    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={() => {
            console.error('❌ Iframe embed error:', embedUrl);
            setEmbedError(true);
          }}
        />
      </div>
    );
  };

  const renderContent = () => {
    // Check if we have any content source (attachments or content_url)
    const hasAttachments = lesson?.attachments && lesson.attachments.length > 0;
    const hasContentUrl = lesson?.content_url;
    
    if (!hasAttachments && !hasContentUrl) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">{t('noContent')}</h3>
          <p className="text-muted-foreground">{t('noContentDescription')}</p>
        </div>
      );
    }

    // Handle video content with existing video logic
    if (contentType === 'video') {
      return renderVideoContent();
    }

    // Handle audio content (keep existing logic)
    if (contentType === 'audio') {
      return (
        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-6">
            <audio
              controls
              className="w-full"
              src={lesson.content_url}
            >
              {t('audioNotSupported')}
            </audio>
          </div>
        </div>
      );
    }

    // For all other content types, use the DocumentPreview component
    if (lesson.content_url) {
      const attachmentId = hasAttachments ? lesson.attachments?.[0] : undefined;
      
      return (
        <DocumentPreview
          url={lesson.content_url}
          fileType={lesson.kind as FileType}
          attachmentId={attachmentId}
          onDownload={() => {
            const link = document.createElement('a');
            link.href = lesson.content_url as string;
            link.download = lesson.title;
            link.click();
          }}
          showControls={true}
        />
      );
    }

    // Fallback for unknown content
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <ExternalLink className="h-16 w-16 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium text-foreground mb-2">{t('externalContent')}</h3>
          <p className="text-muted-foreground mb-4">{t('externalContentDescription')}</p>
          <Button
            variant="outline"
            onClick={() => window.open(lesson.content_url, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            {t('openLink')}
          </Button>
        </div>
      </div>
    );
  };

  if (!lesson) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <DialogTitle className="text-xl font-semibold pr-8">
                  {lesson.title}
                </DialogTitle>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className={cn("gap-1", getKindColor(lesson.kind))}>
                    {getTypeIcon(lesson.kind)}
                    {t(lesson.kind)}
                  </Badge>
                  {lesson.duration_sec && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(lesson.duration_sec)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogDescription className="sr-only">
              {t('previewDescription', { title: lesson.title })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
            
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="aspect-video w-full" />
                <div className="flex justify-center">
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            ) : (
              renderContent()
            )}

            {/* Chapter Management - Always available for video lessons */}
            {lesson.kind === 'video' && (
              <ChapterManagement 
                lessonId={lesson.id} 
                ownerId={ownerId}
                className="mt-4"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen overlay for videos */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black z-40" onClick={() => setIsFullscreen(false)} />
      )}
    </>
  );
}