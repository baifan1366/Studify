"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPostFormData } from "@/lib/api-config";
import { toast } from "sonner";

export interface ClassroomAttachment {
  id: number;
  public_id: string;
  file_url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  profiles: {
    display_name: string;
    avatar_url?: string;
  };
}

/**
 * Hook for managing classroom attachments
 */
export function useAttachments(classroomSlug: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch attachments
  const {
    data: attachments = [],
    isLoading,
    error,
    refetch
  } = useQuery<ClassroomAttachment[]>({
    queryKey: ["classroom", classroomSlug, "attachments"],
    queryFn: () => apiGet<ClassroomAttachment[]>(`/api/classroom/${classroomSlug}/attachments`),
    enabled: !!classroomSlug,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false,
  });

  // Upload attachment mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('Starting upload process for file:', file.name);
      
      // Upload file directly via API (API will handle storage)
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('Uploading file via API...');
      const result = await apiPostFormData<ClassroomAttachment>(
        `/api/classroom/${classroomSlug}/attachments`,
        formData
      );
      console.log('Upload result:', result);
      
      return result;
    },
    onSuccess: (newAttachment) => {
      // Update the cache with the new attachment
      queryClient.setQueryData(
        ["classroom", classroomSlug, "attachments"],
        (old: ClassroomAttachment[] = []) => [newAttachment, ...old]
      );
      toast.success(`File "${newAttachment.file_name}" uploaded successfully`);
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      const message = error?.response?.data?.error || error?.message || 'Failed to upload file';
      toast.error(message);
    },
  });

  // Upload file function
  const uploadFile = async (file: File): Promise<ClassroomAttachment> => {
    console.log('uploadFile called with classroomSlug:', classroomSlug);
    if (!classroomSlug) {
      console.error('classroomSlug is missing:', { classroomSlug });
      toast.error('Classroom not found');
      throw new Error('Classroom not found');
    }

    // Validate file size (100MB limit for Mega)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 100MB.');
      throw new Error('File too large. Maximum size is 100MB.');
    }

    // Validate file type (basic validation)
    const allowedTypes = [
      'image/', 'video/', 'audio/', 'application/pdf', 
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/', 'application/zip', 'application/x-rar-compressed'
    ];

    const isAllowedType = allowedTypes.some(type => file.type.startsWith(type));
    if (!isAllowedType) {
      toast.error('File type not supported');
      throw new Error('File type not supported');
    }

    try {
      const result = await uploadMutation.mutateAsync(file);
      console.log('Upload mutation result:', result);
      return result;
    } catch (error) {
      console.error('Upload mutation failed:', error);
      throw error;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.startsWith('text/')) return '📄';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📎';
  };

  return {
    attachments,
    isLoading,
    error,
    refetch,
    uploadFile,
    isUploading: uploadMutation.isPending,
    uploadProgress: uploadMutation.isPending ? 50 : 0, // Simple progress indicator
    formatFileSize,
    getFileIcon,
  };
}
