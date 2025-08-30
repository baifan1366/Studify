export interface Appointment {
    id: number;
    public_id: string;
    tutor_id: number;
    student_id: number;
    scheduled_at: string;
    duration_min: number;
    status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
    notes?: string;
    created_by?: number;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}