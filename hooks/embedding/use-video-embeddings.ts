import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VideoEmbeddings } from '@/interface/ai/video-interface';
import { apiGet, apiSend } from '@/lib/api-config';
import { videoEmbeddingsApi } from '@/lib/api';

export function useVideoEmbeddings() {
  return useQuery<VideoEmbeddings[]>({
    queryKey: ['video-embeddings'],
    queryFn: () => {
      return apiGet<VideoEmbeddings[]>(videoEmbeddingsApi.list);
    },
  });
}

export function useVideoEmbeddingsById(id?: number) {
  return useQuery<VideoEmbeddings>({
    queryKey: ['video-embeddings', id],
    queryFn: () => {
      if (!id) {
        throw new Error('Video Embeddings ID is required');
      }
      return apiGet<VideoEmbeddings>(videoEmbeddingsApi.getById(id));
    },
    enabled: Boolean(id),
  });
}

export function useVideoEmbeddingsByAttachmentId(attachmentId?: number) {
  return useQuery<VideoEmbeddings>({
    queryKey: ['video-embeddings', attachmentId],
    queryFn: () => {
      if (!attachmentId) {
        throw new Error('Video Embeddings Attachment ID is required');
      }
      return apiGet<VideoEmbeddings>(videoEmbeddingsApi.getByAttachmentId(attachmentId));
    },
    enabled: Boolean(attachmentId),
  });
}

export function useCreateVideoEmbeddings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<VideoEmbeddings> & { attachment_id: number }) =>
      apiSend<VideoEmbeddings>({
        url: videoEmbeddingsApi.create,
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video-embeddings'] });
    },
  });
}

export function useProcessVideoEmbeddings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: { attachment_id: number }) =>
      apiSend<VideoEmbeddings>({
        url: videoEmbeddingsApi.process,
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video-embeddings'] });
      qc.invalidateQueries({ queryKey: ['attachments'] });
    },
  });
}

export function useUpdateVideoEmbeddings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updates }: { id: number } & Partial<Omit<VideoEmbeddings, 'id'>>) =>
      apiSend<VideoEmbeddings>({
        url: videoEmbeddingsApi.update(id),
        method: 'PATCH',
        body: updates,
      }),
    onSuccess: (data: VideoEmbeddings) => {
      qc.invalidateQueries({ queryKey: ['video-embeddings'] });
      qc.invalidateQueries({ queryKey: ['video-embeddings', data.attachment_id] });
    },
  });
}

export function useDeleteVideoEmbeddings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (videoEmbeddings: VideoEmbeddings) =>
      apiSend<void>({
        url: videoEmbeddingsApi.delete(videoEmbeddings.attachment_id),
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video-embeddings'] });
    },
  });
}
