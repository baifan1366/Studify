'use client';

import { Message } from '@/hooks/community/use-chat-history';
import { useRealtimeSubscription } from '@/hooks/realtime/use-realtime-subscription';

interface MessageResponse {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
  classroom_members: {
    role: string;
  };
}

export function useRealtimeMessages(classroomId: string, initialMessages: Message[]) {
  const { items: messages } = useRealtimeSubscription<Message>({
    channelName: `classroom-chat-${classroomId}`,
    table: 'messages',
    filter: `classroom_id=eq.${classroomId}`,
    apiUrl: `/api/classrooms/${classroomId}/messages`,
    initialData: initialMessages,
    mapData: (data: MessageResponse): Message => ({
      id: data.id,
      content: data.content,
      authorId: data.user_id,
      authorName: data.profiles.full_name || data.profiles.email.split('@')[0],
      authorRole: data.classroom_members.role as "tutor" | "student",
      createdAt: data.created_at,
    }),
  });

  return { messages };
}
