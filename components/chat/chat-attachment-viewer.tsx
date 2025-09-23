"use client";

import { useState, useEffect } from "react";
import { Download, FileText, Image, Video, Music, Archive, File, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatAttachment {
  id: number;
  file_name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  file_url: string;
  custom_message?: string;
}

interface ChatAttachmentViewerProps {
  attachment: ChatAttachment;
  showDownloadButton?: boolean;
  compact?: boolean;
}

export function ChatAttachmentViewer({ 
  attachment, 
  showDownloadButton = true,
  compact = false 
}: ChatAttachmentViewerProps) {
  const [fileUrl, setFileUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use the chat attachments API endpoint
    setFileUrl(`/api/chat/attachments/${attachment.id}`);
    setLoading(false);
  }, [attachment]);

  // Get appropriate icon based on mime type
  const getFileIcon = () => {
    const iconClass = compact ? "w-3 h-3" : "w-4 h-4";
    
    if (attachment.mime_type.startsWith('image/')) {
      return <Image className={iconClass} />;
    } else if (attachment.mime_type.startsWith('video/')) {
      return <Video className={iconClass} />;
    } else if (attachment.mime_type.startsWith('audio/')) {
      return <Music className={iconClass} />;
    } else if (attachment.mime_type.includes('pdf')) {
      return <FileText className={iconClass} />;
    } else if (attachment.mime_type.includes('zip') || attachment.mime_type.includes('rar')) {
      return <Archive className={iconClass} />;
    } else {
      return <File className={iconClass} />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    
    if (bytes < k) {
      return bytes + ' Bytes';
    } else if (bytes < k * k) {
      return Math.round(bytes / k) + ' KB';
    } else if (bytes < k * k * k) {
      return (bytes / (k * k)).toFixed(1) + ' MB';
    } else {
      return (bytes / (k * k * k)).toFixed(1) + ' GB';
    }
  };

  // Handle download
  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = attachment.original_name || attachment.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Handle view in new tab
  const handleView = () => {
    window.open(fileUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-lg">
        <div className="w-4 h-4 animate-spin border-2 border-primary border-t-transparent rounded-full" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  // Image preview for images
  if (attachment.mime_type.startsWith('image/')) {
    return (
      <div className="rounded-lg overflow-hidden max-w-sm">
        <img 
          src={fileUrl} 
          alt={attachment.original_name}
          className="w-full h-auto max-h-64 object-cover"
          onError={() => setFileUrl('/api/placeholder-image')}
        />
        <div className="p-2 bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {getFileIcon()}
            <span className="text-xs text-muted-foreground truncate">
              {attachment.original_name}
            </span>
          </div>
          {showDownloadButton && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleView}
                title="View in new tab"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleDownload}
                title="Download"
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default file attachment display
  return (
    <div className={`flex items-center space-x-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors ${
      compact ? 'p-2 space-x-2' : ''
    }`}>
      <div className="flex-shrink-0">
        {getFileIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-foreground truncate ${
          compact ? 'text-xs' : 'text-sm'
        }`}>
          {attachment.file_name}
        </div>
        <div className={`text-muted-foreground flex items-center space-x-2 ${
          compact ? 'text-xs' : 'text-xs'
        }`}>
          <span>{formatFileSize(attachment.size_bytes)}</span>
        </div>
        {attachment.custom_message && (
          <div className={`text-muted-foreground mt-1 italic ${
            compact ? 'text-xs' : 'text-xs'
          }`}>
            "{attachment.custom_message}"
          </div>
        )}
      </div>

      {showDownloadButton && (
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className={compact ? "h-6 w-6 p-0" : "h-8 w-8 p-0"}
            onClick={handleView}
            title="View in new tab"
          >
            <ExternalLink className={compact ? "h-3 w-3" : "h-4 w-4"} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={compact ? "h-6 w-6 p-0" : "h-8 w-8 p-0"}
            onClick={handleDownload}
            title="Download"
          >
            <Download className={compact ? "h-3 w-3" : "h-4 w-4"} />
          </Button>
        </div>
      )}
    </div>
  );
}
