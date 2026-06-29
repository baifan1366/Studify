import { useCallback } from 'react'
import { toast } from 'sonner'

/**
 * Video processing runs independently of the browser. The server writes a
 * notification after the transcript and both embeddings have been persisted,
 * so client-side polling is unnecessary and can report false timeouts.
 */
export const useBackgroundTasks = () => {
  const startVideoProcessingTask = useCallback((
    attachmentId: number,
    title: string,
    _queueId: string
  ) => {
    const taskId = `video_${attachmentId}_${Date.now()}`

    toast.success(`Processing started: ${title}`, {
      id: taskId,
      description: 'You can continue working. We will notify you when AI embeddings are ready.',
      duration: 6000,
    })

    return taskId
  }, [])

  return {
    startVideoProcessingTask,
  }
}
