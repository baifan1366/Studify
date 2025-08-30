export interface LiveSession {
  id: number;
  public_id: string;
  course_id?: number | null;
  title?: string | null;
  host_id: number;
  starts_at: Date;
  ends_at?: Date | null;
  status: "scheduled" | "live" | "ended" | "cancelled";
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}