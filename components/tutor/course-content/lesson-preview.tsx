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
import MegaDocumentPreview from '@/components/attachment/mega-document-preview';
import { useAttachment } from '@/hooks/course/use-attachments';
import { VideoPreview } from '@/components/tutor/storage/video-preview';
import { PreviewAttachment } from '@/components/tutor/storage/preview-attachment';
import { ImagePreview } from '@/components/tutor/storage/storage-dialog';
import MegaImage from '@/components/attachment/mega-blob-image';

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
  const [showPreview, setShowPreview] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [embedError, setEmbedError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChapters, setShowChapters] = useState(false);

  // Get attachment details for type-based preview
  const attachmentId = lesson?.attachments?.[0];
  const { data: attachment, isLoading: attachmentLoading } = useAttachment(attachmentId);

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
      case 'assignment': return <FileText className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getKindColor = (kind: string) => {
    switch (kind) {
      case 'video': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'document': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'assignment': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Cleanup loading timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [loadingTimeout]);

  // Render video content
  const renderVideoContent = () => {
    
    // Use priority-based video source detection
    const videoSource = detectLessonVideoSource(lesson?.attachments, lesson?.content_url);

    // Check if we have any video source
    if (!videoSource) {
      console.error('❌ No video source found');
      setEmbedError(true);
      return null;
    }

    // Handle MEGA attachments with updated VideoPlayer
    if (videoSource.sourceType === 'attachment' && lesson?.attachments?.[0]) {
      const attachmentId = lesson.attachments[0]; // This is already the ID number
      
      // Use the updated VideoPlayer which handles all streaming internally
      return (
        <div className="space-y-2">
          <VideoPlayer
            attachmentId={attachmentId}
            title={lesson.title}
            className="aspect-video"
            controls={true}
            autoPlay={false}
          />
        </div>
      );
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

  // Render type-based preview using attachment type (similar to storage-dialog.tsx)
  const renderTypeBasedPreview = () => {
    if (!attachment) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <span className="ml-2 text-muted-foreground">{t('loading_attachment')}</span>
        </div>
      );
    }

    const attachmentData = {
      attachmentId: attachment.id,
      title: attachment.title,
      fileType: attachment.type
    };

    // Use same logic as storage-dialog.tsx for type-based preview
    if (attachment.type === 'video') {
      return (
        <VideoPreview 
          attachmentId={attachmentData.attachmentId}
          title={attachmentData.title}
          onClose={() => setShowPreview(false)}
        />
      );
    } else if (attachment.type === 'image') {
      return (
        <ImagePreview 
          attachmentUrl={attachment.url || ''}
          title={attachmentData.title}
          onClose={() => setShowPreview(false)}
        />
      );
    } else {
      return (
        <PreviewAttachment 
          attachmentId={attachmentData.attachmentId}
          onClose={() => setShowPreview(false)}
        />
      );
    }
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

    // Priority 1: Use attachment-based preview if we have attachments
    if (hasAttachments && attachmentId) {
      if (attachmentLoading) {
        return (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            <span className="ml-2 text-muted-foreground">{t('loading_attachment')}</span>
          </div>
        );
      }
      
      if (attachment) {
        // Use type-based preview for attachments (similar to storage-dialog.tsx)
        if (attachment.type === 'video') {
          return (
            <div className="space-y-2">
              <VideoPlayer
                attachmentId={attachment.id}
                title={attachment.title}
                className="w-full"
                controls={true}
                autoPlay={false}
              />
            </div>
          );
        } else if (attachment.type === 'image' && attachment.url) {
          // Use MegaImage for image attachments
          return (
            <div className="w-full min-h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
              <MegaImage
                megaUrl={attachment.url}
                alt={attachment.title}
                className="w-full h-auto object-contain rounded-lg max-h-[600px]"
              />
            </div>
          );
        } else {
          // Use MegaDocumentPreview for non-video, non-image attachments
          return (
            <MegaDocumentPreview
              attachmentId={attachment.id}
              className="w-full min-h-[400px]"
              showControls={true}
            />
          );
        }
      }
    }

    // Priority 2: Fallback to content_url-based preview
    if (hasContentUrl) {
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
    }
    
    // Priority 3: Fallback for content_url without attachments
    if (lesson.content_url) {
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
    }

    // Priority 4: Final fallback for unknown content
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <ExternalLink className="h-16 w-16 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium text-foreground mb-2">{t('unknownContent')}</h3>
          <p className="text-muted-foreground mb-4">{t('unknownContentDescription')}</p>
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