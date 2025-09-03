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