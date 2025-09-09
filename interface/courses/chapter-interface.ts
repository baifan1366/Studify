export interface Chapter {
  id: number;
  lesson_id: number;
  title: string;
  description?: string;
  start_time_sec?: number;
  end_time_sec?: number;
  order_index?: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}