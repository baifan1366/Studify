export interface Announcement {
    id: number;
    public_id: string;
    created_by: number;
    title: string;
    message: string;
    image_url: string | null;
    deep_link: string | null;
    status: "draft" | "scheduled" | "sent" | "failed"; // draft | scheduled | sent | failed
    scheduled_at: string | null;
    sent_at: string | null;
    onesignal_id: string | null;
    onesignal_response: string | null;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}
  