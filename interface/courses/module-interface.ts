export interface Module {
  id: number;
  public_id: string;
  course_id: number;
  title: string;
  position: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ModuleWithLessons extends Module {
  lessons?: Array<{
    id: number;
    public_id: string;
    title: string;
    kind: 'video' | 'live' | 'document' | 'quiz' | 'assignment' | 'whiteboard';
    content_url?: string;
    duration_sec?: number;
  }>;
}