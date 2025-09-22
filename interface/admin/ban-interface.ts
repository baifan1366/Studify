export interface Ban {
    id: number;
    public_id: string;
    target_id: number;
    target_type: "post" | "chat" | "comment" | "course" | "user" | "other";
    reason: string;
    status: "pending" | "approved" | "rejected";
    expires_at: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}