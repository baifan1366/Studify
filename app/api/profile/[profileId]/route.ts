import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const client = await createServerClient();
    const { profileId } = await params;
    
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("public_id", profileId)
      .eq("is_deleted", false)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const body = await req.json();
    const client = await createServerClient();
    const { profileId } = await params;

    const updates = {
      display_name: body.display_name,
      full_name: body.full_name,
      email: body.email,
      role: body.role,
      avatar_url: body.avatar_url,
      bio: body.bio,
      currency: body.currency,
      timezone: body.timezone,
      status: body.status,
      banned_reason: body.banned_reason,
      banned_at: body.banned_at,
      points: body.points,
      onboarded: body.onboarded,
      onboarded_step: body.onboarded_step,
      preferences: body.preferences,
      theme: body.theme,
      language: body.language,
      notification_settings: body.notification_settings,
      privacy_settings: body.privacy_settings,
      two_factor_enabled: body.two_factor_enabled,
      email_verified: body.email_verified,
      profile_completion: body.profile_completion,
      onesignal_player_id: body.onesignal_player_id,
      onesignal_external_id: body.onesignal_external_id,
      push_subscription_status: body.push_subscription_status,
      is_deleted: body.is_deleted,
      updated_at: body.updated_at,
      last_login: body.last_login
    } as Record<string, any>;

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { data, error } = await client
      .from("profiles")
      .update(updates)
      .eq("public_id", profileId)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}