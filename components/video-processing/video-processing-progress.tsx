'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
  PlayCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useVideoProcessingStatus,
  useCancelVideoProcessing,
  getStepDisplayName,
  getStepDescription,
  getStatusColor,
  getStatusIcon,
  type VideoProcessingQueue,
  type VideoProcessingStep,
} from '@/hooks/video-processing/use-video-processing';

interface VideoProcessingProgressProps {
  queueId: string | null;
  isOpen: boolean;
  onClose: () => void;
  attachmentTitle?: string;
}

export function VideoProcessingProgress({
  queueId,
  isOpen,
  onClose,
  attachmentTitle,
}: VideoProcessingProgressProps) {
  const t = useTranslations('VideoProcessing');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Hooks
  const {
    data: queueData,
    isLoading,
    error,
    refetch,
  } = useVideoProcessingStatus(queueId, {
    enabled: isOpen && !!queueId,
  });

  const cancelMutation = useCancelVideoProcessing();

  // Auto-close when completed
  useEffect(() => {
    if (queueData?.status === 'completed') {
      toast.success('Video processing completed successfully! AI features are now available.');
      setTimeout(() => {
        onClose();
      }, 3000); // Auto-close after 3 seconds
    }
  }, [queueData?.status, onClose]);

  const handleCancel = async () => {
    if (!queueId) return;
    
    try {
      await cancelMutation.mutateAsync(queueId);
      setShowCancelDialog(false);
      onClose();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleRetry = () => {
    refetch();
  };

  const getOverallStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
      case 'retrying':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getOverallStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Queued for Processing';
      case 'processing':
        return 'Processing Video';
      case 'retrying':
        return 'Retrying (Server Waking Up)';
      case 'completed':
        return 'Processing Complete';
      case 'failed':
        return 'Processing Failed';
      case 'cancelled':
        return 'Processing Cancelled';
      default:
        return status;
    }
  };

  const renderStepCard = (step: VideoProcessingStep, index: number) => {
    const isActive = queueData?.current_step === step.step_name;
    const isCompleted = step.status === 'completed';
    const isFailed = step.status === 'failed';
    const isProcessing = step.status === 'processing';

    return (
      <Card
        key={step.step_name}
        className={`transition-all duration-200 ${
          isActive ? 'ring-2 ring-blue-500 bg-blue-50' : ''
        } ${isCompleted ? 'bg-green-50' : ''} ${isFailed ? 'bg-red-50' : ''}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border-2">
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <div>
                <CardTitle className="text-base">{getStepDisplayName(step.step_name)}</CardTitle>
                <CardDescription className="text-sm">
                  {getStepDescription(step.step_name)}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={isCompleted ? 'default' : isFailed ? 'destructive' : 'secondary'}
                className={`${getStatusColor(step.status)}`}
              >
                {getStatusIcon(step.status)} {step.status}
              </Badge>
              {step.retry_count > 0 && (
                <Badge variant="outline" className="text-orange-600">
                  Retry {step.retry_count}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        {(step.error_message || step.duration_seconds) && (
          <CardContent className="pt-0">
            {step.error_message && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{step.error_message}</span>
              </div>
            )}
            {step.duration_seconds && (
              <div className="text-sm text-muted-foreground mt-2">
                Duration: {Math.round(step.duration_seconds)}s
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  if (!isOpen || !queueId) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {queueData && getOverallStatusIcon(queueData.status)}
                <div>
                  <DialogTitle>Video Processing</DialogTitle>
                  <DialogDescription>
                    {attachmentTitle || queueData?.attachment_title || 'Processing video file'}
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Overall Progress */}
            {queueData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {getOverallStatusText(queueData.status)}
                    </span>
                    {queueData.status === 'retrying' && (
                      <Badge variant="outline" className="text-orange-600">
                        Attempt {queueData.retry_count}/{queueData.max_retries}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {queueData.progress_percentage}%
                  </span>
                </div>
                
                <Progress value={queueData.progress_percentage} className="h-2" />
                
                {queueData.estimated_completion_time && queueData.status === 'processing' && (
                  <p className="text-sm text-muted-foreground">
                    Estimated completion: {queueData.estimated_completion_time}
                  </p>
                )}
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading processing status...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Failed to load processing status</p>
                  <p className="text-sm">{error.message}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}

            {/* Processing Steps */}
            {queueData && queueData.steps && (
              <div className="space-y-3">
                <h3 className="font-medium">Processing Steps</h3>
                {queueData.steps.map((step, index) => renderStepCard(step, index))}
              </div>
            )}

            {/* Error Message */}
            {queueData?.error_message && queueData.status === 'failed' && (
              <div className="flex items-start gap-2 text-red-600 bg-red-50 p-4 rounded">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Processing Failed</p>
                  <p className="text-sm">{queueData.error_message}</p>
                  {queueData.retry_count >= queueData.max_retries && (
                    <p className="text-sm mt-1">
                      Maximum retry attempts ({queueData.max_retries}) exceeded.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <div>
                {queueData?.status === 'completed' && (
                  <Button onClick={onClose} className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Done
                  </Button>
                )}
                {queueData?.status === 'failed' && (
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                
                {queueData && !['completed', 'failed', 'cancelled'].includes(queueData.status) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Video Processing?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the video processing? This action cannot be undone,
              and you'll need to restart the process if you want to enable AI features for this video.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Processing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Processing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
