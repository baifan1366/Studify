export interface Course {
  id: number;
  public_id: string;
  owner_id: number;
  title: string;
  description?: string;
  visibility: 'public' | 'private' | 'unlisted';
  price_cents?: number;
  currency?: string;
  tags: string[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}