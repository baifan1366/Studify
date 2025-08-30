export interface Report {
    id: number;
    public_id: string;
    reporter_id?: number;
    subject_type: string;
    subject_id: string;
    reason?: string;
    status: 'open' | 'reviewing' | 'resolved' | 'rejected';
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}