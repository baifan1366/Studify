export interface WhiteboardEvent {
  id: number;
  public_id: string;
  wb_id: number;
  actor_id?: number | null;
  kind: string;
  payload: Record<string, any>;
  created_at: Date;
}