import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CourseAttachment } from '@/interface/courses/attachment-interface'
import { apiGet, apiSend, apiUploadFile } from '@/lib/api-config'
import { attachmentsApi } from '@/lib/api'
import { uploadToMegaClient, testMegaConnectionClient } from '@/lib/mega-client'

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

// Upload attachment using client-side MEGA upload
export function useUploadAttachment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      title, 
      file, 
      onProgress 
    }: {
      title: string
      file: File
      onProgress?: (progress: number) => void
    }) => {
      // Step 1: Upload file to MEGA (client-side, bypasses Next.js limits)
      onProgress?.(5)
      
      const uploadResult = await uploadToMegaClient(file, {
        onProgress: (megaProgress) => {
          // Map MEGA progress to 5-90% of total progress
          const mappedProgress = 5 + (megaProgress * 0.85)
          onProgress?.(mappedProgress)
        }
      })

      onProgress?.(95)

      // Step 2: Save metadata to database
      const response = await fetch(attachmentsApi.saveMetadata, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          url: uploadResult.url,
          size: uploadResult.size,
          type: uploadResult.type
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save attachment metadata')
      }

      onProgress?.(100)
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

// Legacy upload function for backward compatibility (uses original API route)
export function useUploadAttachmentLegacy() {
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

// Test MEGA connection (client-side)
export function useTestMegaConnection() {
  return useMutation({
    mutationFn: async () => {
      return testMegaConnectionClient()
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`MEGA connection test successful: ${result.message}`)
      } else {
        toast.error(`MEGA connection test failed: ${result.message}`)
      }
    },
    onError: (error) => {
      toast.error(`MEGA connection test error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })
}
