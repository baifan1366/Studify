export interface RolePermissions {
    id: number;
    public_id: string;
    role_id: string;
    permission_id: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}