export interface Reaction {
  id: number;
  public_id: string;
  post_id: number;
  user_id: number;
  emoji: string;
  created_at: Date;
  updated_at: Date;
}