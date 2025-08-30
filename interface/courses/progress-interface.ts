export interface Progress {
    id: number;
    public_id: string;
    user_id: number;
    lesson_id: number;
    state: 'not_started' | 'in_progress' | 'completed';
    progress_pct: number;
    last_seen_at?: string;
    created_at: string;
    updated_at: string;
}