export interface Review {
    id: number;
    public_id: string;
    course_id: number;
    user_id: number;
    rating: number;
    comment?: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}