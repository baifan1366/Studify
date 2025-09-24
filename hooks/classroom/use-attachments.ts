"use client";

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { uploadToMegaClient } from "@/lib/mega-client";
import { createClient } from '@supabase/supabase-js';
import { apiGet } from '@/lib/api-config';

export interface ClassroomAttachment {
  id: number;
  public_id: string;
  file_url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  visibility: 'public' | 'private';
  bucket: string;
  path: string;
  custom_message?: string; // Optional custom message from user
  profiles: {
    display_name: string;
    avatar_url?: string;
  };
}

interface UploadOptions {
  contextType?: 'submission' | 'assignment' | 'post' | 'comment' | 'material' | 'announcement' | 'chat';
  onProgress?: (progress: number) => void;
  signal?: AbortSignal; // 用于取消上传
  customMessage?: string; // Custom message from user
  assignmentId?: number; // For assignment submissions
}

/**
 * Determine visibility based on context type
 * Public: material, announcement - accessible to all classroom members
 * Private: submission, post, comment, chat - requires signed URLs
 */
function getVisibilityFromContextType(contextType: string): 'public' | 'private' {
  const publicContexts = ['material', 'announcement'];
  return publicContexts.includes(contextType) ? 'public' : 'private';
}

// Initialize Supabase client for direct database access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Hook for uploading files via client-side MEGA upload
 */
