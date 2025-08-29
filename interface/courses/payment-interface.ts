export interface Payment {
    id: number;
    public_id: string;
    order_id: number;
    provider: string;
    provider_ref?: string;
    amount_cents: number;
    status: 'pending' | 'succeeded' | 'failed' | 'refunded';
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}