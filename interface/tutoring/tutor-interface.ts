export interface Tutor {
    id: number;
    public_id: string;
    user_id: number;
    headline?: string;
    subjects: string[];
    hourly_rate?: number;
    qualifications?: string;
    rating_avg?: number;
    rating_count?: number;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}