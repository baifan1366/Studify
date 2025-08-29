export interface AiRun {
  id: number;
  public_id: string; // uuid
  agent_id: number;
  requester_id?: number | null;
  input: Record<string, any>;
  output?: Record<string, any> | null;
  status: "queued" | "running" | "succeeded" | "failed" | "needs_review";
  reviewed_by?: number | null;
  reviewed_at?: Date | null;
  review_note?: string | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}