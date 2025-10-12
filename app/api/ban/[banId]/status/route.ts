
import { NextResponse } from "next/server";
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from "@/utils/supabase/server";
import { Client } from "@upstash/qstash";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ banId: string }> }
) {
  try {
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }
    const body = await req.json();
    const client = await createAdminClient();
    const { banId } = await params;
    const { status, expires_at } = body;

    if (!status || !['approved', 'pending', 'rejected'].includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be 'approved', 'pending', or 'rejected'" 
      }, { status: 400 });
    }

    const { data, error } = await client
      .from("ban")
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq("public_id", banId)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Schedule automatic course status reversion if ban is approved with expiration
    if (status === 'approved' && data.target_type === 'course' && data.target_id && expires_at) {
      try {
        const qstash = process.env.QSTASH_TOKEN ? new Client({
          token: process.env.QSTASH_TOKEN,
        }) : null;

        if (qstash) {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const expirationDate = new Date(expires_at);
          const now = new Date();
          const delayInSeconds = Math.max(0, Math.floor((expirationDate.getTime() - now.getTime()) / 1000));

          // Schedule QStash job to revert course status to "inactive"
          await qstash.publishJSON({
            url: `${baseUrl}/api/admin/courses/${data.target_id}/status`,
            method: "PATCH",
            body: { 
              status: 'inactive',
              reason: 'Ban expired - automatically reverted to inactive'
            },
            delay: delayInSeconds,
            retries: 3,
            headers: {
              "Content-Type": "application/json",
              "X-Ban-Expiration": "true",
              "X-Ban-Id": banId,
            },
          });

          console.log(`✅ Scheduled course status reversion for course ${data.target_id} in ${delayInSeconds} seconds (${expirationDate.toISOString()})`);
        } else {
          console.warn('⚠️ QStash not configured, skipping automatic course status reversion scheduling');
        }
      } catch (scheduleError) {
        console.error('❌ Failed to schedule course status reversion:', scheduleError);
        // Don't fail the main operation if scheduling fails
      }
    }

    return NextResponse.json({ 
      data,
      message: `Ban status updated to ${status}` 
    });

  } catch (e: any) {
    return NextResponse.json({ 
      error: e?.message ?? "Internal error" 
    }, { status: 500 });
  }
}
