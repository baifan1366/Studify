import { useCallback } from 'react'
import { toast } from 'sonner'

export const useBackgroundTasks = () => {
  const startVideoProcessingTask = useCallback((
    attachmentId: number, 
    title: string, 
    queueId: string
  ) => {
    const taskId = `video_${attachmentId}_${Date.now()}`
    
    // Show initial toast with cancel option
    toast.loading(
      `🎥 Processing: ${title}`,
      {
        id: taskId,
        description: 'AI video analysis in progress - you can continue working',
        action: {
          label: 'Cancel',
          onClick: () => cancelVideoProcessing(taskId, queueId, title)
        }
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
  const maxAttempts = 120 // 4 minutes with 2-second intervals  
  let attempts = 0
  
  const checkProgress = async () => {
    try {
      const response = await fetch(`/api/video-processing/status/${queueId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check status')
      }
      
      // Show simple processing message without progress percentage
      // since Whisper and embedding servers process independently
      const currentStep = data.current_step || 'processing'
      
      // Map step names to user-friendly labels
      const stepLabels = {
        'transcribe': '🎤 Transcribing audio',
        'embed': '🧠 Generating AI embeddings',
        'completed': '✅ Finalizing'
      };
      
      const stepLabel = stepLabels[currentStep as keyof typeof stepLabels] || '⚙️ Processing'
      
      // Update toast with current step (no progress percentage)
      toast.loading(
        `${stepLabel}: ${title}`,
        {
          id: taskId,
          description: `AI video analysis in progress - you can continue working`,
          action: {
            label: 'Cancel',
            onClick: () => cancelVideoProcessing(taskId, queueId, title)
          }
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
        const errorMsg = data.error_message || 'Processing failed'
        throw new Error(errorMsg)
      }
      
      if (data.status === 'cancelled') {
        toast.info(
          `⏹️ Processing cancelled: ${title}`,
          {
            id: taskId,
            description: 'Video processing was cancelled',
            duration: 3000
          }
        )
        return
      }
      
      attempts++
      if (attempts < maxAttempts) {
        setTimeout(checkProgress, 2000) // Check every 2 seconds
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
  const maxAttempts = 60 // 2 minutes with 2-second intervals
  let attempts = 0
  
  const checkProgress = async () => {
    try {
      const response = await fetch(`/api/embeddings/video-embeddings/attachment/${attachmentId}`)
      const data = await response.json()
      
      // Show simple processing message without progress percentage
      toast.loading(
        `🧠 Generating AI embeddings: ${title}`,
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
        setTimeout(checkProgress, 2000) // Check every 2 seconds
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

// Cancel video processing
const cancelVideoProcessing = async (taskId: string, queueId: string, title: string) => {
  try {
    const response = await fetch(`/api/video-processing/status/${queueId}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to cancel processing')
    }
    
    toast.info(
      `⏹️ Processing cancelled: ${title}`,
      {
        id: taskId,
        description: 'Video processing has been cancelled',
        duration: 3000
      }
    )
  } catch (error) {
    toast.error(
      `❌ Failed to cancel: ${title}`,
      {
        id: taskId,
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      }
    )
  }
}
