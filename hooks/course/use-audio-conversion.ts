import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface ConvertToAudioResponse {
  success: boolean
  mp3Url: string
  message: string
}

interface ConvertToAudioParams {
  attachmentId: number
  ownerId: number
}

const convertToAudio = async ({ attachmentId }: ConvertToAudioParams): Promise<ConvertToAudioResponse> => {
  const response = await fetch(`/api/attachments/${attachmentId}/convert-to-audio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to convert video to audio')
  }

  return response.json()
}

export function useConvertToAudio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: convertToAudio,
    onSuccess: (data) => {
      toast.success(data.message || 'Video successfully converted to audio')
      // Invalidate attachments query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['attachments'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to convert video to audio')
    },
  })
}
