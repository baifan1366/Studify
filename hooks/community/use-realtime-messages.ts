import { useEffect, useState } from 'react';
import { ChatMessage } from '@/interface/classroom/chat-message-interface';

export function useRealtimeMessages(classroomId: string, initialMessages: ChatMessage[]) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  useEffect(() => {
    // Simulate a WebSocket connection or real-time subscription
    const interval = setInterval(() => {
      const newMessage: ChatMessage = {
        id: Date.now(),
        public_id: `${Date.now()}`,
        session_id: 1,
        sender_id: 1,
        sender: {
          id: 1,
          avatar_url: '',
          name: 'System',
        },
        message: 'This is a new real-time message.',
        content: 'This is a new real-time message.',
        sent_at: new Date(),
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
        author_id: 1,
        author_name: 'System',
        author_role: 'tutor',
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    }, 5000);

    return () => clearInterval(interval);
  }, [classroomId]);

  return { messages };
}
