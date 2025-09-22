'use client';

import { motion } from 'framer-motion';
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface MegaUploadProgressProps {
  fileName: string;
  fileSize: number;
  progress: UploadProgress | null;
  isUploading: boolean;
  isComplete: boolean;
  hasError: boolean;
  error?: Error | null;
  onCancel?: () => void;
  onRetry?: () => void;
}

export function MegaUploadProgress({
  fileName,
  fileSize,
  progress,
  isUploading,
  isComplete,
  hasError,
  error,
  onCancel,
  onRetry
}: MegaUploadProgressProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUploadStatus = () => {
    if (hasError) return 'error';
    if (isComplete) return 'complete';
    if (isUploading) return 'uploading';
    return 'waiting';
  };

  const status = getUploadStatus();

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'uploading':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Upload className="h-5 w-5 text-blue-500" />
          </motion.div>
        );
      default:
        return <Upload className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'complete':
        return 'Upload complete';
      case 'error':
        return 'Upload failed';
      case 'uploading':
        return progress ? `Uploading... ${progress.percentage}%` : 'Preparing upload...';
      default:
        return 'Ready to upload';
    }
  };

  const getProgressText = () => {
    if (!progress) return '';
    const loaded = formatFileSize(progress.loaded);
    const total = formatFileSize(progress.total);
    return `${loaded} / ${total}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full max-w-md"
    >
      <Card className="border border-border/50 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getStatusIcon()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(fileSize)}
                  </p>
                </div>
              </div>
              
              {onCancel && isUploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="h-8 w-8 p-0 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            {isUploading && progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{getStatusText()}</span>
                  <span className="text-muted-foreground">{getProgressText()}</span>
                </div>
                <Progress value={progress.percentage} className="h-2" />
              </div>
            )}

            {/* Status Message */}
            {!isUploading && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{getStatusText()}</span>
                {hasError && error && (
                  <span className="text-xs text-red-500 truncate max-w-[200px]">
                    {error.message}
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            {hasError && onRetry && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="flex-1"
                >
                  Retry Upload
                </Button>
              </div>
            )}

            {/* MEGA Upload Info */}
            {isUploading && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span>Uploading to MEGA cloud storage</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Container for multiple uploads
interface MegaUploadProgressContainerProps {
  uploads: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    progress: UploadProgress | null;
    isUploading: boolean;
    isComplete: boolean;
    hasError: boolean;
    error?: Error | null;
  }>;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
}

export function MegaUploadProgressContainer({
  uploads,
  onCancel,
  onRetry
}: MegaUploadProgressContainerProps) {
  if (uploads.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-h-96 overflow-y-auto">
      {uploads.map((upload) => (
        <MegaUploadProgress
          key={upload.id}
          fileName={upload.fileName}
          fileSize={upload.fileSize}
          progress={upload.progress}
          isUploading={upload.isUploading}
          isComplete={upload.isComplete}
          hasError={upload.hasError}
          error={upload.error}
          onCancel={onCancel ? () => onCancel(upload.id) : undefined}
          onRetry={onRetry ? () => onRetry(upload.id) : undefined}
        />
      ))}
    </div>
  );
}