export function useUploadFile(classroomSlug: string | undefined) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      file,
      options,
    }: {
      file: File;
      options?: UploadOptions;
    }) => {
      if (!classroomSlug) {
        throw new Error("Classroom slug is missing");
      }

      // Map assignment context to material since assignment isn't allowed by DB constraint
      let contextType = options?.contextType || 'chat';
      if (contextType === 'assignment') {
        contextType = 'material'; // Use material context type for assignments
      }
      const visibility = getVisibilityFromContextType(contextType);
      
      // Check if MEGA credentials are available
      const hasMegaCredentials = 
        process.env.NEXT_PUBLIC_MEGA_EMAIL && 
        process.env.NEXT_PUBLIC_MEGA_PASSWORD;

      console.log('🔍 MEGA Configuration Check:', {
        hasMegaCredentials,
        email: process.env.NEXT_PUBLIC_MEGA_EMAIL ? '***configured***' : 'missing',
        password: process.env.NEXT_PUBLIC_MEGA_PASSWORD ? '***configured***' : 'missing'
      });

      if (!hasMegaCredentials) {
        console.warn('MEGA credentials not found. Falling back to API upload with 20MB limit.');
        
        // Fallback to original API upload
        const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB (increased from 4MB)
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`File size exceeds 20MB limit. Please set up MEGA credentials for unlimited uploads. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        }

        // Use FormData for API upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('contextType', contextType);
        formData.append('visibility', visibility);
        
        // Add custom message to FormData if provided
        if (options?.customMessage) {
          formData.append('customMessage', options.customMessage);
          console.log('📝 Adding custom message to FormData:', options.customMessage);
        }

        // Add assignment ID if provided
        if (options?.assignmentId) {
          formData.append('assignmentId', options.assignmentId.toString());
          console.log('📝 Adding assignment ID to FormData:', options.assignmentId);
        }
        
        const response = await fetch(`/api/classroom/${classroomSlug}/attachments`, {
          method: 'POST',
          body: formData,
          signal: options?.signal,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(errorData.error || `Upload failed: ${response.status}`);
        }
        
        const attachment = await response.json();
        options?.onProgress?.(100);
        console.log('✅ File uploaded successfully via API fallback');
        return attachment as ClassroomAttachment;
      }

      // MEGA upload path
      console.log(`Uploading file "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB) via MEGA client...`);
      
      options?.onProgress?.(5);

      // Step 1: Upload file to MEGA using client-side upload
      const megaResult = await uploadToMegaClient(file, {
        onProgress: (progress) => {
          // Map MEGA progress (0-100) to our progress (5-80)
          const mappedProgress = 5 + (progress * 0.75);
          options?.onProgress?.(mappedProgress);
        }
      });

      options?.onProgress?.(85);

      // Step 2: Create attachment record in database via API
      // Store assignment info in the path for assignment context
      let megaPath = `mega://${file.name}`;
      if (options?.contextType === 'assignment' && options?.assignmentId) {
        megaPath = `assignment_${options.assignmentId}/mega://${file.name}`;
      }

      const attachmentData: any = {
        file_name: file.name,
        mime_type: megaResult.type,
        size_bytes: megaResult.size,
        file_url: megaResult.url,
        context_type: contextType, // Will be 'material' for assignments
        visibility: visibility,
        bucket: 'mega-storage', // Using MEGA as storage provider
        path: megaPath, // Include assignment info in path
        custom_message: options?.customMessage // Pass custom message to API
      };

      console.log('🚀 Sending attachment data to API:', {
        file_name: attachmentData.file_name,
        custom_message: attachmentData.custom_message,
        custom_message_type: typeof attachmentData.custom_message,
        custom_message_length: attachmentData.custom_message?.length,
        has_custom_message: !!attachmentData.custom_message,
        options_customMessage: options?.customMessage
      });

      const response = await fetch(`/api/classroom/${classroomSlug}/attachments/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attachmentData),
        signal: options?.signal,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save attachment metadata' }));
        throw new Error(errorData.error || `Failed to save attachment: ${response.status}`);
      }
      
      const attachment = await response.json();
      
      options?.onProgress?.(100);
      console.log('✅ File uploaded successfully via MEGA client');

      return attachment as ClassroomAttachment;
    },
    onSuccess: (newAttachment) => {
      queryClient.setQueryData(
        ["classroom", classroomSlug, "attachments"],
        (old: ClassroomAttachment[] = []) => [newAttachment, ...old]
      );
      toast.success(`File "${newAttachment.file_name}" uploaded successfully`);
    },
    onError: (error: any) => {
      if (error.name === "AbortError") {
        toast.warning("Upload cancelled");
      } else {
        toast.error(error.message || "Upload failed");
      }
    },
  });

  /**
   * 上传文件函数
   */
  const uploadFile = (
    file: File,
    options?: UploadOptions
  ): { promise: Promise<ClassroomAttachment>; cancel: () => void } => {
    const controller = new AbortController();
    const signal = controller.signal;

    const promise = mutation.mutateAsync({ file, options: { ...options, signal } });

    return {
      promise,
      cancel: () => controller.abort(),
    };
  };

  return { uploadFile, isUploading: mutation.isPending };
}

/**
 * Utility function to format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Utility function to get file icon based on mime type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('doc')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📋';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '🗜️';
  return '📎';
}

/**
 * Main hook that combines MEGA client-side upload with API fallback functionality
 * Features:
 * - MEGA Upload (when credentials available): No file size limit, direct client-side upload
 * - API Fallback (when MEGA not configured): 4MB limit, server-side upload
 * - Auto-select visibility based on context_type (public: material/announcement, private: others)
 * - Progress tracking and cancellation support
 * - Automatic fallback with user-friendly error messages
 * 
 * Setup MEGA (Optional):
 * Add to .env.local:
 * NEXT_PUBLIC_MEGA_EMAIL=your-email@example.com
 * NEXT_PUBLIC_MEGA_PASSWORD=your-password
 * 
 * Usage:
 * const { uploadFile } = useAttachments(classroomSlug);
 * const result = uploadFile(file, { contextType: 'material' }); // → MEGA or API upload
 * const result = uploadFile(file, { contextType: 'chat' }); // → MEGA or API upload
 */
/**
 * Hook to fetch attachments for a specific assignment
 * Since assignment_id column doesn't exist, we filter by context_type and path
 */
export function useAssignmentAttachments(classroomSlug: string | undefined, assignmentId: number | undefined) {
  return useQuery<ClassroomAttachment[]>({
    queryKey: ['assignment-attachments', classroomSlug, assignmentId],
    queryFn: async () => {
      if (!classroomSlug || !assignmentId) {
        return [];
      }
      // Fetch material attachments (which includes assignment attachments) and filter client-side
      const response = await apiGet<ClassroomAttachment[]>(`/api/classroom/${classroomSlug}/attachments?context_type=material`);
      const allAttachments = response || [];
      
      // Filter by assignment ID stored in the path
      const assignmentAttachments = allAttachments.filter((attachment: any) => {
        return attachment.path && attachment.path.includes(`assignment_${assignmentId}/`);
      });
      
      return assignmentAttachments;
    },
    enabled: !!classroomSlug && !!assignmentId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useAttachments(classroomSlug: string | undefined) {
  const { uploadFile, isUploading } = useUploadFile(classroomSlug);
  
  return {
    uploadFile,
    isUploading,
    formatFileSize,
    getFileIcon
  };
}
