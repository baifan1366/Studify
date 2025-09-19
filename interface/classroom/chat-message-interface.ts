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

// Attachment interface for chat messages
export interface ChatAttachment {
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
  profiles: {
    display_name: string;
    avatar_url?: string;
  };
}

// Chat message interface for hooks - simplified format
export interface HookChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  content: string;
  timestamp: Date;
  type: 'user' | 'system';
  attachment?: ChatAttachment;
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