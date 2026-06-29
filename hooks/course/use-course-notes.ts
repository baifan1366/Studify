import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend, apiGet } from '@/lib/api-config';

export interface CourseNote {
  id: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  timestampSec?: number;
  content: string;
  aiSummary?: string;
  tags: string[];
  title?: string;
  noteType?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateNoteData {
  lessonId: string | number;
  courseId?: string | number;
  timestampSec?: number;
  content: string;
  aiSummary?: string;
  tags?: string[];
  title?: string;
  noteType?: string;
}

interface UpdateNoteData {
  noteId: string;
  content?: string;
  tags?: string[];
  timestampSec?: number;
  title?: string;
}

interface NotesResponse {
  success: boolean;
  notes: CourseNote[];
}

interface NoteResponse {
  success: boolean;
  note: CourseNote;
}

export function useCourseNotes(lessonId?: string | number, courseId?: string | number) {
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
    onSuccess: (_data, variables) => {
      // Invalidate notes queries
      queryClient.invalidateQueries({ 
        queryKey: ['course-notes', undefined, variables.lessonId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['course-notes'] 
      });
      queryClient.invalidateQueries({ queryKey: ['ai-notes'] });
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
      queryClient.invalidateQueries({ queryKey: ['ai-notes'] });
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
      queryClient.invalidateQueries({ queryKey: ['ai-notes'] });
    },
    onError: (error) => {
      console.error('Note deletion failed:', error);
    },
  });
}

export function useAIEditNote() {
  return useMutation<{ success: boolean; content: string }, Error, {
    instruction: string;
    content: string;
    noteId?: string;
  }>({
    mutationFn: (data) => apiSend({
      url: '/api/course/notes/ai-edit',
      method: 'POST',
      body: data,
    }),
  });
}
