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
} from "lucide-react";
import MegaImage from "@/components/attachment/mega-blob-image";
import { setGlobalVideoPlayer, clearGlobalVideoPlayer } from "@/hooks/video/use-video-player";
import type { VideoPlayerAPI } from "@/interfaces/video-player-api";

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

interface VideoPlayerProps {
  src?: string;
  attachmentId?: number; // Support MEGA attachment streaming
  lessonId: string; // Required for API calls
  title: string;
  poster?: string;
  initialTime?: number;
  videoDuration?: number; // Optional duration for YouTube/Vimeo videos
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

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showDanmakuInput, setShowDanmakuInput] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [danmakuEnabled, setDanmakuEnabled] = useState(true);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);

  // Input state
  const [danmakuText, setDanmakuText] = useState("");
  const [commentText, setCommentText] = useState("");

  // AI QA and Terms functionality
  const qaPanel = useVideoQAPanel();
  const termsTooltip = useVideoTermsTooltip();

  // Fetch terms for current time (update every 15 seconds)
  const { data: termsData } = useVideoTerms(
    lessonId || "",
    currentTime,
    !!lessonId && currentTime > 0
  );

  // Internationalization
  const t = useTranslations();

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
      return {
        src: `/api/attachments/${attachmentId}/stream`,
        type: "direct",
        canPlay: true,
      };
    }

    if (!src) {
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

    // Check if it's a direct video file
    if (src.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
      return {
        src: src,
        type: "direct",
        canPlay: true,
      };
    }

    // Default: assume it's a direct URL and try to play
    return {
      src: src,
      type: "direct",
      canPlay: true,
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

  // Register video player globally for AI Assistant
  useEffect(() => {
    if (videoRef.current && videoSourceInfo.canPlay) {
      setGlobalVideoPlayer(videoPlayerAPI);
      console.log('🎬 Video player registered globally for AI Assistant');
    }

    return () => {
      clearGlobalVideoPlayer();
      console.log('🗑️ Video player unregistered');
    };
  }, [videoPlayerAPI, videoSourceInfo.canPlay]);

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
      setCurrentTime(newTime);

      // Call parent onTimeUpdate if provided (parent handles all progress saving)
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
  }, [duration, onTimeUpdate, lessonId, attachmentId, trackViewMutation]);

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
  }, []);

  const handleWaiting = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handlePlaying = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Handle initialTime when video metadata is loaded
  useEffect(() => {
    if (videoRef.current && duration > 0 && initialTime > 0) {
      videoRef.current.currentTime = initialTime;
      setCurrentTime(initialTime);

      // Track view with initial time if provided
      if (onTimeUpdate) {
        onTimeUpdate(initialTime, duration);
      }
    }
  }, [duration, initialTime, onTimeUpdate]);

  // Initialize loading state based on video source
  useEffect(() => {
    if (videoSourceInfo.src || videoSourceInfo.embedUrl) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
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
            src={videoSourceInfo.src}
            poster={poster}
            className="w-full h-full object-contain"
            onPlay={handlePlay}
            onPause={handlePause}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onLoadStart={handleLoadStart}
            onCanPlay={handleCanPlay}
            onWaiting={handleWaiting}
            onPlaying={handlePlaying}
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

        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 w-16 h-16 rounded-full border-2 border-white/20"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <Loader2
                    size={48}
                    className="text-white animate-spin relative z-10"
                  />
                </div>
                <div className="text-center">
                  <p className="text-white text-sm font-medium mb-1">
                    {t("VideoPlayer.loading") || "Loading..."}
                  </p>
                  {(videoSourceInfo.type === "youtube" ||
                    videoSourceInfo.type === "vimeo") && (
                    <p className="text-white/70 text-xs">
                      {videoSourceInfo.type === "youtube"
                        ? t("VideoPlayer.loading_youtube") ||
                          "Loading YouTube video..."
                        : t("VideoPlayer.loading_vimeo") ||
                          "Loading Vimeo video..."}
                    </p>
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

        {/* Video Controls Overlay - Only show for direct video, not for YouTube/Vimeo */}
        <AnimatePresence>
          {showControls &&
            videoSourceInfo.type === "direct" &&
            videoSourceInfo.canPlay && (
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
                        danmakuEnabled
                          ? "bg-blue-600 text-white"
                          : "bg-white/20 text-white/70"
                      }`}
                      title={t("VideoPlayer.toggle_danmaku_shortcut")}
                    >
                      <MessageCircle size={20} />
                    </button>
                    <button
                      onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                      className={`p-2 rounded-lg transition-colors ${
                        subtitlesEnabled
                          ? "bg-blue-600 text-white"
                          : "bg-white/20 text-white/70"
                      }`}
                      title={t("VideoPlayer.toggle_subtitles")}
                    >
                      <Subtitles size={20} />
                    </button>
                    <button
                      onClick={() => setAutoTranslate(!autoTranslate)}
                      className={`p-2 rounded-lg transition-colors ${
                        autoTranslate
                          ? "bg-blue-600 text-white"
                          : "bg-white/20 text-white/70"
                      }`}
                      title={t("VideoPlayer.auto_translate")}
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
                      style={{
                        width: `${
                          duration > 0 ? (currentTime / duration) * 100 : 0
                        }%`,
                      }}
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

                      <span className="text-white text-sm">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
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

                      <button
                        onClick={() => setShowDanmakuInput(!showDanmakuInput)}
                        className="text-white hover:text-blue-400 transition-colors"
                        title={t("VideoPlayer.send_danmaku")}
                      >
                        <Send size={20} />
                      </button>

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
                              className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg p-4 min-w-48"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                            >
                              <div className="space-y-3">
                                <div>
                                  <label className="text-white text-sm block mb-1">
                                    {t("VideoPlayer.playback_speed")}
                                  </label>
                                  <select
                                    value={playbackRate}
                                    onChange={(e) =>
                                      changePlaybackRate(
                                        parseFloat(e.target.value)
                                      )
                                    }
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
                                  <label className="text-white text-sm block mb-1">
                                    {t("VideoPlayer.quality")}
                                  </label>
                                  <select className="w-full bg-white/10 text-white rounded px-2 py-1 text-sm">
                                    <option>{t("VideoPlayer.auto")}</option>
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
