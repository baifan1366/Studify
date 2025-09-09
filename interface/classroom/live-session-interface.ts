export interface LiveSession {
  id: string;
  public_id?: string;
  course_id?: number | null;
  title: string;
  description?: string;
  host_id: string;
  starts_at: string;
  ends_at?: string | null;
  status: "scheduled" | "live" | "ended" | "cancelled" | "active";
  slug?: string;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: Date | null;
}