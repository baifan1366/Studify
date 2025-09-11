'use client';

import { useState, useEffect } from 'react';
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

interface LessonPreviewProps {
  lesson: Lesson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ContentType = 'video' | 'image' | 'pdf' | 'document' | 'audio' | 'unknown';

export default function LessonPreview({ lesson, open, onOpenChange }: LessonPreviewProps) {
  const t = useTranslations('LessonPreview');
  const [contentType, setContentType] = useState<ContentType>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embedError, setEmbedError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChapters, setShowChapters] = useState(false);

  // Detect content type from URL
  const detectContentType = (url: string): ContentType => {
    if (!url) return 'unknown';
    
    const urlLower = url.toLowerCase();
    
    // Video detection
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
    if (lesson?.content_url) {
      setContentType(detectContentType(lesson.content_url));
      setError(null);
      setEmbedError(false);
    }
  }, [lesson?.content_url]);

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

  const renderContent = () => {
    if (!lesson?.content_url) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">{t('noContent')}</h3>
          <p className="text-muted-foreground">{t('noContentDescription')}</p>
        </div>
      );
    }

    const embedUrl = getEmbedUrl(lesson.content_url, contentType);

    switch (contentType) {
      case 'video':
        if (embedError) {
          return (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-muted/30 rounded-lg">
              <Play className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">{t('videoEmbedError')}</h3>
                <p className="text-muted-foreground mb-4">{t('videoEmbedErrorDescription')}</p>
                <Button
                  variant="outline"
                  onClick={() => window.open(lesson.content_url, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('watchOnYoutube')}
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div className={cn(
            "relative bg-black rounded-lg overflow-hidden",
            isFullscreen ? "fixed inset-0 z-50" : "aspect-video"
          )}>
            <iframe
              src={embedUrl}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
              title={lesson.title}
              onError={() => setEmbedError(true)}
              onLoad={(e) => {
                // Check if iframe content loaded successfully
                try {
                  const iframe = e.target as HTMLIFrameElement;
                  if (iframe.contentDocument === null) {
                    setEmbedError(true);
                  }
                } catch (error) {
                  // Cross-origin restrictions prevent access, but this is normal for YouTube embeds
                  // We'll rely on the onError handler for actual errors
                }
              }}
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setShowChapters(!showChapters)}
                title={t('chapters')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
              >
                {isFullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="relative">
            <img
              src={lesson.content_url}
              alt={lesson.title}
              className="w-full h-auto max-h-96 object-contain rounded-lg bg-muted"
              onError={() => setError(t('imageLoadError'))}
            />
          </div>
        );

      case 'pdf':
        return (
          <div className="space-y-4">
            <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden border">
              <iframe
                src={`${lesson.content_url}#toolbar=0&navpanes=0&scrollbar=0`}
                className="w-full h-full"
                title={lesson.title}
                onError={() => setError(t('pdfLoadError'))}
              />
            </div>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(lesson.content_url, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {t('openInNewTab')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = lesson.content_url ? lesson.content_url as string : '';
                  link.download = lesson.title + '.pdf';
                  link.click();
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {t('downloadPdf')}
              </Button>
            </div>
          </div>
        );

      case 'audio':
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

      case 'document':
        // Try to preview common document formats
        const isGoogleDoc = lesson.content_url.includes('docs.google.com');
        const isOfficeDoc = lesson.content_url.includes('office.com') || lesson.content_url.includes('sharepoint.com');
        const canPreview = isGoogleDoc || isOfficeDoc || lesson.content_url.toLowerCase().includes('.pdf');
        
        if (canPreview) {
          let previewUrl = lesson.content_url;
          
          // Convert Google Docs to preview mode
          if (isGoogleDoc && !lesson.content_url.includes('/preview')) {
            previewUrl = lesson.content_url.replace('/edit', '/preview').replace('/view', '/preview');
            if (!previewUrl.includes('/preview')) {
              previewUrl += '/preview';
            }
          }
          
          // Office documents can often be previewed directly
          if (isOfficeDoc && !lesson.content_url.includes('embed=1')) {
            previewUrl += (lesson.content_url.includes('?') ? '&' : '?') + 'embed=1';
          }
          
          return (
            <div className="space-y-4">
              <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden border">
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  title={lesson.title}
                  onError={() => setError(t('documentLoadError'))}
                />
              </div>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(lesson.content_url, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('openInNewTab')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = lesson.content_url ? lesson.content_url as string : '';
                    link.download = lesson.title;
                    link.click();
                  }}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t('downloadDocument')}
                </Button>
              </div>
            </div>
          );
        }
        
        // Fallback for non-previewable documents
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">{t('documentPreview')}</h3>
              <p className="text-muted-foreground mb-4">{t('documentPreviewDescription')}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(lesson.content_url, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('openDocument')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = lesson.content_url ? lesson.content_url as string : '';
                    link.download = lesson.title;
                    link.click();
                  }}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t('downloadDocument')}
                </Button>
              </div>
            </div>
          </div>
        );

      default:
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

            {/* Chapters panel for video lessons */}
            {lesson.kind === 'video' && showChapters && (
              <div className="bg-muted/50 rounded-lg p-4 border">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <List className="h-4 w-4" />
                  {t('chapters')}
                </h3>
                <div className="space-y-2">
                  {/* Sample chapters - in a real implementation, these would come from the lesson data */}
                  <div className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground">00:00</span>
                      <span className="text-sm">{t('introduction')}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground">02:30</span>
                      <span className="text-sm">{t('mainContent')}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground">08:15</span>
                      <span className="text-sm">{t('summary')}</span>
                    </div>
                  </div>
                </div>
              </div>
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