export interface AdminRoles {
    id: number;
    public_id: string;
    role_permission_id: string;
    user_id: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}