export interface Checkin {
    id: number;
    public_id: string;
    user_id: number;
    checkin_at: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}