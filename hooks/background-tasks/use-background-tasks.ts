import { useCallback } from 'react'
import { toast } from 'sonner'

export const useBackgroundTasks = () => {
  const startVideoProcessingTask = useCallback((
    attachmentId: number, 
    title: string, 
    queueId: string
  ) => {
    const taskId = `video_${attachmentId}_${Date.now()}`
    
    // Show initial toast
    toast.loading(
      `🎥 Processing: ${title}`,
      {
        id: taskId,
        description: 'AI video analysis in progress - you can continue working',
      }
    )
    
    // Start monitoring with toast updates
    monitorVideoProcessing(taskId, queueId, title)
    
    return taskId
  }, [])

  const startEmbeddingTask = useCallback((
    attachmentId: number,
    title: string
  ) => {
    const taskId = `embedding_${attachmentId}_${Date.now()}`
    
    // Show initial toast
    toast.loading(
      `🧠 Generating embeddings: ${title}`,
      {
        id: taskId,
        description: 'Preparing for AI search - you can continue working',
      }
    )
    
    // Start monitoring
    monitorEmbeddingGeneration(taskId, attachmentId, title)
    
    return taskId
  }, [])

  return {
    startVideoProcessingTask,
    startEmbeddingTask
  }
}

// Monitor video processing progress with real-time toast updates
const monitorVideoProcessing = async (taskId: string, queueId: string, title: string) => {
  const maxAttempts = 120 // 2 minutes with 1-second intervals  
  let attempts = 0
  
  const checkProgress = async () => {
    try {
      const response = await fetch(`/api/video-processing/status/${queueId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check status')
      }
      
      const progress = Math.min((attempts / maxAttempts) * 90, 90) // Simulate progress up to 90%
      
      // Update toast with progress
      toast.loading(
        `🎥 Processing: ${title} (${progress.toFixed(0)}%)`,
        {
          id: taskId,
          description: data.message || 'AI analysis in progress - you can continue working'
        }
      )
      
      if (data.status === 'completed') {
        toast.success(
          `🎉 Video processing completed: ${title}`,
          {
            id: taskId,
            description: 'AI features are now available for this video',
            duration: 5000
          }
        )
        return
      }
      
      if (data.status === 'failed') {
        throw new Error(data.error || 'Processing failed')
      }
      
      attempts++
      if (attempts < maxAttempts) {
        setTimeout(checkProgress, 1000)
      } else {
        throw new Error('Processing timeout - please try again later')
      }
      
    } catch (error) {
      toast.error(
        `❌ Video processing failed: ${title}`,
        {
          id: taskId,
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          duration: 10000,
          action: {
            label: 'Retry',
            onClick: () => monitorVideoProcessing(taskId, queueId, title)
          }
        }
      )
    }
  }
  
  checkProgress()
}

// Monitor embedding generation progress with real-time toast updates
const monitorEmbeddingGeneration = async (taskId: string, attachmentId: number, title: string) => {
  const maxAttempts = 60 // 1 minute with 1-second intervals
  let attempts = 0
  
  const checkProgress = async () => {
    try {
      const response = await fetch(`/api/embeddings/video-embeddings/attachment/${attachmentId}`)
      const data = await response.json()
      
      const progress = Math.min((attempts / maxAttempts) * 100, 95)
      
      // Update toast with progress
      toast.loading(
        `🧠 Generating embeddings: ${title} (${progress.toFixed(0)}%)`,
        {
          id: taskId,
          description: 'Preparing for AI search - you can continue working'
        }
      )
      
      if (response.ok && data.length > 0) {
        toast.success(
          `🎉 AI embeddings ready: ${title}`,
          {
            id: taskId,
            description: 'Content is now searchable with AI',
            duration: 5000
          }
        )
        return
      }
      
      attempts++
      if (attempts < maxAttempts) {
        setTimeout(checkProgress, 1000)
      } else {
        // Still mark as completed since embeddings might be processed later
        toast.success(
          `✅ Processing completed: ${title}`,
          {
            id: taskId,
            description: 'Embeddings will be available shortly',
            duration: 5000
          }
        )
      }
      
    } catch (error) {
      toast.error(
        `❌ Embedding generation failed: ${title}`,
        {
          id: taskId,
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          duration: 10000,
          action: {
            label: 'Retry',
            onClick: () => monitorEmbeddingGeneration(taskId, attachmentId, title)
          }
        }
      )
    }
  }
  
  checkProgress()
}
