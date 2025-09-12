export interface Sender {
  id: number;
  avatar_url: string;
  name: string;
}

export interface ChatMessage {
  id: number;
  public_id: string;
  session_id: number;
  sender_id: number;
  sender: Sender; 
  message: string;
  content: string;
  sent_at: Date; 
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  author_id: number; // Added author_id
  author_name: string; // Added author_name
  author_role: string; // Added author_role
}

// Chat message interface for hooks - simplified format
export interface HookChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  content: string;
  timestamp: Date;
  type: 'text' | 'system';
}

// Response from chat API
export interface ChatApiResponse {
  success: boolean;
  messages: HookChatMessage[];
  hasMore: boolean;
  total: number;
}

// Send message request
export interface SendMessageRequest {
  content: string;
  type?: 'text' | 'system';
}

// Send message response
export interface SendMessageResponse {
  success: boolean;
  message: HookChatMessage;
}