export interface Course {
  id: string;
  owner_id: string;
  title: string;
  description?: string;
  visibility: 'public' | 'private' | 'unlisted';
  price_cents: number;
  currency: string;
  tags: string[];
  updated_at: string;
}