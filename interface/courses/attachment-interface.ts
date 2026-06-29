// Course attachment interface
export interface CourseAttachment {
  id: number
  public_id: string
  owner_id: number
  title: string
  url: string | null
  size: number | null
  type: 'pdf' | 'video' | 'image' | 'office' | 'text' | 'other'
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  cloudinary_mp3?: string | null
  faststart_status?: 'disabled' | 'not_applicable' | 'already_optimized' | 'optimized' | 'failed' | null
  faststart_processed_at?: string | null
  faststart_error?: string | null
}
