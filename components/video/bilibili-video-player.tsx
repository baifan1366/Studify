"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useTranslations } from "next-intl";
import {
  useVideoLikes,
  useToggleVideoLike,
  useVideoDanmaku,
  useSendDanmaku,
  useVideoComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useToggleCommentLike,
  useTrackVideoView,
  type VideoStats as VideoStatsType,
} from "@/hooks/video/use-video-interactions";
import { useUser } from "@/hooks/profile/use-user";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  useVideoQAPanel,
  useVideoTermsTooltip,
  useVideoTerms,
} from "@/hooks/video/use-video-qa";
import { useCourseNotes } from "@/hooks/course/use-course-notes";
import { VideoQAPanel } from "./video-qa-panel";
import { VideoTermsTooltip, VideoTermsIndicator } from "./video-terms-tooltip";
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
  Flag,
  Edit,
  Trash2,
  MoreVertical,
  Check,
  X,
  Loader2,
  Bot,
  GraduationCap,
  BookOpen,
  Clock,
  Eye,
  Activity,
} from "lucide-react";
import MegaImage from "@/components/attachment/mega-blob-image";
import { setGlobalVideoPlayer, clearGlobalVideoPlayer } from "@/hooks/video/use-video-player";
import type { VideoPlayerAPI } from "@/interfaces/video-player-api";
import Hls from "hls.js";

interface DanmakuMessage {
  id: string;
  text: string;
  color: string;
  size: "small" | "medium" | "large";
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

interface VideoChapter {
  id: string;
  title: string;
  startTime: number; // in seconds
  endTime?: number; // in seconds, optional (will be calculated from next chapter)
  thumbnail?: string; // optional chapter thumbnail
}

interface VideoPlayerProps {
  src?: string;
  attachmentId?: number; // Support MEGA attachment streaming
  lessonId: string; // Required for API calls
  title: string;
  poster?: string;
  initialTime?: number;
  videoDuration?: number; // Optional duration for YouTube/Vimeo videos
  transcript?: string; // Video transcript/subtitles
  chapters?: VideoChapter[]; // Video chapters for navigation
  // Legacy props for backward compatibility - will be replaced by API data
  danmakuMessages?: DanmakuMessage[];
  comments?: Comment[];
  videoStats?: VideoStatsType;
  currentUserLiked?: boolean;
  // Callbacks
  onTimeUpdate?: (time: number, duration?: number) => void;
  onShare?: () => void;
  onDownload?: () => void;
}

// Helper component to render avatar with MEGA support
function UserAvatar({ 
  avatarUrl, 
  username, 
  size = "w-8 h-8" 
}: { 
  avatarUrl: string; 
  username: string; 
  size?: string;
}) {
  const isMegaUrl = avatarUrl && (
    avatarUrl.includes('mega.nz') || 
    avatarUrl.includes('mega.co.nz') || 
    avatarUrl.includes('mega.io')
  );
  
  const [imageError, setImageError] = useState(false);
  
  // Show fallback if no valid avatar or error occurred
  if (!avatarUrl || avatarUrl === "/default-avatar.png" || imageError) {
    return (
      <div
        className={`${size} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}
      >
        {username?.[0]?.toUpperCase() || "U"}
      </div>
    );
  }
  
  // Use MegaImage for MEGA URLs
  if (isMegaUrl) {
    return (
      <MegaImage
        megaUrl={avatarUrl}
        alt={username}
        className={`${size} rounded-full object-cover flex-shrink-0`}
        onError={() => setImageError(true)}
      />
    );
  }
  
  // Use regular img for other URLs
  return (
    <img
      src={avatarUrl}
      alt={username}
      className={`${size} rounded-full object-cover flex-shrink-0`}
      onError={() => setImageError(true)}
    />
  );
}

export default function BilibiliVideoPlayer({
  src,
  attachmentId,
  lessonId,
  title,
  poster,
  initialTime = 0,
  videoDuration,
  transcript,
  chapters = [],
  danmakuMessages = [],
  comments = [],
  videoStats,
  currentUserLiked = false,
  onTimeUpdate,
  onShare,
  onDownload,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const danmakuContainerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [bufferedRanges, setBufferedRanges] = useState<TimeRanges | null>(null);
  const [qualityLevels, setQualityLevels] = useState<Array<{index: number, height: number, bitrate: number}>>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = auto
  const [hlsStats, setHlsStats] = useState<{
    bandwidth: number;
    droppedFrames: number;
    bufferLength: number;
  }>({ bandwidth: 0, droppedFrames: 0, bufferLength: 0 });
  
  // Subtitle state
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");
  const [parsedSubtitles, setParsedSubtitles] = useState<Array<{start: number, end: number, text: string}>>([]);

  // UI state
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showDanmakuInput, setShowDanmakuInput] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [danmakuEnabled, setDanmakuEnabled] = useState(true);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [showStats, setShowStats] = useState(false); // Advanced stats panel
  const [showChapters, setShowChapters] = useState(false); // Chapters panel

  // Input state
  const [danmakuText, setDanmakuText] = useState("");
  const [commentText, setCommentText] = useState("");

  // AI QA and Terms functionality
  const qaPanel = useVideoQAPanel();
  const termsTooltip = useVideoTermsTooltip();
  const [showNotes, setShowNotes] = useState(false);
  const [showNotesSidebar, setShowNotesSidebar] = useState(false); // Auto-show sidebar when notes are nearby
  const [autoShowNotesSidebar, setAutoShowNotesSidebar] = useState(true); // Auto-show preference

  // Fetch terms for current time (update every 15 seconds)
  const { data: termsData } = useVideoTerms(
    lessonId || "",
    currentTime,
    !!lessonId && currentTime > 0
  );

  // Fetch course notes for this lesson
  const { data: courseNotes = [] } = useCourseNotes(
    lessonId ? parseInt(lessonId) : undefined
  );

  // Get notes near current time (within 30 seconds)
  const nearbyNotes = useMemo(() => {
    if (!courseNotes || courseNotes.length === 0) return [];
    
    return courseNotes.filter(note => {
      if (!note.timestampSec) return false;
      const timeDiff = Math.abs(note.timestampSec - currentTime);
      return timeDiff <= 30; // Show notes within 30 seconds
    }).sort((a, b) => {
      // Sort by proximity to current time
      const diffA = Math.abs((a.timestampSec || 0) - currentTime);
      const diffB = Math.abs((b.timestampSec || 0) - currentTime);
      return diffA - diffB;
    });
  }, [courseNotes, currentTime]);

  // Auto-show notes sidebar when notes are nearby
  useEffect(() => {
    if (autoShowNotesSidebar && nearbyNotes.length > 0 && !showNotesSidebar) {
      setShowNotesSidebar(true);
    }
  }, [nearbyNotes.length, autoShowNotesSidebar, showNotesSidebar]);

  // Internationalization
  const t = useTranslations();

  // Parse transcript into subtitle segments
  useEffect(() => {
    if (!transcript || !subtitlesEnabled) {
      setParsedSubtitles([]);
      setCurrentSubtitle("");
      return;
    }

    // Simple parser: split by newlines and timestamps
    // Format: [00:00:00] Text or just plain text
    const lines = transcript.split('\n').filter(line => line.trim());
    const subtitles: Array<{start: number, end: number, text: string}> = [];
    
    lines.forEach((line, index) => {
      // Try to parse timestamp format [HH:MM:SS] or [MM:SS]
      const timestampMatch = line.match(/^\[(\d{1,2}):(\d{2}):(\d{2})\](.+)$/) || 
                            line.match(/^\[(\d{1,2}):(\d{2})\](.+)$/);
      
      if (timestampMatch) {
        let start: number;
        let text: string;
        
        if (timestampMatch.length === 5) {
          // [HH:MM:SS] format
          const hours = parseInt(timestampMatch[1]);
          const minutes = parseInt(timestampMatch[2]);
          const seconds = parseInt(timestampMatch[3]);
          start = hours * 3600 + minutes * 60 + seconds;
          text = timestampMatch[4].trim();
        } else {
          // [MM:SS] format
          const minutes = parseInt(timestampMatch[1]);
          const seconds = parseInt(timestampMatch[2]);
          start = minutes * 60 + seconds;
          text = timestampMatch[3].trim();
        }
        
        // End time is the start of next subtitle or +5 seconds
        const end = index < lines.length - 1 ? start + 5 : start + 10;
        
        subtitles.push({ start, end, text });
      } else if (line.trim()) {
        // Plain text without timestamp - show for 5 seconds from current position
        const start = index * 5;
        const end = start + 5;
        subtitles.push({ start, end, text: line.trim() });
      }
    });
    
    setParsedSubtitles(subtitles);
  }, [transcript, subtitlesEnabled]);

  // Update current subtitle based on video time
  useEffect(() => {
    if (!subtitlesEnabled || parsedSubtitles.length === 0) {
      setCurrentSubtitle("");
      return;
    }

    const currentSub = parsedSubtitles.find(
      sub => currentTime >= sub.start && currentTime <= sub.end
    );
    
    setCurrentSubtitle(currentSub?.text || "");
  }, [currentTime, parsedSubtitles, subtitlesEnabled]);

  // API hooks for real data
  const { data: likesData } = useVideoLikes(lessonId);
  const toggleVideoLikeMutation = useToggleVideoLike();
  const { data: danmakuData } = useVideoDanmaku(lessonId);
  const sendDanmakuMutation = useSendDanmaku();
  const { data: commentsData } = useVideoComments(
    lessonId,
    undefined, // parentId
    1, // page
    50, // limit
    "newest" // sortBy
  );
  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();
  const toggleCommentLikeMutation = useToggleCommentLike();
  const trackViewMutation = useTrackVideoView();

  // Get current user data
  const { data: userData } = useUser();
  const currentUser = userData || null;
  const { toast } = useToast();

  // Comment management state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // Get real data or fallback to props
  const realVideoStats = videoStats || likesData?.stats;
  const realComments = commentsData?.comments || comments;



  // Transform danmaku data from API format to component format
  const realDanmaku = React.useMemo(() => {
    const apiDanmaku = danmakuData?.danmaku || [];
    if (apiDanmaku.length > 0) {
      return apiDanmaku.map((d: any) => {
        const videoTimeSec = d.video_time_sec || 0;
        const position = duration > 0 ? videoTimeSec / duration : 0;
        return {
          id: d.public_id || d.id,
          text: d.content,
          color: d.color || "#FFFFFF",
          size: d.size || "medium",
          position, // Normalize to 0-1
          videoTimeSec, // Keep original time for debugging
          timestamp: new Date(d.created_at).getTime(),
          userId: d.user_id || d.userId || "anonymous",
          username: d.author?.full_name || d.author?.display_name || "Anonymous",
        };
      });
    }
    return danmakuMessages; // Fallback to prop data
  }, [danmakuData?.danmaku, danmakuMessages, duration]);

  const isLiked = likesData?.currentUserLiked ?? currentUserLiked;

  // Process chapters - calculate end times if not provided
  const processedChapters = useMemo(() => {
    if (!chapters || chapters.length === 0) return [];
    
    return chapters.map((chapter, index) => {
      const nextChapter = chapters[index + 1];
      return {
        ...chapter,
        endTime: chapter.endTime || nextChapter?.startTime || duration || videoDuration || Infinity,
      };
    }).sort((a, b) => a.startTime - b.startTime);
  }, [chapters, duration, videoDuration]);

  // Get current chapter based on current time
  const currentChapter = useMemo(() => {
    if (processedChapters.length === 0) return null;
    
    return processedChapters.find(
      chapter => currentTime >= chapter.startTime && currentTime < (chapter.endTime || Infinity)
    ) || null;
  }, [processedChapters, currentTime]);

  // Jump to chapter
  const jumpToChapter = useCallback((chapterStartTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = chapterStartTime;
      setCurrentTime(chapterStartTime);
    }
  }, []);

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
    const diffInDays = Math.floor(
      (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24)
    );
    return `${diffInDays}${t("VideoPlayer.days_ago")}`;
  };

  // API-based action handlers
  const handleLike = () => {
    toggleVideoLikeMutation.mutate({
      lessonId,
      attachmentId,
      isLiked: true,
    });
  };

  const handleSendDanmaku = () => {
    if (danmakuText.trim()) {
      sendDanmakuMutation.mutate({
        lessonId,
        attachmentId,
        content: danmakuText.trim(),
        videoTimeSec: currentTime,
        color: "#FFFFFF",
        size: "medium",
      });
      setDanmakuText("");
      setShowDanmakuInput(false);
    }
  };

  const handleSendComment = () => {
    if (commentText.trim()) {
      createCommentMutation.mutate({
        lessonId,
        attachmentId,
        content: commentText.trim(),
      });
      setCommentText("");
    }
  };

  // Comment management handlers
  const handleEditComment = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditingContent(content);
  };

  const handleSaveEdit = () => {
    if (editingContent.trim() && editingCommentId) {
      updateCommentMutation.mutate({
        commentId: editingCommentId,
        content: editingContent.trim(),
      });
      setEditingCommentId(null);
      setEditingContent("");
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm(t("VideoPlayer.confirm_delete"))) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const handleReplyToComment = (commentId: string) => {
    setReplyingToId(commentId);
    setReplyContent("");
  };

  const handleSendReply = () => {
    if (replyContent.trim() && replyingToId) {
      createCommentMutation.mutate({
        lessonId,
        attachmentId,
        content: replyContent.trim(),
        parentId: replyingToId,
      });
      setReplyingToId(null);
      setReplyContent("");
    }
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setReplyContent("");
  };

  const handleToggleCommentLike = (commentId: string) => {
    toggleCommentLikeMutation.mutate({
      commentId,
      isLiked: true,
    });
  };

  const isCommentOwner = (comment: any) => {
    const commentUserId = comment.user_id || comment.userId;
    return currentUser && commentUserId === currentUser.id;
  };

  // Share functionality
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `${title} - ${t("VideoPlayer.check_out_video")}`;

    // Try native share API first (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log("Share cancelled or failed:", error);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: t("VideoPlayer.link_copied"),
          description: t("VideoPlayer.link_copied_desc"),
          duration: 2000,
        });
      } catch (error) {
        console.error("Failed to copy link:", error);
        toast({
          title: t("VideoPlayer.share_failed"),
          description: t("VideoPlayer.share_failed_desc"),
          variant: "destructive",
        });
      }
    }
  };

  // Download functionality
  const handleDownload = async () => {
    // For MEGA attachments, use the streaming endpoint with download attribute
    if (attachmentId) {
      try {
        // Use the existing stream endpoint - browser will handle download
        const downloadUrl = `/api/attachments/${attachmentId}/stream`;
        
        // Create a temporary link and trigger download
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${title}.mp4`; // Suggest filename
        link.setAttribute("download", `${title}.mp4`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: t("VideoPlayer.download_started"),
          description: t("VideoPlayer.download_started_desc"),
          duration: 3000,
        });
      } catch (error) {
        console.error("Download failed:", error);
        toast({
          title: t("VideoPlayer.download_failed"),
          description: t("VideoPlayer.download_failed_desc"),
          variant: "destructive",
        });
      }
    } else if (src && videoSourceInfo.type === "direct") {
      // For direct video URLs
      try {
        // Fetch the video and create a blob URL for download
        const response = await fetch(src);
        if (!response.ok) throw new Error("Failed to fetch video");
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${title}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

        toast({
          title: t("VideoPlayer.download_started"),
          description: t("VideoPlayer.download_started_desc"),
          duration: 3000,
        });
      } catch (error) {
        console.error("Download failed:", error);
        // Fallback: try direct link
        try {
          const link = document.createElement("a");
          link.href = src;
          link.download = `${title}.mp4`;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          toast({
            title: t("VideoPlayer.download_started"),
            description: t("VideoPlayer.download_started_desc"),
            duration: 3000,
          });
        } catch (fallbackError) {
          toast({
            title: t("VideoPlayer.download_failed"),
            description: t("VideoPlayer.download_failed_desc"),
            variant: "destructive",
          });
        }
      }
    } else {
      // For YouTube/Vimeo videos, show a message
      toast({
        title: t("VideoPlayer.download_not_available"),
        description: t("VideoPlayer.download_external_video"),
        variant: "destructive",
      });
    }
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
      const streamSrc = `/api/attachments/${attachmentId}/stream`;
      // For attachments, we'll detect HLS format from the actual stream response
      // For now, assume it's direct video (MP4) unless the URL contains .m3u8
      const isHLS = streamSrc.includes('.m3u8');
      console.log('📹 Video source:', { 
        attachmentId, 
        src: streamSrc, 
        type: isHLS ? 'hls' : 'direct',
        isHLS,
      });
      return {
        src: streamSrc,
        type: isHLS ? "hls" : "direct",
        canPlay: true,
        isHLS,
      };
    }

