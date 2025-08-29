export interface OrderItem {
    id: number;
    public_id: string;
    order_id: number;
    product_id: number;
    quantity: number;
    unit_price_cents: number;
    subtotal_cents: number;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}