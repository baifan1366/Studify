export interface Availability {
    id: number;
    public_id: string;
    tutor_id: number;
    start_at: string;
    end_at: string;
    rrule?: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}