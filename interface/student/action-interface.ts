export interface Action {
    id: number;
    public_id: string;
    report_id?: number;
    actor_id?: number;
    action: string;
    notes?: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}