'use client';

import { Comment } from '@/hooks/classroom/use-classroom-posts';
import { useRealtimeSubscription } from '@/hooks/realtime/use-realtime-subscription';

interface CommentResponse {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

export function useRealtimeComments(postId: string, initialComments: Comment[]) {
  const { items: comments } = useRealtimeSubscription<Comment>({
    channelName: `post-comments-${postId}`,
    table: 'post_comments',
    filter: `post_id=eq.${postId}`,
    apiUrl: `/api/posts/${postId}/comments`,
    initialData: initialComments,
    mapData: (data: CommentResponse): Comment => ({
      id: data.id,
      content: data.content,
      authorId: data.user_id,
      authorName: data.profiles.full_name || data.profiles.email.split('@')[0],
      createdAt: data.created_at,
    }),
  });

  return { comments };
}
