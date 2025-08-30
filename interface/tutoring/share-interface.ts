export interface Share {
    id: number;
    public_id: string;
    resource_kind: 'file' | 'note';
    resource_id: number;
    shared_with?: number;
    access: 'view' | 'edit' | 'comment';
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}