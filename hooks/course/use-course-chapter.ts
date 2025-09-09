import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Chapter } from '@/interface/courses/chapter-interface'
import { CourseChapterInput, CourseChapterUpdateInput } from '@/lib/validations/course-chapter'
import { apiGet, apiSend } from '@/lib/api-config'
import { coursesApi } from '@/lib/api'

// Fetch chapters by lesson ID
export function useChapters(lessonId: number, ownerId?: number) {
  return useQuery({
    queryKey: ['chapters', lessonId, ownerId],
    queryFn: async () => {
      const url = ownerId 
        ? `${coursesApi.getChaptersByLessonId(lessonId)}?owner_id=${ownerId}`
        : coursesApi.getChaptersByLessonId(lessonId)
      
      return apiGet<Chapter[]>(url)
    },
    enabled: !!lessonId
  })
}

// Fetch single chapter by ID
export function useChapter(lessonId: number, chapterId: number, ownerId?: number) {
  return useQuery({
    queryKey: ['chapter', lessonId, chapterId, ownerId],
    queryFn: async () => {
      const url = ownerId 
        ? `${coursesApi.getChapterById(lessonId, chapterId)}?owner_id=${ownerId}`
        : coursesApi.getChapterById(lessonId, chapterId)
      
      return apiGet<Chapter>(url)
    },
    enabled: !!lessonId && !!chapterId
  })
}

// Create new chapter
export function useCreateChapter() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ lessonId, ownerId, ...chapterData }: 
      CourseChapterInput & { lessonId: number; ownerId?: number }
    ) => {
      return apiSend<Chapter, CourseChapterInput & { owner_id?: number }>({
        url: coursesApi.createChapterByLessonId(lessonId),
        method: 'POST',
        body: { ...chapterData, owner_id: ownerId }
      })
    },
    onSuccess: (data, variables) => {
      toast.success('Chapter created successfully!')
      // Invalidate and refetch chapters
      queryClient.invalidateQueries({ queryKey: ['chapters', variables.lessonId] })
      if (variables.ownerId) {
        queryClient.invalidateQueries({ queryKey: ['chapters', variables.lessonId, variables.ownerId] })
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create chapter')
    }
  })
}

// Update existing chapter
export function useUpdateChapter() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ lessonId, chapterId, ownerId, ...updateData }: 
      CourseChapterUpdateInput & { lessonId: number; chapterId: number; ownerId?: number }
    ) => {
      return apiSend<Chapter, CourseChapterUpdateInput & { owner_id?: number }>({
        url: coursesApi.updateChapterById(lessonId, chapterId),
        method: 'PATCH',
        body: { ...updateData, owner_id: ownerId }
      })
    },
    onSuccess: (data, variables) => {
      toast.success('Chapter updated successfully!')
      // Invalidate and refetch chapters
      queryClient.invalidateQueries({ queryKey: ['chapters', variables.lessonId] })
      queryClient.invalidateQueries({ queryKey: ['chapter', variables.lessonId, variables.chapterId] })
      if (variables.ownerId) {
        queryClient.invalidateQueries({ queryKey: ['chapters', variables.lessonId, variables.ownerId] })
        queryClient.invalidateQueries({ queryKey: ['chapter', variables.lessonId, variables.chapterId, variables.ownerId] })
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update chapter')
    }
  })
}

// Delete chapter
export function useDeleteChapter() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ lessonId, chapterId, ownerId }: {
      lessonId: number
      chapterId: number
      ownerId?: number
    }) => {
      const url = ownerId 
        ? `${coursesApi.deleteChapterById(lessonId, chapterId)}?owner_id=${ownerId}`
        : coursesApi.deleteChapterById(lessonId, chapterId)
        
      return apiSend<{ success: boolean }>({
        url,
        method: 'DELETE'
      })
    },
    onSuccess: (data, variables) => {
      toast.success('Chapter deleted successfully!')
      // Invalidate and refetch chapters
      queryClient.invalidateQueries({ queryKey: ['chapters', variables.lessonId] })
      queryClient.invalidateQueries({ queryKey: ['chapter', variables.lessonId, variables.chapterId] })
      if (variables.ownerId) {
        queryClient.invalidateQueries({ queryKey: ['chapters', variables.lessonId, variables.ownerId] })
        queryClient.invalidateQueries({ queryKey: ['chapter', variables.lessonId, variables.chapterId, variables.ownerId] })
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete chapter')
    }
  })
}