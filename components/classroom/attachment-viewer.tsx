"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ClassroomAttachment } from "@/hooks/classroom/use-attachments";
import { Download, FileText, Image, Video, Music, Archive, File } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttachmentViewerProps {
  attachment: ClassroomAttachment;
  showDownloadButton?: boolean;
}

export function AttachmentViewer({ attachment, showDownloadButton = true }: AttachmentViewerProps) {
  const t = useTranslations('AttachmentViewer');
  const [fileUrl, setFileUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use the permanent-looking URL from database
    // This will dynamically generate signed URLs on the backend
    setFileUrl(attachment.file_url);
    setLoading(false);
  }, [attachment]);

  // Get appropriate icon based on mime type
  const getFileIcon = () => {
    if (attachment.mime_type.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    } else if (attachment.mime_type.startsWith('video/')) {
      return <Video className="w-4 h-4" />;
    } else if (attachment.mime_type.startsWith('audio/')) {
      return <Music className="w-4 h-4" />;
    } else if (attachment.mime_type.includes('pdf')) {
      return <FileText className="w-4 h-4" />;
    } else if (attachment.mime_type.includes('zip') || attachment.mime_type.includes('rar')) {
      return <Archive className="w-4 h-4" />;
    } else {
      return <File className="w-4 h-4" />;
    }
  };

  // Format file size - prefer KB for better readability
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    
    // For files less than 1 KB, show in bytes
    if (bytes < k) {
      return bytes + ' Bytes';
    }
    
    // For files less than 1 MB, show in KB
    if (bytes < k * k) {
      return (bytes / k).toFixed(1) + ' KB';
    }
    
    // For larger files, show in MB
    if (bytes < k * k * k) {
      return (bytes / (k * k)).toFixed(1) + ' MB';
    }
    
    // For very large files, show in GB
    return (bytes / (k * k * k)).toFixed(1) + ' GB';
  };

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = attachment.file_name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleView = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-100/5 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex-shrink-0">
        {getFileIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {attachment.file_name}
        </div>
        <div className="text-xs text-gray-400 flex items-center space-x-2">
          <span>{formatFileSize(attachment.size_bytes)}</span>
        </div>
        {attachment.custom_message && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
            "{attachment.custom_message}"
          </div>
        )}
      </div>

      {showDownloadButton && (
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleView}
            className="text-blue-600 dark:text-white"
          >
            {t('view')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-white"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Simple clickable attachment link (alternative minimal version)
 */
export function AttachmentLink({ attachment }: AttachmentViewerProps) {
  return (
    <a 
      href={attachment.file_url} 
      target="_blank" 
      rel="noreferrer"
      className="text-blue-600 hover:text-blue-800 underline"
    >
      {attachment.file_name}
    </a>
  );
}
