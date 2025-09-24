'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface Recording {
  id: number;
  public_id: string;
  session_id: number;
  url: string;
  duration_sec: number;
  created_at: string;
  classroom_live_session?: {
    id: number;
    session_name: string;
    status: string;
  };
}

export interface CreateRecordingData {
  file: File;
  session_id: string;
  duration_sec?: number;
}

export interface UpdateRecordingData {
  duration_sec?: number;
}

// Hook to fetch all recordings for a classroom
export function useRecordings(classroomSlug: string, sessionId?: string) {
  const queryKey = ['recordings', classroomSlug, sessionId].filter(Boolean);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = new URL(`${API_BASE_URL}/classroom/${classroomSlug}/recordings`);
      if (sessionId) {
        url.searchParams.set('session_id', sessionId);
      }

      const response = await fetch(url.toString(), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recordings');
      }

      return response.json() as Promise<Recording[]>;
    },
    enabled: !!classroomSlug,
  });
}

// Hook to fetch a specific recording
export function useRecording(classroomSlug: string, recordingId: string) {
  return useQuery({
    queryKey: ['recording', classroomSlug, recordingId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/classroom/${classroomSlug}/recordings/${recordingId}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch recording');
      }

      return response.json() as Promise<Recording>;
    },
    enabled: !!classroomSlug && !!recordingId,
  });
}

// Hook to create/upload a new recording
export function useCreateRecording(classroomSlug: string) {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async (data: CreateRecordingData) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('session_id', data.session_id);
      if (data.duration_sec) {
        formData.append('duration_sec', data.duration_sec.toString());
      }

      return new Promise<Recording>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          setUploadProgress(0);
          console.log('Upload response:', {
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText
          });
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              console.error('JSON parse error:', error);
              reject(new Error('Invalid JSON response'));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              console.error('Upload error:', error);
              reject(new Error(error.error || `Upload failed with status ${xhr.status}: ${xhr.statusText}`));
            } catch {
              console.error('Failed to parse error response:', xhr.responseText);
              reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          setUploadProgress(0);
          reject(new Error('Network error'));
        });

        xhr.open('POST', `${API_BASE_URL}/classroom/${classroomSlug}/recordings`);
        xhr.withCredentials = true;
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      // Invalidate and refetch recordings
      queryClient.invalidateQueries({ queryKey: ['recordings', classroomSlug] });
    },
    onError: () => {
      setUploadProgress(0);
    },
  });

  return {
    ...mutation,
    uploadProgress,
  };
}

// Hook to update recording metadata
export function useUpdateRecording(classroomSlug: string, recordingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateRecordingData) => {
      const response = await fetch(
        `${API_BASE_URL}/classroom/${classroomSlug}/recordings/${recordingId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update recording');
      }

      return response.json() as Promise<Recording>;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['recording', classroomSlug, recordingId] });
      queryClient.invalidateQueries({ queryKey: ['recordings', classroomSlug] });
    },
  });
}

// Hook to delete a recording
export function useDeleteRecording(classroomSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordingId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/classroom/${classroomSlug}/recordings/${recordingId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete recording');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch recordings
      queryClient.invalidateQueries({ queryKey: ['recordings', classroomSlug] });
    },
  });
}

// Combined hook for recording management
export function useRecordingManager(classroomSlug: string) {
  const createRecording = useCreateRecording(classroomSlug);
  const deleteRecording = useDeleteRecording(classroomSlug);
  const [uploadProgress] = useState(0); // This should be handled by the createRecording hook

  return {
    // Queries
    useRecordings: (sessionId?: string) => useRecordings(classroomSlug, sessionId),
    useRecording: (recordingId: string) => useRecording(classroomSlug, recordingId),
    
    // Mutations
    createRecording,
    deleteRecording,
    updateRecording: (recordingId: string) => useUpdateRecording(classroomSlug, recordingId),
    
    // Upload progress - get from the createRecording hook
    uploadProgress: createRecording.uploadProgress,
    
    // Status
    isUploading: createRecording.isPending,
    isDeleting: deleteRecording.isPending,
  };
}
