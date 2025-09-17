import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CourseAttachment } from '@/interface/courses/attachment-interface'
import { apiGet, apiSend, apiUploadFile } from '@/lib/api-config'
import { attachmentsApi } from '@/lib/api'

// Fetch attachments by owner
export function useAttachments(ownerId?: number) {
  return useQuery({
    queryKey: ['attachments', ownerId],
    queryFn: async () => {
      const url = ownerId 
        ? attachmentsApi.listByOwner(ownerId)
        : attachmentsApi.list
      
      return apiGet<CourseAttachment[]>(url)
    },
    enabled: true
  })
}

// Upload attachment
export function useUploadAttachment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ title, file }: {
      title: string
      file: File
    }) => {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('file', file)

      const response = await fetch(attachmentsApi.create, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      return response.json() as Promise<CourseAttachment>
    },
    onSuccess: (data) => {
      toast.success('File uploaded successfully!')
      // Invalidate and refetch attachments
      queryClient.invalidateQueries({ queryKey: ['attachments'] })
      queryClient.invalidateQueries({ queryKey: ['attachments', data.owner_id] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    }
  })
}

// Update attachment
export function useUpdateAttachment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, title, ownerId }: {
      id: number
      title: string
      ownerId?: number
    }) => {
      return apiSend<CourseAttachment, { title: string; owner_id?: number }>({
        url: attachmentsApi.update(id),
        method: 'PATCH',
        body: { title, owner_id: ownerId }
      })
    },
    onSuccess: (data) => {
      toast.success('Attachment updated successfully!')
      // Invalidate and refetch attachments
      queryClient.invalidateQueries({ queryKey: ['attachments'] })
      queryClient.invalidateQueries({ queryKey: ['attachments', data.owner_id] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Update failed')
    }
  })
}

// Delete attachment
export function useDeleteAttachment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ownerId }: {
      id: number
      ownerId?: number
    }) => {
      const url = ownerId 
        ? attachmentsApi.deleteByOwner(id, ownerId)
        : attachmentsApi.delete(id)
        
      return apiSend<{ message: string }>({
        url,
        method: 'DELETE'
      })
    },
    onSuccess: (data, variables) => {
      toast.success('Attachment deleted successfully!')
      // Invalidate and refetch attachments
      queryClient.invalidateQueries({ queryKey: ['attachments'] })
      if (variables.ownerId) {
        queryClient.invalidateQueries({ queryKey: ['attachments', variables.ownerId] })
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    }
  })
}
