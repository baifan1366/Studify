export interface File {
    id: number;
    public_id: string;
    owner_id: number;
    path: string;
    mime_type?: string;
    size_bytes?: number;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}