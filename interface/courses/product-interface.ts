export interface Product {
    id: number;
    public_id: string;
    kind: 'course' | 'plugin' | 'resource';
    ref_id?: number;
    title: string;
    price_cents: number;
    currency: string;
    is_active: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}