export interface Note {
    id: number;
    public_id: string;
    owner_id: number;
    title?: string;
    body?: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}