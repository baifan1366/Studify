export interface Student {
    id: number;
    public_id: string;
    user_id: number;
    school?: string;
    grade?: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}