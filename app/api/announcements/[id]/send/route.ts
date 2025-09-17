import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { createNotificationForAllUsers } from "@/lib/notifications/notification-service";

// POST /api/announcements/[id]/send - Send an announcement
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const announcementId = (await params).id;

    // Get the announcement
    const { data: announcement, error: fetchError } = await client
      .from("announcements")
      .select("*")
      .eq("id", announcementId)
      .eq("is_deleted", false)
      .single();

    if (fetchError || !announcement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    // Check if already sent
    if (announcement.status === 'sent') {
      return NextResponse.json({ error: "Announcement already sent" }, { status: 400 });
    }

    // Update announcement status to sent
    const { data: updatedAnnouncement, error: updateError } = await client
      .from("announcements")
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", announcementId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Create notifications for all users
    try {
      await createNotificationForAllUsers({
        kind: 'system',
        payload: {
          title: '📢 New Announcement',
          message: `${updatedAnnouncement.title}: ${updatedAnnouncement.message}`,
          announcement_id: updatedAnnouncement.id,
          deep_link: updatedAnnouncement.deep_link || undefined,
          image_url: updatedAnnouncement.image_url || undefined
        }
      });
    } catch (notificationError) {
      console.error('Failed to create notifications for announcement:', notificationError);
      // Don't fail the send operation if notification fails
    }

    return NextResponse.json({ data: updatedAnnouncement });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
