import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
interface DocumentProcessingJob {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  result?: {
    previewUrl?: string
    thumbnailUrl?: string
    pageCount?: number
    fileSize?: number
    textContent?: string
  }
  error?: string
  estimatedProcessingTime?: number
  createdAt?: string
  updatedAt?: string
}

interface QueueDocumentRequest {
  attachmentId: number
  documentType: 'pdf' | 'text' | 'office'
  priority?: 'low' | 'normal' | 'high'
}

// API functions
async function queueDocumentProcessing(request: QueueDocumentRequest): Promise<DocumentProcessingJob> {
  const response = await fetch('/api/preview/document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to queue document processing')
  }

  return response.json()
}

async function getDocumentJobStatus(jobId: string): Promise<DocumentProcessingJob> {
  const response = await fetch(`/api/preview/document?jobId=${encodeURIComponent(jobId)}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get job status')
  }

  return response.json()
}

// Hook for async document preview
export function useAsyncDocumentPreview(attachmentId: number | null, documentType: 'pdf' | 'text' | 'office') {
  const [jobId, setJobId] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<number | false>(false)
  const queryClient = useQueryClient()

  // Queue document processing mutation
  const queueMutation = useMutation({
    mutationFn: queueDocumentProcessing,
    onSuccess: (data) => {
      console.log('✅ Document queued for processing:', data.jobId)
      setJobId(data.jobId)
      
      // Start polling if job is not completed
      if (data.status === 'queued' || data.status === 'processing') {
        setPollingInterval(2000) // Poll every 2 seconds
      }
    },
    onError: (error) => {
      console.error('❌ Failed to queue document:', error)
    }
  })

  // Job status query with polling
  const jobStatusQuery = useQuery({
    queryKey: ['document-job-status', jobId],
    queryFn: () => jobId ? getDocumentJobStatus(jobId) : Promise.reject('No job ID'),
    enabled: !!jobId,
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: true,
    staleTime: 0, // Always fetch fresh data
    retry: (failureCount, error) => {
      // Don't retry on 404 (job not found) or 403 (access denied)
      if (error instanceof Error && (error.message.includes('Job not found') || error.message.includes('Access denied'))) {
        return false
      }
      return failureCount < 3
    }
  })

  // Stop polling when job is completed or failed
  useEffect(() => {
    if (jobStatusQuery.data) {
      const status = jobStatusQuery.data.status
      
      if (status === 'completed' || status === 'failed') {
        console.log(`📋 Job ${jobId} finished with status: ${status}`)
        setPollingInterval(false)
      }
    }
  }, [jobStatusQuery.data, jobId])

  // Start processing function
  const startProcessing = useCallback((priority: 'low' | 'normal' | 'high' = 'normal') => {
    if (!attachmentId) {
      console.error('❌ Cannot start processing: No attachment ID')
      return
    }

    console.log('🚀 Starting document processing:', { attachmentId, documentType, priority })
    
    queueMutation.mutate({
      attachmentId,
      documentType,
      priority
    })
  }, [attachmentId, documentType, queueMutation])

  // Reset processing function
  const resetProcessing = useCallback(() => {
    setJobId(null)
    setPollingInterval(false)
    queryClient.removeQueries({ queryKey: ['document-job-status'] })
  }, [queryClient])

  // Calculate processing progress and stage info
  const processingInfo = {
    isProcessing: jobStatusQuery.data?.status === 'processing' || jobStatusQuery.data?.status === 'queued',
    isCompleted: jobStatusQuery.data?.status === 'completed',
    isFailed: jobStatusQuery.data?.status === 'failed',
    progress: jobStatusQuery.data?.progress || 0,
    stage: getProcessingStage(jobStatusQuery.data?.progress || 0),
    estimatedTimeRemaining: getEstimatedTimeRemaining(
      jobStatusQuery.data?.progress || 0,
      jobStatusQuery.data?.estimatedProcessingTime || 60
    ),
    result: jobStatusQuery.data?.result,
    error: jobStatusQuery.data?.error
  }

  return {
    // Actions
    startProcessing,
    resetProcessing,
    
    // Status
    jobId,
    ...processingInfo,
    
    // Loading states
    isQueueing: queueMutation.isPending,
    isPolling: !!pollingInterval,
    
    // Raw data
    jobData: jobStatusQuery.data,
    queueError: queueMutation.error,
    statusError: jobStatusQuery.error
  }
}

// Helper functions
function getProcessingStage(progress: number): string {
  if (progress === 0) return 'Queued for processing...'
  if (progress < 20) return 'Starting document processing...'
  if (progress < 40) return 'Downloading document...'
  if (progress < 70) return 'Processing document content...'
  if (progress < 90) return 'Generating preview...'
  if (progress < 100) return 'Finalizing...'
  return 'Processing completed!'
}

function getEstimatedTimeRemaining(progress: number, totalEstimatedTime: number): number {
  if (progress >= 100) return 0
  if (progress === 0) return totalEstimatedTime
  
  // Calculate remaining time based on progress
  const elapsedRatio = progress / 100
  const remainingRatio = 1 - elapsedRatio
  
  return Math.ceil(totalEstimatedTime * remainingRatio)
}

// Hook for managing multiple document processing jobs
export function useDocumentProcessingQueue() {
  const [activeJobs, setActiveJobs] = useState<Set<string>>(new Set())
  
  const addJob = useCallback((jobId: string) => {
    setActiveJobs(prev => new Set([...prev, jobId]))
  }, [])
  
  const removeJob = useCallback((jobId: string) => {
    setActiveJobs(prev => {
      const newJobs = new Set(prev)
      newJobs.delete(jobId)
      return newJobs
    })
  }, [])
  
  const clearAllJobs = useCallback(() => {
    setActiveJobs(new Set())
  }, [])
  
  return {
    activeJobs: Array.from(activeJobs),
    activeJobCount: activeJobs.size,
    addJob,
    removeJob,
    clearAllJobs,
    hasActiveJobs: activeJobs.size > 0
  }
}
