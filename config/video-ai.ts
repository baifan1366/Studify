/**
 * Video AI Configuration
 *
 * Centralized configuration for Video AI features
 * All values can be overridden via environment variables
 */

export const VideoAIConfig = {
  /**
   * Rate Limiting Configuration
   */
  rateLimit: {
    windowMs: parseInt(process.env.VIDEO_QA_WINDOW_MS || "60000"), // 1 minute
    maxRequests: parseInt(process.env.VIDEO_QA_MAX_REQUESTS || "20"), // 20 requests per minute
  },

  /**
   * Time Window Configuration (in seconds)
   */
  timeWindow: {
    default: parseInt(process.env.VIDEO_DEFAULT_TIME_WINDOW || "30"), // Default QA time window
    terms: parseInt(process.env.VIDEO_TERMS_TIME_WINDOW || "15"), // Terms extraction time window
    maxWindow: parseInt(process.env.VIDEO_MAX_TIME_WINDOW || "120"), // Maximum allowed time window
  },

  /**
   * Content Limits
   */
  limits: {
    segments: parseInt(process.env.VIDEO_SEGMENTS_LIMIT || "3"), // Max video segments to fetch
    terms: parseInt(process.env.VIDEO_TERMS_MAX_COUNT || "5"), // Max terms to extract
    searchResults: parseInt(process.env.VIDEO_SEARCH_MAX_RESULTS || "5"), // Max search results
    contextLength: parseInt(process.env.VIDEO_CONTEXT_LENGTH || "2000"), // Max context text length
  },

  /**
   * Cache Configuration
   */
  cache: {
    // Cache interval for terms (in seconds)
    interval: parseInt(process.env.NEXT_PUBLIC_TERMS_CACHE_INTERVAL || "15"),
    // Stale time for React Query (in milliseconds)
    staleTime: parseInt(process.env.NEXT_PUBLIC_TERMS_STALE_TIME || "30000"),
    // Enable/disable caching
    enabled: process.env.NEXT_PUBLIC_ENABLE_VIDEO_CACHE !== "false",
  },

  /**
   * Search Configuration
   */
  search: {
    similarityThreshold: parseFloat(
      process.env.VIDEO_SEARCH_SIMILARITY_THRESHOLD || "0.7"
    ),
    contentTypes: (
      process.env.VIDEO_SEARCH_CONTENT_TYPES || "video_segment,lesson,note"
    ).split(","),
    prioritizeNearbySegments: process.env.VIDEO_PRIORITIZE_NEARBY !== "false",
  },

  /**
   * AI Models Configuration
   */
  models: {
    default: process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
    document:
      process.env.OPEN_ROUTER_DOCUMENT_MODEL ||
      "nvidia/nemotron-nano-12b-v2-vl:free",
    image:
      process.env.OPEN_ROUTER_IMAGE_MODEL ||
      "nvidia/nemotron-nano-12b-v2-vl:free",
    toolCalling:
      process.env.OPEN_ROUTER_TOOL_CALLING_MODEL || "z-ai/glm-4.5-air:free",
  },

  /**
   * Feature Flags
   */
  features: {
    enableExternalVideoSupport:
      process.env.ENABLE_EXTERNAL_VIDEO_SUPPORT !== "false",
    enableTermsExtraction: process.env.ENABLE_TERMS_EXTRACTION !== "false",
    enableVideoSegments: process.env.ENABLE_VIDEO_SEGMENTS !== "false",
    enableQAHistory: process.env.ENABLE_QA_HISTORY !== "false",
    enableAutoShowTerms: process.env.ENABLE_AUTO_SHOW_TERMS !== "false",
  },

  /**
   * External Video Configuration
   */
  externalVideo: {
    supportedPlatforms: ["youtube", "vimeo"],
    youtubePattern: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    vimeoPattern: /vimeo\.com\/(\d+)/,
  },

  /**
   * UI Configuration
   */
  ui: {
    defaultPanelPosition: (process.env.NEXT_PUBLIC_QA_PANEL_POSITION ||
      "right") as "left" | "right",
    showKeyboardShortcuts:
      process.env.NEXT_PUBLIC_SHOW_KEYBOARD_SHORTCUTS !== "false",
    enableAnimations: process.env.NEXT_PUBLIC_ENABLE_ANIMATIONS !== "false",
  },

  /**
   * Logging Configuration
   */
  logging: {
    enableDebugLogs:
      process.env.NODE_ENV === "development" ||
      process.env.ENABLE_VIDEO_DEBUG === "true",
    logSearchResults: process.env.LOG_SEARCH_RESULTS === "true",
    logToolCalls: process.env.LOG_TOOL_CALLS === "true",
  },
} as const;

/**
 * Validate configuration on startup
 */
export function validateVideoAIConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate rate limit
  if (VideoAIConfig.rateLimit.maxRequests < 1) {
    errors.push("VIDEO_QA_MAX_REQUESTS must be at least 1");
  }

  // Validate time windows
  if (VideoAIConfig.timeWindow.default < 1) {
    errors.push("VIDEO_DEFAULT_TIME_WINDOW must be at least 1 second");
  }
  if (VideoAIConfig.timeWindow.default > VideoAIConfig.timeWindow.maxWindow) {
    errors.push(
      "VIDEO_DEFAULT_TIME_WINDOW cannot exceed VIDEO_MAX_TIME_WINDOW"
    );
  }

  // Validate limits
  if (VideoAIConfig.limits.terms < 1 || VideoAIConfig.limits.terms > 20) {
    errors.push("VIDEO_TERMS_MAX_COUNT must be between 1 and 20");
  }

  // Validate similarity threshold
  if (
    VideoAIConfig.search.similarityThreshold < 0 ||
    VideoAIConfig.search.similarityThreshold > 1
  ) {
    errors.push("VIDEO_SEARCH_SIMILARITY_THRESHOLD must be between 0 and 1");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get configuration summary for debugging
 */
export function getVideoAIConfigSummary() {
  return {
    rateLimit: `${VideoAIConfig.rateLimit.maxRequests} requests per ${VideoAIConfig.rateLimit.windowMs}ms`,
    timeWindow: `${VideoAIConfig.timeWindow.default}s (max: ${VideoAIConfig.timeWindow.maxWindow}s)`,
    limits: {
      segments: VideoAIConfig.limits.segments,
      terms: VideoAIConfig.limits.terms,
      searchResults: VideoAIConfig.limits.searchResults,
    },
    cache: {
      enabled: VideoAIConfig.cache.enabled,
      interval: `${VideoAIConfig.cache.interval}s`,
      staleTime: `${VideoAIConfig.cache.staleTime}ms`,
    },
    models: {
      default: VideoAIConfig.models.default,
      document: VideoAIConfig.models.document,
    },
    features: VideoAIConfig.features,
  };
}

// Validate on module load (only in development)
if (process.env.NODE_ENV === "development") {
  const validation = validateVideoAIConfig();
  if (!validation.valid) {
    console.warn("⚠️ Video AI Configuration Validation Errors:");
    validation.errors.forEach((error) => console.warn(`  - ${error}`));
  } else {
    console.log("✅ Video AI Configuration validated successfully");
    if (VideoAIConfig.logging.enableDebugLogs) {
      console.log("📊 Video AI Config Summary:", getVideoAIConfigSummary());
    }
  }
}

export default VideoAIConfig;
