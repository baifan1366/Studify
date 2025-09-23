import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadToMegaClient, ClientUploadResult } from '@/lib/mega-client';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface ChatUploadOptions {
  conversationId: string;
  customMessage?: string;
}

interface ChatUploadResult {
  attachment: any;
  message: any;
}

/**
 * Hook for uploading files in chat
 */
export function useChatUpload() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, options }: { file: File; options: ChatUploadOptions }): Promise<ChatUploadResult> => {
      try {
        // Step 1: Upload file to MEGA using client-side upload
        console.log(`Starting MEGA upload for: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        
        const megaUploadResult: ClientUploadResult = await uploadToMegaClient(file, {
          onProgress: (progress: number) => {
            // Convert MEGA progress (0-100) to our UploadProgress format
            setUploadProgress({
              loaded: Math.round((progress / 100) * file.size),
              total: file.size,
              percentage: progress
            });
          }
        });

        console.log('MEGA upload completed:', megaUploadResult);

        // Step 2: Create message with attachment metadata via API
        const messagePayload = {
          conversationId: options.conversationId,
          attachmentUrl: megaUploadResult.url,
          fileName: file.name,
          fileSize: megaUploadResult.size,
          fileType: megaUploadResult.type,
          customMessage: options.customMessage
        };

        const response = await fetch('/api/chat/messages/attachment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(messagePayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Message with attachment created:', result);

        return {
          attachment: {
            url: megaUploadResult.url,
            fileName: file.name,
            fileSize: megaUploadResult.size,
            fileType: megaUploadResult.type
          },
          message: result.message
        };

      } catch (error) {
        console.error('Chat upload process failed:', error);
        
        // Provide user-friendly error messages
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('MEGA')) {
          throw new Error(`File upload failed: ${errorMessage}`);
        } else if (errorMessage.includes('credentials')) {
          throw new Error('File upload failed: Storage configuration error. Please try again later.');
        } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
          throw new Error('File upload failed: Network connection error. Please check your internet connection.');
        }
        
        throw new Error(`File upload failed: ${errorMessage}`);
      } finally {
        // Clear progress when done (success or failure)
        setUploadProgress(null);
      }
    },
    onSuccess: (data, variables) => {
      console.log('Chat file uploaded successfully:', data);
      
      // Invalidate messages to refresh the conversation
      queryClient.invalidateQueries({ 
        queryKey: ['messages', variables.options.conversationId] 
      });
      
      // Invalidate conversations to update last message
      queryClient.invalidateQueries({ 
        queryKey: ['conversations'] 
      });
    },
    onError: (error) => {
      console.error('Chat upload failed:', error);
      setUploadProgress(null);
    },
  });

  const uploadFile = (file: File, options: ChatUploadOptions) => {
    return uploadMutation.mutateAsync({ file, options });
  };

  return {
    uploadFile,
    uploadProgress,
    isUploading: uploadMutation.isPending,
    error: uploadMutation.error,
    reset: () => {
      uploadMutation.reset();
      setUploadProgress(null);
    }
  };
}
