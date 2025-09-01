export interface Order {
    id: number;
    public_id: string;
    buyer_id: number;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    total_cents: number;
    currency: string;
    meta: Record<string, any>;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}