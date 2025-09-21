import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend, apiGet } from '@/lib/api-config';

interface CourseNote {
  id: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  timestampSec?: number;
  content: string;
  aiSummary?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface CreateNoteData {
  lessonId: number;
  timestampSec?: number;
  content: string;
  tags?: string[];
}

interface UpdateNoteData {
  noteId: string;
  content?: string;
  tags?: string[];
  timestampSec?: number;
}

interface NotesResponse {
  success: boolean;
  notes: CourseNote[];
}

interface NoteResponse {
  success: boolean;
  note: CourseNote;
}

export function useCourseNotes(lessonId?: number, courseId?: number) {
  return useQuery<CourseNote[]>({
    queryKey: ['course-notes', courseId, lessonId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (lessonId) params.append('lessonId', lessonId.toString());
      if (courseId) params.append('courseId', courseId.toString());
      
      const response = await apiGet<NotesResponse>(
        `/api/course/notes?${params.toString()}`
      );
      return response.notes;
    },
    enabled: !!(lessonId || courseId),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation<NoteResponse, Error, CreateNoteData>({
    mutationFn: async (data) => {
      return apiSend<NoteResponse, CreateNoteData>({
        url: '/api/course/notes',
        method: 'POST',
        body: data,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate notes queries
      queryClient.invalidateQueries({ 
        queryKey: ['course-notes', undefined, variables.lessonId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['course-notes'] 
      });
    },
    onError: (error) => {
      console.error('Note creation failed:', error);
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation<NoteResponse, Error, UpdateNoteData>({
    mutationFn: async (data) => {
      return apiSend<NoteResponse, UpdateNoteData>({
        url: '/api/course/notes',
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: () => {
      // Invalidate all notes queries
      queryClient.invalidateQueries({ 
        queryKey: ['course-notes'] 
      });
    },
    onError: (error) => {
      console.error('Note update failed:', error);
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: async (noteId) => {
      return apiSend<{ success: boolean; message: string }>({
        url: `/api/course/notes?noteId=${noteId}`,
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Invalidate all notes queries
      queryClient.invalidateQueries({ 
        queryKey: ['course-notes'] 
      });
    },
    onError: (error) => {
      console.error('Note deletion failed:', error);
    },
  });
}
