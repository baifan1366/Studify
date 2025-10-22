import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { createNotificationForAllUsers } from "@/lib/notifications/notification-service";
import { authorize } from "@/utils/auth/server-guard";

// GET /api/announcements
export async function GET() {
  try {
    const client = await createServerClient();

    const { data, error } = await client
      .from("announcements")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// POST /api/announcements - create a new announcement (admin only)
export async function POST(req: Request) {
  try {
    // Only admins can create announcements
    const authResult = await authorize("admin");
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await req.json();
    const client = await createServerClient();

    // Get the internal profile ID from the auth UUID
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id")
      .eq("user_id", authResult.sub) // authResult.sub is the auth UUID
      .eq("is_deleted", false)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const payload = {
      title: body.title as string,
      message: body.message as string,
      image_url: body.image_url as string | null,
      deep_link: body.deep_link as string | null,
      status: body.status as string,
      scheduled_at: body.scheduled_at as string | null,
      sent_at: body.sent_at as string | null,
      onesignal_id: body.onesignal_id as string | null,
      onesignal_response: body.onesignal_response as string | null,
      created_by: profile.id, // Use the internal profile ID
    };

    if (!payload.title) {
      return NextResponse.json({ error: "title is required" }, { status: 422 });
    }

    const { data, error } = await client
      .from("announcements")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // If announcement is sent immediately (not draft or scheduled), create notifications
    if (data && payload.status === "sent") {
      try {
        await createNotificationForAllUsers({
          kind: "system",
          payload: {
            title: "New Announcement",
            message: `${data.title}: ${data.message}`,
            announcement_id: data.id,
            deep_link: data.deep_link || undefined,
            image_url: data.image_url || undefined,
          },
        });
      } catch (notificationError) {
        console.error(
          "Failed to create notifications for announcement:",
          notificationError
        );
        // Don't fail the announcement creation if notification fails
      }
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