    if (!src) {
      console.log('📹 No video source provided');
      return {
        src: null,
        type: "none",
        canPlay: false,
      };
    }

    // Check if it's a YouTube URL
    if (src.includes("youtube.com") || src.includes("youtu.be")) {
      return {
        src: src,
        type: "youtube",
        canPlay: false, // HTML video can't play YouTube directly
        embedUrl: getYouTubeEmbedUrl(src),
      };
    }

    // Check if it's a Vimeo URL
    if (src.includes("vimeo.com")) {
      return {
        src: src,
        type: "vimeo",
        canPlay: false, // HTML video can't play Vimeo directly
        embedUrl: getVimeoEmbedUrl(src),
      };
    }

    // Check if it's an HLS stream
    if (src.includes('.m3u8')) {
      return {
        src: src,
        type: "hls",
        canPlay: true,
        isHLS: true,
      };
    }

    // Check if it's a direct video file
    if (src.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
      return {
        src: src,
        type: "direct",
        canPlay: true,
        isHLS: false,
      };
    }

    // Default: assume it's a direct URL and try to play
    return {
      src: src,
      type: "direct",
      canPlay: true,
      isHLS: false,
    };
  }, [attachmentId, src, getYouTubeEmbedUrl, getVimeoEmbedUrl]);

  // Video Player API implementation for AI Assistant integration
  const videoPlayerAPI: VideoPlayerAPI = useMemo(() => ({
    seekTo: async (timestamp: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = timestamp;
        setCurrentTime(timestamp);
      }
    },
    getCurrentTime: () => currentTime,
    play: async () => {
      if (videoRef.current) {
        await videoRef.current.play();
      }
    },
    pause: async () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    },
    getDuration: () => duration,
    isPlaying: () => isPlaying,
    setPlaybackSpeed: (speed: number) => {
      if (videoRef.current) {
        videoRef.current.playbackRate = speed;
        setPlaybackRate(speed);
      }
    },
    getPlaybackSpeed: () => playbackRate,
    addEventListener: (event, callback) => {
      // Event listener implementation
      if (videoRef.current) {
        videoRef.current.addEventListener(event, callback);
      }
    },
    removeEventListener: (event, callback) => {
      if (videoRef.current) {
        videoRef.current.removeEventListener(event, callback);
      }
    },
  }), [currentTime, duration, isPlaying, playbackRate]);

  // Register video player globally for AI Assistant (only once)
  useEffect(() => {
    if (videoRef.current && videoSourceInfo.canPlay) {
      setGlobalVideoPlayer(videoPlayerAPI);
    }

    return () => {
      clearGlobalVideoPlayer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoSourceInfo.canPlay]);

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

  // Track initial view start
  const hasTrackedViewStart = useRef(false);

  // Save progress when video is paused
  const handlePause = useCallback(() => {
    setIsPlaying(false);
    // Trigger final progress save when user pauses
    if (onTimeUpdate && videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime, duration);
    }

    // Auto-show terms when video is paused (if there are terms available)
    if (
      termsData?.terms &&
      termsData.terms.length > 0 &&
      termsTooltip.autoShowEnabled
    ) {
      setTimeout(() => {
        termsTooltip.showTerms(termsData.terms);
      }, 500); // Small delay for better UX
    }
  }, [onTimeUpdate, duration, termsData, termsTooltip]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    // Also hide loading when video starts playing
    setIsLoading(false);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && duration > 0) {
      const newTime = videoRef.current.currentTime;
      
      // Prevent time jumps - only update if the difference is reasonable (< 2 seconds or forward progress)
      const timeDiff = Math.abs(newTime - currentTime);
      if (timeDiff > 2 && newTime < currentTime) {
        // Unexpected backward jump detected - this might be a bug, log it
        console.warn('[VideoPlayer] Unexpected time jump detected:', { from: currentTime, to: newTime, diff: timeDiff });
        // Don't update state to prevent UI flicker
        return;
      }
      
      setCurrentTime(newTime);

      // Call parent onTimeUpdate if provided (parent handles all progress saving)
      // Throttle this to avoid excessive calls
      if (onTimeUpdate) {
        onTimeUpdate(newTime, duration);
      }

      // Only track view start once when reaching 5 seconds and duration is available
      if (!hasTrackedViewStart.current && newTime > 5 && duration > 0) {
        trackViewMutation.mutate({
          lessonId,
          attachmentId,
          watchDurationSec: Math.floor(newTime),
          totalDurationSec: Math.floor(duration),
          lastPositionSec: Math.floor(newTime),
          isCompleted: false,
        });
        hasTrackedViewStart.current = true;
      }
    }
  }, [duration, currentTime, onTimeUpdate, lessonId, attachmentId, trackViewMutation]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    // Mark that we have enough data to start playing
    if (videoRef.current) {
      const buffered = videoRef.current.buffered;
      if (buffered.length > 0) {
        const bufferedEnd = buffered.end(buffered.length - 1);
        const progress = (bufferedEnd / videoRef.current.duration) * 100;
        setLoadingProgress(Math.min(progress, 100));
      }
    }
  }, []);

  const handleWaiting = useCallback(() => {
    // Only show loading if we're actually waiting for data
    if (videoRef.current) {
      const videoCurrentTime = videoRef.current.currentTime;
      const buffered = videoRef.current.buffered;
      
      // Check if current time is beyond buffered range
      let isBuffering = true;
      for (let i = 0; i < buffered.length; i++) {
        if (videoCurrentTime >= buffered.start(i) && videoCurrentTime <= buffered.end(i)) {
          isBuffering = false;
          break;
        }
      }
      
      if (isBuffering) {
        console.log('[VideoPlayer] Buffering at:', videoCurrentTime);
        setIsLoading(true);
      }
    }
  }, []);

  const handlePlaying = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleProgress = useCallback(() => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      setBufferedRanges(videoRef.current.buffered);
      
      // Calculate loading progress based on buffered data
      const buffered = videoRef.current.buffered;
      const videoDuration = videoRef.current.duration;
      
      if (videoDuration > 0) {
        // Calculate total buffered amount
        let totalBuffered = 0;
        for (let i = 0; i < buffered.length; i++) {
          totalBuffered += buffered.end(i) - buffered.start(i);
        }
        const progress = (totalBuffered / videoDuration) * 100;
        setLoadingProgress(Math.min(progress, 100));
        
        // Auto-hide loading indicator if enough is buffered (at least 5 seconds)
        const bufferedSeconds = totalBuffered;
        if (bufferedSeconds > 5 && isLoading) {
          setIsLoading(false);
        }
      }
    }
  }, [isLoading]);

  // Handle initialTime when video metadata is loaded (only once)
  const hasSetInitialTime = useRef(false);
  useEffect(() => {
    if (videoRef.current && duration > 0 && initialTime > 0 && !hasSetInitialTime.current) {
      videoRef.current.currentTime = initialTime;
      setCurrentTime(initialTime);
      hasSetInitialTime.current = true;

      // Track view with initial time if provided
      if (onTimeUpdate) {
        onTimeUpdate(initialTime, duration);
      }
    }
  }, [duration, initialTime, onTimeUpdate]);

  // Initialize loading state based on video source and setup HLS if needed
  useEffect(() => {
    const video = videoRef.current;
    const src = videoSourceInfo.src;
    
    if (!video || !src) {
      setIsLoading(false);
      return;
    }

    // Check if it's an HLS stream
    const isHLS = videoSourceInfo.isHLS || src.includes('.m3u8');
    
    if (isHLS && Hls.isSupported()) {
      console.log('🎬 Initializing HLS.js for:', src);
      setIsLoading(true);
      
      // Create HLS instance with optimized configuration
      const hls = new Hls({
        // Performance optimizations
        enableWorker: true, // Use Web Worker for better performance
        lowLatencyMode: false, // Set to true for live streams
        
        // Buffer management (optimized for VOD)
        backBufferLength: 90, // Keep 90s of back buffer for seeking
        maxBufferLength: 30, // Target buffer length (30s ahead)
        maxMaxBufferLength: 600, // Max buffer length (10 minutes)
        maxBufferSize: 60 * 1000 * 1000, // 60MB max buffer size
        maxBufferHole: 0.5, // Max gap in buffer to skip
        
        // ABR (Adaptive Bitrate) configuration
        startLevel: -1, // -1 = auto quality selection
        abrEwmaDefaultEstimate: 500000, // Initial bandwidth estimate (500 kbps)
        abrEwmaFastLive: 3.0, // Fast ABR for live
        abrEwmaSlowLive: 9.0, // Slow ABR for live
        abrEwmaFastVoD: 3.0, // Fast ABR for VOD
        abrEwmaSlowVoD: 9.0, // Slow ABR for VOD
        abrBandWidthFactor: 0.95, // Use 95% of estimated bandwidth
        abrBandWidthUpFactor: 0.7, // Be conservative when upgrading quality
        
        // Fragment loading
        maxLoadingDelay: 4, // Max delay before loading next fragment
        maxFragLookUpTolerance: 0.25, // Fragment lookup tolerance
        
        // Retry configuration
        manifestLoadingTimeOut: 10000, // 10s timeout for manifest
        manifestLoadingMaxRetry: 3, // Retry manifest 3 times
        manifestLoadingRetryDelay: 1000, // 1s delay between retries
        levelLoadingTimeOut: 10000, // 10s timeout for level
        levelLoadingMaxRetry: 4, // Retry level 4 times
        fragLoadingTimeOut: 20000, // 20s timeout for fragments
        fragLoadingMaxRetry: 6, // Retry fragments 6 times
        
        // Debugging (disable in production)
        debug: process.env.NODE_ENV === 'development',
        
        // Capability detection
        testBandwidth: true, // Test bandwidth on startup
        progressive: true, // Enable progressive streaming
        
        // Stall detection
        highBufferWatchdogPeriod: 2, // Check for stalls every 2s
        nudgeMaxRetry: 3, // Max retries for nudging playback
      });

      hlsRef.current = hls;

      // Load source
      hls.loadSource(src);
      hls.attachMedia(video);

      // Handle manifest parsed
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('✅ HLS manifest loaded, found ' + data.levels.length + ' quality levels');
        
        // Extract quality levels
        const levels = data.levels.map((level: any, index: number) => ({
          index,
          height: level.height,
          bitrate: level.bitrate,
        }));
        setQualityLevels(levels);
        
        // Log available qualities
        console.log('📊 Available qualities:', levels.map(l => `${l.height}p`).join(', '));
        
        setIsLoading(false);
      });

      // Handle errors
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ HLS error:', data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('🔄 Fatal network error, trying to recover');
              // Don't immediately reload - wait a bit to avoid loops
              setTimeout(() => {
                if (hlsRef.current) {
                  hls.startLoad();
                }
              }, 1000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('🔄 Fatal media error, trying to recover');
              // Save current time before recovery
              const savedTime = videoRef.current?.currentTime || 0;
              hls.recoverMediaError();
              // Restore time after recovery
              setTimeout(() => {
                if (videoRef.current && savedTime > 0) {
                  videoRef.current.currentTime = savedTime;
                }
              }, 100);
              break;
            default:
              console.error('💥 Fatal error, cannot recover');
              setIsLoading(false);
              toast({
                title: "HLS Error",
                description: "Failed to load HLS stream",
                variant: "destructive",
              });
              hls.destroy();
              break;
          }
        }
      });

      // Handle quality level switching
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = hls.levels[data.level];
        console.log('🎨 Quality switched to:', level.height + 'p');
        setCurrentQuality(data.level);
        
        // Show toast notification (only for manual switches, not ABR)
        if (hls.autoLevelEnabled) {
          console.log('🔄 ABR switched to:', level.height + 'p');
        }
      });

      // Monitor bandwidth and buffer health
      hls.on(Hls.Events.FRAG_BUFFERED, (event, data) => {
        if (videoRef.current) {
          const buffered = videoRef.current.buffered;
          const currentTime = videoRef.current.currentTime;
          
          // Calculate buffer length ahead of current time
          let bufferLength = 0;
          for (let i = 0; i < buffered.length; i++) {
            if (buffered.start(i) <= currentTime && buffered.end(i) > currentTime) {
              bufferLength = buffered.end(i) - currentTime;
              break;
            }
          }
          
          // Get bandwidth from HLS instance
          const bandwidth = hls.bandwidthEstimate || 0;
          
          setHlsStats(prev => ({
            ...prev,
            bufferLength,
            bandwidth,
          }));
        }
      });

      // Track dropped frames for quality issues
      const trackDroppedFrames = setInterval(() => {
        if (videoRef.current) {
          const quality = (videoRef.current as any).getVideoPlaybackQuality?.();
          if (quality) {
            setHlsStats(prev => ({
              ...prev,
              droppedFrames: quality.droppedVideoFrames,
            }));
          }
        }
      }, 5000);

      // Handle buffer stalls
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.details === 'bufferStalledError') {
          console.warn('⚠️ Buffer stalled, attempting recovery');
          // HLS.js will automatically try to recover
        }
      });

      // Handle ABR quality changes
      hls.on(Hls.Events.LEVEL_SWITCHING, (event, data) => {
        console.log('🔄 Switching to quality level:', data.level);
      });

      // Monitor fragment loading performance
      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        // Update bandwidth estimate
        const bandwidth = hls.bandwidthEstimate || 0;
        setHlsStats(prev => ({
          ...prev,
          bandwidth,
        }));
      });

      // Cleanup
      return () => {
        console.log('🧹 Cleaning up HLS instance');
        clearInterval(trackDroppedFrames);
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      console.log('🍎 Using native HLS support (Safari)');
      setIsLoading(true);
      video.src = src;
    } else if (videoSourceInfo.src || videoSourceInfo.embedUrl) {
      // Regular video
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoSourceInfo.src, videoSourceInfo.embedUrl]);

  // For YouTube/Vimeo videos, simulate progress tracking with a timer
  // since iframe doesn't provide timeupdate events
  useEffect(() => {
    if (
      videoSourceInfo.type === "youtube" ||
      videoSourceInfo.type === "vimeo"
    ) {
      // Use provided videoDuration, or duration state, or default to 10 minutes
      const estimatedDuration = videoDuration || duration || 600;

      // Set duration if we have videoDuration prop
      if (videoDuration && duration === 0) {
        setDuration(videoDuration);
      }

      let simulatedTime = initialTime || 0;
      let progressInterval: NodeJS.Timeout | null = null;
      let isPaused = false;

      // Handle page visibility changes - pause tracking when page is hidden
      const handleVisibilityChange = () => {
        isPaused = document.visibilityState === "hidden";
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Start tracking after iframe loads (give it 3 seconds to load)
      const startTimeout = setTimeout(() => {
        // Update progress every 10 seconds
        progressInterval = setInterval(() => {
          // Only increment time if page is visible
          if (!isPaused && document.visibilityState === "visible") {
            simulatedTime += 10; // Increment by 10 seconds
            setCurrentTime(simulatedTime);

            // Call parent onTimeUpdate to save progress
            if (onTimeUpdate) {
              onTimeUpdate(simulatedTime, estimatedDuration);
            }

            // Track view start
            if (!hasTrackedViewStart.current && simulatedTime > 5) {
              trackViewMutation.mutate({
                lessonId,
                attachmentId,
                watchDurationSec: Math.floor(simulatedTime),
                totalDurationSec: Math.floor(estimatedDuration),
                lastPositionSec: Math.floor(simulatedTime),
                isCompleted: false,
              });
              hasTrackedViewStart.current = true;
            }

            // Stop if we exceed estimated duration
            if (simulatedTime >= estimatedDuration) {
              if (progressInterval) {
                clearInterval(progressInterval);
              }
            }
          }
        }, 10000); // Every 10 seconds
      }, 3000); // Wait 3 seconds for iframe to load

      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        if (startTimeout) clearTimeout(startTimeout);
        if (progressInterval) {
          clearInterval(progressInterval);
        }
      };
    }
  }, [
    videoSourceInfo.type,
    initialTime,
    videoDuration,
    duration,
    onTimeUpdate,
    lessonId,
    attachmentId,
    trackViewMutation,
  ]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent) => {
      if (progressRef.current && videoRef.current) {
        const rect = progressRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newTime = (clickX / rect.width) * duration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    },
    [duration]
  );

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

  const changeQuality = useCallback((qualityIndex: number) => {
    if (hlsRef.current) {
      if (qualityIndex === -1) {
        // Auto quality (ABR) - enable adaptive bitrate
        hlsRef.current.currentLevel = -1; // Setting to -1 enables ABR
        console.log('🎨 Quality set to: Auto (ABR)');
        toast({
          title: t("VideoPlayer.quality_changed") || "Quality Changed",
          description: t("VideoPlayer.auto_quality") || "Auto (Adaptive Bitrate)",
          duration: 2000,
        });
      } else {
        // Manual quality selection - locks to specific level
        hlsRef.current.currentLevel = qualityIndex;
        const level = hlsRef.current.levels[qualityIndex];
        console.log('🎨 Quality set to:', level.height + 'p');
        toast({
          title: t("VideoPlayer.quality_changed") || "Quality Changed",
          description: `${level.height}p (${(level.bitrate / 1000000).toFixed(1)} Mbps)`,
          duration: 2000,
        });
      }
      setCurrentQuality(qualityIndex);
    }
  }, [toast, t]);

  const skipTime = useCallback(
    (seconds: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(
          0,
          Math.min(duration, currentTime + seconds)
        );
      }
    },
    [currentTime, duration]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipTime(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skipTime(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case "KeyM":
          e.preventDefault();
          toggleMute();
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "KeyD":
          e.preventDefault();
          setDanmakuEnabled(!danmakuEnabled);
          break;
        case "KeyC":
          e.preventDefault();
          setShowComments(!showComments);
          break;
        case "KeyQ":
          e.preventDefault();
          if (lessonId) {
            qaPanel.openPanel();
          }
          break;
        case "KeyT":
          e.preventDefault();
          if (lessonId && termsData?.terms && termsData.terms.length > 0) {
            termsTooltip.showTerms(termsData.terms);
          }
          break;
        case "KeyN":
          e.preventDefault();
          if (lessonId && courseNotes.length > 0) {
            setShowNotesSidebar(!showNotesSidebar);
          }
          break;
        case "KeyH":
          e.preventDefault();
          if (processedChapters.length > 0) {
            setShowChapters(!showChapters);
          }
          break;
        case "KeyS":
          if (e.shiftKey) {
            e.preventDefault();
            setShowStats(!showStats);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlay,
    skipTime,
    handleVolumeChange,
    volume,
    toggleMute,
    toggleFullscreen,
    danmakuEnabled,
    showComments,
    lessonId,
    qaPanel,
    termsData,
    termsTooltip,
    courseNotes,
    showNotes,
    showNotesSidebar,
    showChapters,
    processedChapters,
    showStats,
  ]);

  // Mouse movement handler
  useEffect(() => {
    const handleMouseMove = () => {
      showControlsTemporarily();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      return () => container.removeEventListener("mousemove", handleMouseMove);
    }
  }, [showControlsTemporarily]);

  // Danmaku rendering
  const renderDanmaku = () => {
    if (!danmakuEnabled || !danmakuContainerRef.current) {
      return null;
    }

    // For direct video with duration
    if (duration > 0) {
      const currentProgress = currentTime / duration;
      // Use realDanmaku instead of danmakuMessages to show API data
      const visibleDanmaku = realDanmaku.filter((msg: any) => {
        const msgProgress = msg.position;
        const timeDiff = Math.abs(msgProgress - currentProgress);
        // Show danmaku within 5% of current time (more lenient)
        return timeDiff < 0.05;
      });

      return visibleDanmaku.map((msg: any, index: number) => (
        <motion.div
          key={`${msg.id}-${msg.timestamp}`}
          className={`absolute text-white font-bold pointer-events-none select-none ${
            msg.size === "small"
              ? "text-sm"
              : msg.size === "large"
              ? "text-xl"
              : "text-base"
          }`}
          style={{
            color: msg.color,
            top: `${20 + (index % 10) * 40}px`, // Cycle through 10 vertical positions
            textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
            zIndex: 10,
          }}
          initial={{ x: "100vw" }}
          animate={{ x: "-100%" }}
          transition={{ duration: 8, ease: "linear" }}
        >
          {msg.text}
        </motion.div>
      ));
    }

    // For external videos (YouTube/Vimeo) - show based on absolute time
    const visibleDanmaku = realDanmaku.filter((msg: any) => {
      const msgTime = msg.videoTimeSec || 0;
      const timeDiff = Math.abs(msgTime - currentTime);
      // Show danmaku within 3 seconds of current time
      return timeDiff < 3;
    });

    return visibleDanmaku.map((msg: any, index: number) => (
      <motion.div
        key={`${msg.id}-${msg.timestamp}`}
        className={`absolute text-white font-bold pointer-events-none select-none ${
          msg.size === "small"
            ? "text-sm"
            : msg.size === "large"
            ? "text-xl"
            : "text-base"
        }`}
        style={{
          color: msg.color,
          top: `${20 + (index % 10) * 40}px`,
          textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
          zIndex: 10,
        }}
        initial={{ x: "100vw" }}
        animate={{ x: "-100%" }}
        transition={{ duration: 8, ease: "linear" }}
      >
        {msg.text}
      </motion.div>
    ));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // These functions are now handled by handleSendDanmaku and handleSendComment above

  return (
    <div className="w-full bg-black">
      {/* Main Container with Video and Notes Sidebar */}
      <div className={`flex transition-all duration-300 ${showNotesSidebar ? 'gap-4' : ''}`}>
        {/* Video Player Container */}
        <div
          ref={containerRef}
          className={`relative bg-black group transition-all duration-300 ${
            showNotesSidebar 
              ? 'w-[70%] aspect-video' 
              : 'w-full aspect-video'
          }`}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => {
            if (isPlaying) {
              setShowControls(false);
            }
          }}
        >
        {/* Video Content - Handle different video types */}
        {videoSourceInfo.type === "youtube" && videoSourceInfo.embedUrl ? (
          <iframe
            src={videoSourceInfo.embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
            onLoad={() => setIsLoading(false)}
          />
        ) : videoSourceInfo.type === "vimeo" && videoSourceInfo.embedUrl ? (
          <iframe
            src={videoSourceInfo.embedUrl}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={title}
            onLoad={() => setIsLoading(false)}
          />
        ) : videoSourceInfo.canPlay && videoSourceInfo.src ? (
          <video
            ref={videoRef}
            {...(!videoSourceInfo.src.includes('.m3u8') && { src: videoSourceInfo.src })}
            poster={poster}
            className="w-full h-full object-contain"
            preload="auto"
            crossOrigin="anonymous"
            onPlay={handlePlay}
            onPause={handlePause}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onLoadStart={handleLoadStart}
            onCanPlay={handleCanPlay}
            onWaiting={handleWaiting}
            onPlaying={handlePlaying}
            onProgress={handleProgress}
            onError={(e) => {
              const videoElement = e.currentTarget;
              const error = videoElement.error;
              console.error('Video error:', {
                code: error?.code,
                message: error?.message,
                src: videoSourceInfo.src,
              });
              setIsLoading(false);
              
              // Only show toast for actual errors, not for aborted loads
              if (error && error.code !== MediaError.MEDIA_ERR_ABORTED) {
                toast({
                  title: t("VideoPlayer.video_error") || "Video Error",
                  description: t("VideoPlayer.video_error_desc") || "Failed to load video. Please try again or contact support.",
                  variant: "destructive",
                  duration: 10000,
                });
              }
            }}
            onClick={togglePlay}
          />
        ) : (
          // No video source or unsupported format
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center text-white/60">
              <Play size={64} className="mx-auto mb-4" />
              <p className="text-xl mb-2">
                {t("VideoPlayer.no_video_content")}
              </p>
              <p className="text-sm">{title}</p>
              {src && (
                <p className="text-xs mt-2 opacity-60">
                  {t("VideoPlayer.source")}:{" "}
                  {videoSourceInfo.type === "youtube"
                    ? t("VideoPlayer.youtube")
                    : videoSourceInfo.type === "vimeo"
                    ? t("VideoPlayer.vimeo")
                    : t("VideoPlayer.unknown_format")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Loading Overlay with Progressive Loading Indicator - No black screen */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 shadow-2xl pointer-events-auto"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 w-16 h-16 rounded-full border-2 border-white/30"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <Loader2
                    size={48}
                    className="text-white animate-spin relative z-10 drop-shadow-lg"
                  />
                </div>
                <div className="text-center">
                  <p className="text-white text-sm font-medium mb-1 drop-shadow-md">
                    {loadingProgress > 0 && loadingProgress < 100
                      ? t("VideoPlayer.buffering") || "Buffering..."
                      : t("VideoPlayer.loading") || "Loading..."}
                  </p>
                  {(videoSourceInfo.type === "youtube" ||
                    videoSourceInfo.type === "vimeo") && (
                    <p className="text-white/80 text-xs drop-shadow-md">
                      {videoSourceInfo.type === "youtube"
                        ? t("VideoPlayer.loading_youtube") ||
                          "Loading YouTube video..."
                        : t("VideoPlayer.loading_vimeo") ||
                          "Loading Vimeo video..."}
                    </p>
                  )}
                  
                  {/* Simple Progress Bar for all direct videos */}
                  {videoSourceInfo.type === "direct" && (
                    <div className="mt-3 w-64">
                      {/* Progress Bar */}
                      <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden shadow-inner">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full shadow-lg"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(loadingProgress, 2)}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      
                      {/* Progress Text */}
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-white/80 text-xs drop-shadow-md">
                          {loadingProgress > 0
                            ? `${Math.round(loadingProgress)}% loaded`
                            : "Initializing..."}
                        </p>
                        {duration > 0 && loadingProgress > 0 && (
                          <p className="text-white/80 text-xs drop-shadow-md">
                            {formatTime((duration * loadingProgress) / 100)} / {formatTime(duration)}
                          </p>
                        )}
                      </div>
                      
                      {/* Ready to play indicator */}
                      {loadingProgress >= 5 && (
                        <motion.p 
                          className="text-green-300 text-xs mt-1 flex items-center justify-center gap-1 drop-shadow-md"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <span>✓</span>
                          <span>Ready to play</span>
                        </motion.p>
                      )}
                      
                      {/* Preloading tip */}
                      {loadingProgress > 0 && loadingProgress < 100 && (
                        <p className="text-white/60 text-xs mt-2 drop-shadow-md">
                          Video is preloading in background...
                        </p>
                      )}
                    </div>
                  )}

                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Danmaku Container */}
        <div
          ref={danmakuContainerRef}
          className="absolute inset-0 pointer-events-none overflow-hidden"
        >
          {renderDanmaku()}
        </div>

        {/* Advanced Stats Panel - Top Right */}
        <AnimatePresence>
          {showStats && hlsRef.current && (
            <motion.div
              className="absolute top-16 right-4 bg-black/90 backdrop-blur-md text-white rounded-lg p-4 text-xs font-mono z-30 pointer-events-auto"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/20">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Eye size={14} />
                  {t("VideoPlayer.stats_title") || "Video Stats"}
                </h3>
                <button
                  onClick={() => setShowStats(false)}
                  className="hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="space-y-2">
                {/* Current Quality */}
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">{t("VideoPlayer.current_quality") || "Quality"}:</span>
                  <span className="text-green-400 font-semibold">
                    {currentQuality === -1 
                      ? `Auto (${qualityLevels.find(l => l.index === hlsRef.current?.currentLevel)?.height || '?'}p)`
                      : `${qualityLevels.find(l => l.index === currentQuality)?.height || '?'}p`
                    }
                  </span>
                </div>

                {/* Bandwidth */}
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">{t("VideoPlayer.bandwidth") || "Bandwidth"}:</span>
                  <span className="text-blue-400">
                    {hlsStats.bandwidth > 0 
                      ? `${(hlsStats.bandwidth / 1000000).toFixed(2)} Mbps`
                      : 'Measuring...'
                    }
                  </span>
                </div>

                {/* Buffer Length */}
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">{t("VideoPlayer.buffer") || "Buffer"}:</span>
                  <span className={`${
                    hlsStats.bufferLength > 10 ? 'text-green-400' : 
                    hlsStats.bufferLength > 5 ? 'text-yellow-400' : 
                    'text-red-400'
                  }`}>
                    {hlsStats.bufferLength.toFixed(1)}s
                  </span>
                </div>

                {/* Dropped Frames */}
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">{t("VideoPlayer.dropped_frames") || "Dropped"}:</span>
                  <span className={`${
                    hlsStats.droppedFrames > 50 ? 'text-red-400' : 
                    hlsStats.droppedFrames > 10 ? 'text-yellow-400' : 
                    'text-green-400'
                  }`}>
                    {hlsStats.droppedFrames} frames
                  </span>
                </div>

                {/* Resolution */}
                {videoRef.current && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">{t("VideoPlayer.resolution") || "Resolution"}:</span>
                    <span className="text-purple-400">
                      {videoRef.current.videoWidth} × {videoRef.current.videoHeight}
                    </span>
                  </div>
                )}

                {/* Playback Rate */}
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">{t("VideoPlayer.speed") || "Speed"}:</span>
                  <span className="text-cyan-400">{playbackRate}x</span>
                </div>

                {/* Video Codec */}
                {qualityLevels.length > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">{t("VideoPlayer.codec") || "Codec"}:</span>
                    <span className="text-orange-400">
                      {hlsRef.current?.levels[hlsRef.current.currentLevel]?.videoCodec?.split('.')[0] || 'H.264'}
                    </span>
                  </div>
                )}

                {/* HLS Version */}
                <div className="flex justify-between gap-4 pt-2 border-t border-white/10">
                  <span className="text-gray-400">HLS.js:</span>
                  <span className="text-gray-500 text-[10px]">v{Hls.version}</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-gray-500 text-center">
                Press Shift+S to toggle
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtitles Display */}
        {subtitlesEnabled && currentSubtitle && videoSourceInfo.type === "direct" && videoSourceInfo.canPlay && (
          <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none z-30">
            <div className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-lg max-w-4xl mx-4">
              <p className="text-white text-center text-lg leading-relaxed font-medium shadow-lg">
                {currentSubtitle}
              </p>
            </div>
          </div>
        )}

        {/* Top Controls - Always visible for direct videos */}
        {videoSourceInfo.type === "direct" && videoSourceInfo.canPlay && (
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20">
            <h2 className="text-white text-lg font-semibold truncate flex-1 mr-4 pointer-events-none">
              {title}
            </h2>
            <div className="flex items-center gap-2 flex-shrink-0 pointer-events-auto">
              <button
                onClick={() => setDanmakuEnabled(!danmakuEnabled)}
                className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
                  danmakuEnabled
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white/20 text-white/70 hover:bg-white/30 hover:text-white"
                }`}
                title={t("VideoPlayer.toggle_danmaku_shortcut")}
              >
                <MessageCircle size={20} />
              </button>
              <button
                onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
                  subtitlesEnabled
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white/20 text-white/70 hover:bg-white/30 hover:text-white"
                }`}
                title={t("VideoPlayer.toggle_subtitles")}
              >
                <Subtitles size={20} />
              </button>
              <button
                onClick={() => setAutoTranslate(!autoTranslate)}
                className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
                  autoTranslate
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white/20 text-white/70 hover:bg-white/30 hover:text-white"
                }`}
                title={t("VideoPlayer.auto_translate")}
              >
                <Languages size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Video Controls Overlay - Only show for direct video, not for YouTube/Vimeo */}
        <AnimatePresence>
          {showControls &&
            videoSourceInfo.type === "direct" &&
            videoSourceInfo.canPlay && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Bottom gradient for controls */}
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

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
                <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
                  {/* Enhanced Progress Bar with Buffering Visualization */}
                  <div
                    ref={progressRef}
                    className="w-full h-2 bg-white/20 rounded-full cursor-pointer mb-4 group/progress relative overflow-hidden"
                    onClick={handleProgressClick}
                  >
                    {/* Buffered Progress (lighter) - Shows what's loaded */}
                    {bufferedRanges && duration > 0 && (
                      <>
                        {Array.from({ length: bufferedRanges.length }).map((_, i) => {
                          const start = (bufferedRanges.start(i) / duration) * 100;
                          const end = (bufferedRanges.end(i) / duration) * 100;
                          return (
                            <motion.div
                              key={i}
                              className="absolute h-full bg-white/40"
                              initial={{ width: 0 }}
                              animate={{ 
                                left: `${start}%`,
                                width: `${end - start}%`,
                              }}
                              transition={{ duration: 0.3 }}
                            />
                          );
                        })}
                      </>
                    )}
                    
                    {/* Chapter Markers */}
                    {processedChapters.length > 0 && duration > 0 && (
                      <>
                        {processedChapters.map((chapter) => {
                          const position = (chapter.startTime / duration) * 100;
                          const isCurrentChapter = currentChapter?.id === chapter.id;
                          
                          return (
                            <div
                              key={chapter.id}
                              className="absolute top-0 bottom-0 z-20 group/chapter"
                              style={{ left: `${position}%` }}
                              onClick={(e) => {
                                e.stopPropagation();
                                jumpToChapter(chapter.startTime);
                              }}
                            >
                              {/* Chapter marker line */}
                              <div className={`w-0.5 h-full transition-all ${
                                isCurrentChapter 
                                  ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' 
                                  : 'bg-white/60 group-hover/chapter:bg-white'
                              }`} />
                              
                              {/* Chapter tooltip on hover */}
                              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/chapter:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                                <div className="bg-black/95 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-white/20">
                                  <div className="font-semibold mb-0.5">{chapter.title}</div>
                                  <div className="text-white/70">{formatTime(chapter.startTime)}</div>
                                </div>
                                {/* Arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                                  <div className="w-2 h-2 bg-black/95 rotate-45 border-r border-b border-white/20" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                    
                    {/* Current Progress */}
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full relative z-10 transition-all duration-200"
                      style={{
                        width: `${
                          duration > 0 ? (currentTime / duration) * 100 : 0
                        }%`,
                      }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-lg border-2 border-white" />
                    </div>
                    
                    {/* Hover tooltip showing time */}
                    <div className="absolute inset-0 opacity-0 group-hover/progress:opacity-100 transition-opacity pointer-events-none">
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {formatTime((currentTime / duration) * duration || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => skipTime(-10)}
                        className="text-white hover:text-blue-400 transition-colors"
                        title={t("VideoPlayer.backward_10s")}
                      >
                        <SkipBack size={24} />
                      </button>

                      <button
                        onClick={togglePlay}
                        className="text-white hover:text-blue-400 transition-colors"
                        title={t("VideoPlayer.play_pause_space")}
                      >
                        {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                      </button>

                      <button
                        onClick={() => skipTime(10)}
                        className="text-white hover:text-blue-400 transition-colors"
                        title={t("VideoPlayer.forward_10s")}
                      >
                        <SkipForward size={24} />
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleMute}
                          className="text-white hover:text-blue-400 transition-colors"
                          title={t("VideoPlayer.mute_shortcut")}
                        >
                          {isMuted ? (
                            <VolumeX size={24} />
                          ) : (
                            <Volume2 size={24} />
                          )}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={isMuted ? 0 : volume}
                          onChange={(e) =>
                            handleVolumeChange(parseFloat(e.target.value))
                          }
                          className="w-20 h-1 bg-white/20 rounded-full appearance-none slider"
                        />
                      </div>

                      <div className="flex flex-col items-start">
                        <span className="text-white text-sm font-mono">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                        {currentChapter && (
                          <span className="text-yellow-400 text-xs truncate max-w-[200px]">
                            {currentChapter.title}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* AI QA Button */}
                      {lessonId && (
                        <button
                          onClick={() => qaPanel.openPanel()}
                          className={`text-white hover:text-purple-400 transition-colors ${
                            qaPanel.isOpen ? "text-purple-400" : ""
                          }`}
                          title={t("VideoPlayer.ask_ai")}
                        >
                          <Bot size={20} />
                        </button>
                      )}

                      {/* Terms Indicator */}
                      {lessonId && termsData?.terms && (
                        <VideoTermsIndicator
                          termsCount={termsData.terms.length}
                          onClick={() =>
                            termsTooltip.showTerms(termsData.terms)
                          }
                          isActive={termsTooltip.isVisible}
                        />
                      )}

                      {/* Notes Indicator */}
                      {lessonId && courseNotes.length > 0 && (
                        <div className="relative">
                          <button
                            onClick={() => setShowNotes(!showNotes)}
                            className={`relative text-white hover:text-yellow-400 transition-colors ${
                              showNotes ? 'text-yellow-400' : ''
                            }`}
                            title={showNotes ? t('hide_notes') : t('show_notes')}
                          >
                            <BookOpen size={20} />
                            {(() => {
                              const nearbyNotes = courseNotes.filter(note => {
                                if (!note.timestampSec) return false;
                                const timeDiff = Math.abs(note.timestampSec - currentTime);
                                return timeDiff <= 30;
                              });
                              return nearbyNotes.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                  {nearbyNotes.length}
                                </span>
                              );
                            })()}
                          </button>

                          {/* Notes Panel */}
                          <AnimatePresence>
                            {showNotes && (
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="absolute bottom-full right-0 mb-2 w-80 max-h-96 bg-slate-800 rounded-xl border border-slate-600 shadow-xl overflow-hidden z-50"
                              >
                                {/* Header */}
                                <div className="flex items-center justify-between p-3 border-b border-slate-600 bg-slate-700">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-yellow-400" />
                                    <h3 className="font-medium text-white text-sm">
                                      {t('notes_at_timestamp')}
                                    </h3>
                                  </div>
                                  <button
                                    onClick={() => setShowNotes(false)}
                                    className="p-1 hover:bg-slate-600 rounded-full transition-colors"
                                  >
                                    <X className="w-4 h-4 text-gray-300" />
                                  </button>
                                </div>

                                {/* Notes List */}
                                <div className="overflow-y-auto max-h-80">
                                  {(() => {
                                    const nearbyNotes = courseNotes.filter(note => {
                                      if (!note.timestampSec) return false;
                                      const timeDiff = Math.abs(note.timestampSec - currentTime);
                                      return timeDiff <= 30;
                                    });

                                    const formatTime = (seconds: number) => {
                                      const mins = Math.floor(seconds / 60);
                                      const secs = Math.floor(seconds % 60);
                                      return `${mins}:${secs.toString().padStart(2, '0')}`;
                                    };

                                    const formatDate = (dateString: string) => {
                                      const date = new Date(dateString);
                                      return date.toLocaleDateString();
                                    };

                                    return nearbyNotes.length > 0 ? (
                                      <div className="p-3 space-y-3">
                                        {nearbyNotes.map((note) => (
                                          <div
                                            key={note.id}
                                            className="bg-slate-700 p-3 rounded-lg border border-slate-600 hover:border-yellow-500 transition-all duration-200"
                                          >
                                            {/* Note Header */}
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                              <div className="flex-1 min-w-0">
                                                {note.title && (
                                                  <h4 className="text-sm font-medium text-white mb-1 truncate">
                                                    {note.title}
                                                  </h4>
                                                )}
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                  {note.timestampSec !== undefined && (
                                                    <button
                                                      onClick={() => {
                                                        if (videoRef.current) {
                                                          videoRef.current.currentTime = note.timestampSec!;
                                                        }
                                                      }}
                                                      className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                                    >
                                                      <Clock className="w-3 h-3" />
                                                      <span className="font-mono">
                                                        {formatTime(note.timestampSec)}
                                                      </span>
                                                    </button>
                                                  )}
                                                  <span>{formatDate(note.createdAt)}</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Note Content */}
                                            <div className="text-sm text-gray-300 leading-relaxed">
                                              {note.aiSummary || note.content}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="p-6 text-center text-gray-400">
                                        <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">{t('no_notes_at_timestamp')}</p>
                                      </div>
                                    );
                                  })()}

                                  {/* All Notes Count */}
                                  {(() => {
                                    const nearbyNotes = courseNotes.filter(note => {
                                      if (!note.timestampSec) return false;
                                      const timeDiff = Math.abs(note.timestampSec - currentTime);
                                      return timeDiff <= 30;
                                    });
                                    return courseNotes.length > nearbyNotes.length && (
                                      <div className="p-3 border-t border-slate-600 bg-slate-700">
                                        <p className="text-xs text-gray-400 text-center">
                                          {courseNotes.length - nearbyNotes.length} more notes in this lesson
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      <button
                        onClick={() => setShowDanmakuInput(!showDanmakuInput)}
                        className="text-white hover:text-blue-400 transition-colors"
                        title={t("VideoPlayer.send_danmaku")}
                      >
                        <Send size={20} />
                      </button>

                      {/* Chapters Button - Show if chapters exist */}
                      {processedChapters.length > 0 && (
                        <div className="relative">
                          <button
                            onClick={() => setShowChapters(!showChapters)}
                            className={`text-white hover:text-blue-400 transition-colors ${
                              showChapters ? 'text-blue-400' : ''
                            }`}
                            title={t("VideoPlayer.show_chapters") || "Chapters"}
                          >
                            <BookOpen size={20} />
                            {currentChapter && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" />
                            )}
                          </button>

                          {/* Chapters Panel */}
                          <AnimatePresence>
                            {showChapters && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl overflow-hidden z-50 w-80 max-h-96"
                              >
                                {/* Header */}
                                <div className="flex items-center justify-between p-3 border-b border-white/20 bg-white/5">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-blue-400" />
                                    <h3 className="font-semibold text-white text-sm">
                                      {t("VideoPlayer.chapters") || "Chapters"} ({processedChapters.length})
                                    </h3>
                                  </div>
                                  <button
                                    onClick={() => setShowChapters(false)}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                  >
                                    <X className="w-4 h-4 text-gray-300" />
                                  </button>
                                </div>

                                {/* Chapters List */}
                                <div className="overflow-y-auto max-h-80">
                                  {processedChapters.map((chapter, index) => {
                                    const isActive = currentChapter?.id === chapter.id;
                                    const progress = isActive && chapter.endTime 
                                      ? ((currentTime - chapter.startTime) / (chapter.endTime - chapter.startTime)) * 100
                                      : 0;

                                    return (
                                      <button
                                        key={chapter.id}
                                        onClick={() => {
                                          jumpToChapter(chapter.startTime);
                                          setShowChapters(false);
                                        }}
                                        className={`w-full p-3 text-left transition-all duration-200 border-b border-white/10 hover:bg-white/10 ${
                                          isActive ? 'bg-blue-500/20' : ''
                                        }`}
                                      >
                                        <div className="flex items-start gap-3">
                                          {/* Chapter Number */}
                                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                            isActive 
                                              ? 'bg-blue-500 text-white' 
                                              : 'bg-white/10 text-white/70'
                                          }`}>
                                            {index + 1}
                                          </div>

                                          {/* Chapter Info */}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                              <h4 className={`text-sm font-medium truncate ${
                                                isActive ? 'text-blue-400' : 'text-white'
                                              }`}>
                                                {chapter.title}
                                              </h4>
                                              {isActive && (
                                                <span className="flex-shrink-0 text-xs text-blue-400 font-medium">
                                                  Playing
                                                </span>
                                              )}
                                            </div>
                                            
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                              <Clock className="w-3 h-3" />
                                              <span className="font-mono">
                                                {formatTime(chapter.startTime)}
                                              </span>
                                              {chapter.endTime && chapter.endTime !== Infinity && (
                                                <>
                                                  <span>-</span>
                                                  <span className="font-mono">
                                                    {formatTime(chapter.endTime)}
                                                  </span>
                                                  <span className="text-white/50">
                                                    ({formatTime(chapter.endTime - chapter.startTime)})
                                                  </span>
                                                </>
                                              )}
                                            </div>

                                            {/* Progress bar for active chapter */}
                                            {isActive && progress > 0 && (
                                              <div className="mt-2 w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                                <motion.div
                                                  className="h-full bg-blue-400 rounded-full"
                                                  initial={{ width: 0 }}
                                                  animate={{ width: `${Math.min(progress, 100)}%` }}
                                                  transition={{ duration: 0.3 }}
                                                />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Current Chapter Display at Bottom */}
                                {currentChapter && (
                                  <div className="p-3 border-t border-white/20 bg-blue-500/10">
                                    <div className="flex items-center gap-2 text-xs text-blue-400">
                                      <Activity className="w-3 h-3 animate-pulse" />
                                      <span className="font-medium">Now Playing:</span>
                                      <span className="truncate">{currentChapter.title}</span>
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Stats Button - Only show for HLS videos */}
                      {hlsRef.current && (
                        <button
                          onClick={() => setShowStats(!showStats)}
                          className={`text-white hover:text-blue-400 transition-colors ${
                            showStats ? 'text-blue-400' : ''
                          }`}
                          title={t("VideoPlayer.show_stats") || "Show Stats (Shift+S)"}
                        >
                          <Eye size={20} />
                        </button>
                      )}

                      <div className="relative">
                        <button
                          onClick={() => setShowSettings(!showSettings)}
                          className="text-white hover:text-blue-400 transition-colors"
                          title={t("VideoPlayer.settings")}
                        >
                          <Settings size={20} />
                        </button>

                        {/* Settings Panel */}
                        <AnimatePresence>
                          {showSettings && (
                            <motion.div
                              className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 min-w-48 z-50"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                            >
                              <div className="space-y-3">
                                <div>
                                  <label className="text-gray-900 dark:text-white text-sm font-medium block mb-2">
                                    {t("VideoPlayer.playback_speed")}
                                  </label>
                                  <select
                                    value={playbackRate}
                                    onChange={(e) =>
                                      changePlaybackRate(
                                        parseFloat(e.target.value)
                                      )
                                    }
                                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer"
                                  >
                                    <option value={0.5} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">0.5x</option>
                                    <option value={0.75} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">0.75x</option>
                                    <option value={1} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">1x ({t("VideoPlayer.normal")})</option>
                                    <option value={1.25} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">1.25x</option>
                                    <option value={1.5} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">1.5x</option>
                                    <option value={2} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">2x</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-gray-900 dark:text-white text-sm font-medium block mb-2">
                                    {t("VideoPlayer.quality")}
                                  </label>
                                  <select 
                                    value={currentQuality}
                                    onChange={(e) => changeQuality(parseInt(e.target.value))}
                                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer"
                                    disabled={qualityLevels.length === 0}
                                  >
                                    <option value={-1} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                      {t("VideoPlayer.auto")} {currentQuality === -1 && qualityLevels.length > 0 ? '✓' : ''}
                                    </option>
                                    {qualityLevels
                                      .sort((a, b) => b.height - a.height) // Sort by quality (highest first)
                                      .map((level) => (
                                        <option 
                                          key={level.index} 
                                          value={level.index}
                                          className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                          {level.height}p ({(level.bitrate / 1000000).toFixed(1)} Mbps) {currentQuality === level.index ? '✓' : ''}
                                        </option>
                                      ))}
                                  </select>
                                  {qualityLevels.length === 0 && (
                                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                                      <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                                        ⚠️ {t("VideoPlayer.quality_not_available") || "Quality selection not available"}
                                      </p>
                                      <p className="text-yellow-700 dark:text-yellow-300 text-[10px] leading-relaxed">
                                        {t("VideoPlayer.quality_requires_hls") || "This video is in MP4 format. To enable quality switching, convert it to HLS format (.m3u8) with multiple bitrates."}
                                      </p>
                                      <a 
                                        href="https://github.com/video-dev/hls.js" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline text-[10px] mt-1 inline-block"
                                      >
                                        {t("VideoPlayer.learn_more") || "Learn more about HLS →"}
                                      </a>
                                    </div>
                                  )}
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
                        {isFullscreen ? (
                          <Minimize size={20} />
                        ) : (
                          <Maximize size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        {/* Simple title overlay for YouTube/Vimeo videos */}
        {(videoSourceInfo.type === "youtube" ||
          videoSourceInfo.type === "vimeo") && (
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <h2 className="text-white text-lg font-semibold">{title}</h2>
            <p className="text-white/80 text-sm">
              {videoSourceInfo.type === "youtube"
                ? "YouTube Video"
                : "Vimeo Video"}
            </p>
          </div>
        )}

        {/* Danmaku Input - Only for direct videos */}
        <AnimatePresence>
          {showDanmakuInput && videoSourceInfo.type === "direct" && (
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
                  placeholder={t("VideoPlayer.danmaku_placeholder")}
                  className="flex-1 bg-white/10 text-white placeholder-white/50 rounded px-3 py-2 outline-none focus:bg-white/20"
                  onKeyPress={(e) => e.key === "Enter" && handleSendDanmaku()}
                  autoFocus
                />
                <button
                  onClick={handleSendDanmaku}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                >
                  {t("VideoPlayer.send_danmaku")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        {/* Notes Sidebar - Auto-show when notes are nearby */}
        <AnimatePresence>
          {showNotesSidebar && courseNotes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 50, width: 0 }}
              animate={{ opacity: 1, x: 0, width: '30%' }}
              exit={{ opacity: 0, x: 50, width: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="bg-slate-900 rounded-lg overflow-hidden shadow-2xl border border-slate-700"
              style={{ height: 'fit-content', maxHeight: '90vh' }}
            >
              {/* Sidebar Header */}
              <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-semibold text-white text-lg">
                      {t('notes_sidebar_title') || '课程笔记'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Auto-show toggle */}
                    <button
                      onClick={() => setAutoShowNotesSidebar(!autoShowNotesSidebar)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        autoShowNotesSidebar
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                      }`}
                      title={autoShowNotesSidebar ? t('disable_auto_show') || '禁用自动显示' : t('enable_auto_show') || '启用自动显示'}
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                    {/* Close button */}
                    <button
                      onClick={() => setShowNotesSidebar(false)}
                      className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                      title={t('close') || '关闭 (N)'}
                    >
                      <X className="w-4 h-4 text-gray-300" />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(currentTime)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    <span>{nearbyNotes.length} {t('nearby_notes') || '条附近笔记'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{courseNotes.length} {t('total_notes') || '条总笔记'}</span>
                  </div>
                </div>
              </div>

              {/* Notes List */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
                {nearbyNotes.length > 0 ? (
                  <div className="p-4 space-y-3">
                    {nearbyNotes.map((note) => {
                      const timeDiff = Math.abs((note.timestampSec || 0) - currentTime);
                      const isVeryClose = timeDiff <= 5; // Within 5 seconds
                      
                      return (
                        <motion.div
                          key={note.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`bg-slate-800 rounded-lg p-4 border transition-all duration-200 hover:shadow-lg ${
                            isVeryClose
                              ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'
                              : 'border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          {/* Note Header */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex-1 min-w-0">
                              {note.title && (
                                <h4 className="text-sm font-semibold text-white mb-1 truncate">
                                  {note.title}
                                </h4>
                              )}
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                {note.timestampSec !== undefined && (
                                  <button
                                    onClick={() => {
                                      if (videoRef.current) {
                                        videoRef.current.currentTime = note.timestampSec!;
                                      }
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                  >
                                    <Clock className="w-3 h-3" />
                                    <span className="font-mono">
                                      {formatTime(note.timestampSec)}
                                    </span>
                                  </button>
                                )}
                                <span className="text-gray-500">
                                  {timeDiff < 1 
                                    ? t('now') || '现在'
                                    : timeDiff <= 5
                                    ? `${Math.round(timeDiff)}s ${t('away') || '前后'}`
                                    : `${Math.round(timeDiff)}s ${t('away') || '前后'}`
                                  }
                                </span>
                              </div>
                            </div>
                            {isVeryClose && (
                              <div className="flex-shrink-0">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
                                  <Activity className="w-3 h-3 animate-pulse" />
                                  {t('active') || '当前'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Note Content */}
                          <div className="text-sm text-gray-300 leading-relaxed">
                            {note.aiSummary || note.content}
                          </div>

                          {/* Note Footer */}
                          <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between text-xs text-gray-500">
                            <span>
                              {new Date(note.createdAt).toLocaleDateString()}
                            </span>
                            {note.aiSummary && (
                              <span className="flex items-center gap-1 text-purple-400">
                                <Bot className="w-3 h-3" />
                                AI {t('summary') || '摘要'}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg mb-2">{t('no_notes_nearby') || '附近没有笔记'}</p>
                    <p className="text-sm text-gray-500">
                      {t('notes_will_appear_here') || '当播放到有笔记的时间点时，笔记会自动显示在这里'}
                    </p>
                  </div>
                )}

                {/* All Notes Section */}
                {nearbyNotes.length > 0 && courseNotes.length > nearbyNotes.length && (
                  <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                    <button
                      onClick={() => setShowNotes(true)}
                      className="w-full text-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {t('view_all_notes') || '查看全部笔记'} ({courseNotes.length - nearbyNotes.length} {t('more_notes') || '条'})
                    </button>
                  </div>
                )}
              </div>

              {/* Keyboard Hint */}
              <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-3 text-center">
                <p className="text-xs text-gray-500">
                  {t('press_n_to_toggle') || '按'} <kbd className="px-2 py-1 bg-slate-700 rounded text-xs font-mono">N</kbd> {t('to_toggle_sidebar') || '切换侧边栏'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Video Info and Actions */}
      <div className="bg-white dark:bg-gray-900 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              {videoStats && (
                <>
                  <span>
                    {formatViews(videoStats.views)}{" "}
                    {t("VideoPlayer.views_count")}
                  </span>
                  <span>{formatTimeAgo(videoStats.publishedAt)}</span>
                  {attachmentId && <span>ID: {attachmentId}</span>}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isLiked || currentUserLiked
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
              }`}
            >
              <Heart
                size={16}
                className={isLiked || currentUserLiked ? "fill-current" : ""}
              />
              <span>
                {t("VideoPlayer.like")}{" "}
                {videoStats?.likes ? `(${videoStats.likes})` : ""}
              </span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors"
            >
              <Share2 size={16} />
              <span>{t("VideoPlayer.share")}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors"
            >
              <Download size={16} />
              <span>{t("VideoPlayer.download")}</span>
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
            className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("VideoPlayer.comments")}{" "}
                  {videoSourceInfo.type === "youtube" ||
                  videoSourceInfo.type === "vimeo"
                    ? t("VideoPlayer.external_video")
                    : comments.length}
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
              {videoSourceInfo.type === "direct" ? (
                <div className="flex gap-3 mb-6">
                  {currentUser?.profile?.avatar_url ? (
                    <img
                      src={currentUser.profile.avatar_url}
                      alt={
                        currentUser.profile.full_name ||
                        currentUser.profile.display_name ||
                        "User"
                      }
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/default-avatar.png";
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {currentUser?.profile?.full_name?.[0] ||
                        currentUser?.profile?.display_name?.[0] ||
                        currentUser?.email?.[0]?.toUpperCase() ||
                        "U"}
                    </div>
                  )}
                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={t("VideoPlayer.comment_placeholder")}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      rows={3}
                      disabled={!currentUser || createCommentMutation.isPending}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleSendComment}
                        disabled={
                          !commentText.trim() ||
                          !currentUser ||
                          createCommentMutation.isPending
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {createCommentMutation.isPending ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            {t("VideoPlayer.posting")}
                          </>
                        ) : (
                          t("VideoPlayer.publish")
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    {t("VideoPlayer.external_video_notice", {
                      platform:
                        videoSourceInfo.type === "youtube"
                          ? "YouTube"
                          : "Vimeo",
                    })}
                  </p>
                  {videoSourceInfo.src && (
                    <a
                      href={videoSourceInfo.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                    >
                      {t("VideoPlayer.watch_on_platform", {
                        platform:
                          videoSourceInfo.type === "youtube"
                            ? "YouTube"
                            : "Vimeo",
                      })}
                    </a>
                  )}
                </div>
              )}

              {/* Comments List - Only show for direct videos */}
              {videoSourceInfo.type === "direct" && (
                <div className="space-y-4">
                  {realComments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <MessageCircle
                        size={48}
                        className="mx-auto mb-4 opacity-50"
                      />
                      <p className="text-lg mb-2">
                        {t("VideoPlayer.no_comments")}
                      </p>
                      <p className="text-sm">
                        {t("VideoPlayer.be_first_comment")}
                      </p>
                    </div>
                  ) : (
                    realComments.map((comment: any) => {
                      const commentId = comment.public_id || comment.id;
                      // Extract author information from nested author object
                      const author = comment.author || {};
                      const avatar =
                        author.avatar_url ||
                        comment.avatar_url ||
                        comment.avatarUrl ||
                        comment.avatar ||
                        "/default-avatar.png";
                      const username =
                        author.full_name ||
                        author.display_name ||
                        comment.username ||
                        comment.display_name ||
                        comment.displayName ||
                        "Anonymous";
                      const timestamp =
                        comment.created_at ||
                        comment.createdAt ||
                        comment.timestamp;
                      const likesCount =
                        comment.likes_count ||
                        comment.likesCount ||
                        comment.likes ||
                        0;
                      const repliesCount =
                        comment.replies_count ||
                        comment.repliesCount ||
                        comment.replies?.length ||
                        0;
                      const isLiked =
                        comment.is_liked || comment.isLiked || false;

                      return (
                        <div key={commentId} className="flex gap-3">
                          <UserAvatar 
                            avatarUrl={avatar} 
                            username={username}
                            size="w-8 h-8"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">
                                {username}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {timestamp
                                  ? new Date(timestamp).toLocaleString()
                                  : ""}
                              </span>
                            </div>
                            {/* Comment content or editing interface */}
                            {editingCommentId === commentId ? (
                              <div className="mb-2">
                                <textarea
                                  value={editingContent}
                                  onChange={(e) =>
                                    setEditingContent(e.target.value)
                                  }
                                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                  rows={3}
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={handleSaveEdit}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                                  >
                                    {t("VideoPlayer.save")}
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                                  >
                                    {t("VideoPlayer.cancel")}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-900 dark:text-gray-100 mb-2">
                                {comment.content}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <button
                                onClick={() =>
                                  handleToggleCommentLike(commentId)
                                }
                                disabled={toggleCommentLikeMutation.isPending}
                                className={`flex items-center gap-1 hover:text-blue-600 transition-colors ${
                                  isLiked ? "text-blue-600" : ""
                                } ${
                                  toggleCommentLikeMutation.isPending
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                <Heart
                                  size={14}
                                  className={isLiked ? "fill-current" : ""}
                                />
                                <span>{likesCount > 0 ? likesCount : ""}</span>
                              </button>
                              <button
                                onClick={() => handleReplyToComment(commentId)}
                                className="hover:text-blue-600 flex items-center gap-1"
                              >
                                <MessageCircle size={14} />
                                {t("VideoPlayer.reply")}
                                {repliesCount > 0 && (
                                  <span className="text-xs">
                                    ({repliesCount})
                                  </span>
                                )}
                              </button>
                              {isCommentOwner(comment) && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleEditComment(
                                        commentId,
                                        comment.content
                                      )
                                    }
                                    className="hover:text-blue-600 flex items-center gap-1"
                                  >
                                    <Edit size={12} />
                                    {t("VideoPlayer.edit")}
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteComment(commentId)
                                    }
                                    className="hover:text-red-600 flex items-center gap-1"
                                  >
                                    <Trash2 size={12} />
                                    {t("VideoPlayer.delete")}
                                  </button>
                                </>
                              )}
                              <button className="hover:text-red-600 flex items-center gap-1">
                                <Flag size={12} />
                                {t("VideoPlayer.report")}
                              </button>
                            </div>

                            {/* Reply interface */}
                            {replyingToId === commentId && (
                              <div className="mt-3 pl-4 border-l-2 border-blue-500 space-y-3">
                                <div className="flex gap-2">
                                  {currentUser?.profile?.avatar_url ? (
                                    <img
                                      src={currentUser.profile.avatar_url}
                                      alt={
                                        currentUser.profile.full_name ||
                                        currentUser.profile.display_name ||
                                        "User"
                                      }
                                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                        const fallback =
                                          target.nextElementSibling as HTMLElement;
                                        if (fallback)
                                          fallback.style.display = "flex";
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                    style={{
                                      display: currentUser?.profile?.avatar_url
                                        ? "none"
                                        : "flex",
                                    }}
                                  >
                                    {currentUser?.profile?.full_name?.[0]?.toUpperCase() ||
                                      currentUser?.profile?.display_name?.[0]?.toUpperCase() ||
                                      currentUser?.email?.[0]?.toUpperCase() ||
                                      "R"}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs text-blue-600 mb-1">
                                      {t("VideoPlayer.replying_to", {
                                        username,
                                      })}
                                    </div>
                                    <textarea
                                      value={replyContent}
                                      onChange={(e) =>
                                        setReplyContent(e.target.value)
                                      }
                                      placeholder={t(
                                        "VideoPlayer.comment_placeholder"
                                      )}
                                      className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                      rows={2}
                                    />
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={handleSendReply}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                                      >
                                        {t("VideoPlayer.send_reply")}
                                      </button>
                                      <button
                                        onClick={handleCancelReply}
                                        className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                                      >
                                        {t("VideoPlayer.cancel_reply")}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="mt-3 pl-4 border-l-2 border-gray-100 dark:border-gray-700 space-y-3">
                                {comment.replies.map((reply: any) => {
                                  const replyAuthor = reply.author || {};
                                  const replyAvatar =
                                    replyAuthor.avatar_url ||
                                    reply.avatar_url ||
                                    reply.avatarUrl ||
                                    reply.avatar ||
                                    "/default-avatar.png";
                                  const replyUsername =
                                    replyAuthor.full_name ||
                                    replyAuthor.display_name ||
                                    reply.username ||
                                    reply.display_name ||
                                    reply.displayName ||
                                    "Anonymous";
                                  const replyTimestamp =
                                    reply.created_at ||
                                    reply.createdAt ||
                                    reply.timestamp;

                                  return (
                                    <div
                                      key={reply.id || reply.public_id}
                                      className="flex gap-2"
                                    >
                                      <UserAvatar 
                                        avatarUrl={replyAvatar} 
                                        username={replyUsername}
                                        size="w-6 h-6"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-semibold text-xs">
                                            {replyUsername}
                                          </span>
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {replyTimestamp
                                              ? new Date(
                                                  replyTimestamp
                                                ).toLocaleString()
                                              : ""}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">
                                          {reply.content}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Help */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex flex-wrap gap-4">
          <span>
            <kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">
              Space
            </kbd>{" "}
            {t("VideoPlayer.keyboard_shortcuts.play_pause")}
          </span>
          <span>
            <kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">
              ←/→
            </kbd>{" "}
            {t("VideoPlayer.keyboard_shortcuts.seek_backward_forward")}
          </span>
          <span>
            <kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">
              ↑/↓
            </kbd>{" "}
            {t("VideoPlayer.keyboard_shortcuts.volume_up_down")}
          </span>
          <span>
            <kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">
              M
            </kbd>{" "}
            {t("VideoPlayer.keyboard_shortcuts.mute")}
          </span>
          <span>
            <kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">
              F
            </kbd>{" "}
            {t("VideoPlayer.keyboard_shortcuts.fullscreen")}
          </span>
          <span>
            <kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">
              D
            </kbd>{" "}
            {t("VideoPlayer.keyboard_shortcuts.toggle_danmaku")}
          </span>
          <span>
            <kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">
              C
            </kbd>{" "}
            {t("VideoPlayer.keyboard_shortcuts.toggle_comments")}
          </span>
          <span>
            <kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">
              Q
            </kbd>{" "}
            {t("VideoPlayer.keyboard_shortcuts.ask_ai")}
          </span>
          <span>
            <kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">
              T
            </kbd>{" "}
            {t("VideoPlayer.keyboard_shortcuts.toggle_terms")}
          </span>
          <span>
            <kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">
              N
            </kbd>{" "}
            {t("VideoPlayer.keyboard_shortcuts.toggle_notes")}
          </span>
          <span>
            <kbd className="bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded border dark:border-gray-600">
              H
            </kbd>{" "}
            {t("VideoPlayer.keyboard_shortcuts.toggle_chapters") || "Chapters"}
          </span>
        </div>
      </div>

      {/* AI QA Panel */}
      {lessonId && (
        <VideoQAPanel
          lessonId={lessonId}
          currentTime={currentTime}
          isOpen={qaPanel.isOpen}
          onClose={qaPanel.closePanel}
          onSeekTo={(time) => {
            if (videoRef.current) {
              videoRef.current.currentTime = time;
            }
          }}
        />
      )}

      {/* Video Terms Tooltip */}
      {lessonId && termsData?.terms && (
        <VideoTermsTooltip
          terms={termsData.terms}
          isVisible={termsTooltip.isVisible}
          autoShowEnabled={termsTooltip.autoShowEnabled}
          onClose={termsTooltip.hideTerms}
          onToggleAutoShow={termsTooltip.toggleAutoShow}
          onSeekTo={(time) => {
            if (videoRef.current) {
              videoRef.current.currentTime = time;
            }
          }}
          position="top-right"
        />
      )}
    </div>
  );
}
