/**
 * Utility functions for handling video attachments
 */

/**
 * Detects video source with priority: attachments first, then content_url
 * @param attachments - Array of attachment IDs from lesson.attachments
 * @param contentUrl - The content URL from lesson.content_url
 * @returns Object with attachment info and source type
 */
export function detectLessonVideoSource(
  attachments?: number[], 
  contentUrl?: string
): { 
  attachmentId: number; 
  isMegaAttachment: boolean; 
  sourceType: 'attachment' | 'content_url' | 'none';
  videoSrc?: string;
} | null {
  
  // Priority 1: Check attachments array first
  if (attachments && attachments.length > 0) {
    // Use the first attachment ID (could be enhanced to select video attachments specifically)
    const attachmentId = attachments[0];
    return {
      attachmentId,
      isMegaAttachment: true,
      sourceType: 'attachment',
      videoSrc: `/api/attachments/${attachmentId}/stream`
    };
  }

  // Priority 2: Check content_url
  if (contentUrl) {
    const attachmentInfo = detectAttachmentVideo(contentUrl);
    if (attachmentInfo) {
      return {
        ...attachmentInfo,
        sourceType: 'content_url',
        videoSrc: `/api/attachments/${attachmentInfo.attachmentId}/stream`
      };
    } else {
      // Third-party URL
      return {
        attachmentId: 0,
        isMegaAttachment: false,
        sourceType: 'content_url',
        videoSrc: contentUrl
      };
    }
  }

  // Priority 3: No content found
  return null;
}

/**
 * Legacy function - detects if a content URL represents a MEGA attachment
 * @param contentUrl - The content URL from lesson data
 * @returns Object with attachment info or null if not a MEGA attachment
 */
export function detectAttachmentVideo(contentUrl: string): { attachmentId: number; isMegaAttachment: boolean } | null {
  if (!contentUrl) return null;

  // Check for API attachment URL pattern (e.g., "/api/attachments/123" or "/api/attachments/123/stream")
  const attachmentIdMatch = contentUrl.match(/\/api\/attachments\/(\d+)(?:\/stream)?/);
  if (attachmentIdMatch) {
    return {
      attachmentId: parseInt(attachmentIdMatch[1], 10),
      isMegaAttachment: true
    };
  }

  // Check for direct MEGA URL (stored in database)
  if (contentUrl.includes('mega.nz')) {
    // For direct MEGA URLs, we can't extract attachment ID without database lookup
    // This indicates it's a MEGA file but we need the attachment ID from context
    return {
      attachmentId: 0, // Will be resolved by the component
      isMegaAttachment: true
    };
  }

  // Check if content_url is just an attachment ID (numeric string)
  // This happens when lesson.content_url stores only the attachment ID
  if (contentUrl.match(/^\d+$/)) {
    return {
      attachmentId: parseInt(contentUrl, 10),
      isMegaAttachment: true
    };
  }

  return null;
}

/**
 * Checks if a file extension is a video format
 * @param filename - The filename to check
 * @returns boolean indicating if it's a video file
 */
export function isVideoFile(filename: string): boolean {
  const videoExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'm4v', 'mkv', '3gp'];
  const ext = filename.toLowerCase().split('.').pop();
  return videoExtensions.includes(ext || '');
}

/**
 * Gets the appropriate content type for a video file
 * @param filename - The filename
 * @returns MIME type string
 */
export function getVideoContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'ogg': return 'video/ogg';
    case 'avi': return 'video/x-msvideo';
    case 'mov': return 'video/quicktime';
    case 'wmv': return 'video/x-ms-wmv';
    case 'flv': return 'video/x-flv';
    case 'm4v': return 'video/x-m4v';
    case 'mkv': return 'video/x-matroska';
    case '3gp': return 'video/3gpp';
    default: return 'video/mp4';
  }
}
