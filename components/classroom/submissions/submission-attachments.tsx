'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Paperclip, 
  Download, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive,
  File
} from 'lucide-react';
import { formatFileSize, getFileIcon } from '@/hooks/classroom/use-attachments';

interface SubmissionAttachment {
  id: number;
  file_name: string;
  file_url: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

interface SubmissionAttachmentsProps {
  attachments?: SubmissionAttachment[];
  className?: string;
  showTitle?: boolean;
  userRole?: 'owner' | 'tutor' | 'student';
}

export function SubmissionAttachments({
  attachments = [],
  className = "",
  showTitle = true,
  userRole = 'student'
}: SubmissionAttachmentsProps) {
  
  if (!attachments || attachments.length === 0) {
    return null; // Don't render anything if no attachments
  }

  const handleDownload = (attachment: SubmissionAttachment) => {
    // Open attachment URL in new tab for download
    window.open(attachment.file_url, '_blank');
  };

  const getFileTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4 text-green-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('doc')) return <FileText className="h-4 w-4 text-blue-600" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive className="h-4 w-4 text-orange-500" />;
    return <File className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className={className}>
      {showTitle && (
        <div className="flex items-center gap-2 mb-3">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Attachments ({attachments.length})
          </span>
        </div>
      )}
      
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <Card key={attachment.id} className="border border-gray-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getFileTypeIcon(attachment.mime_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {attachment.file_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size_bytes)} • {attachment.mime_type}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                    className="h-8 px-3"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {userRole === 'student' && (
        <div className="mt-2 p-2 bg-gray-50 rounded-md">
          <p className="text-xs text-muted-foreground">
            💡 These files were uploaded with your submission. 
            {userRole !== 'student' && ' As an instructor, you can download these files to review the submission.'}
          </p>
        </div>
      )}
      
      {(userRole === 'tutor' || userRole === 'owner') && (
        <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-xs text-blue-700">
            📎 Student submitted {attachments.length} file{attachments.length !== 1 ? 's' : ''} with this assignment. 
            Click "Download" to review the attached materials.
          </p>
        </div>
      )}
    </div>
  );
}
