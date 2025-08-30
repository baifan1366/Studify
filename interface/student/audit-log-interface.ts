export interface AuditLog {
    id: number;
    public_id: string;
    actor_id?: number;
    action: string;
    subject_type?: string;
    subject_id?: string;
    meta: Record<string, any>;
    created_at: string;
}