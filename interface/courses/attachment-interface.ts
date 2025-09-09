// Course attachment interface
export interface CourseAttachment {
  id: number
  public_id: string
  owner_id: number
  title: string
  url: string | null
  size: number | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}