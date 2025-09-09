import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createServerClient } from "@/utils/supabase/server";

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📩 QStash Reaction Webhook:", body);

    const supabase = await createServerClient();

    if (body.action === "added") {
      await supabase.from("community_reaction").upsert({
        user_id: parseInt(body.user_id),
        target_type: body.target_type,
        target_id: parseInt(body.target_id),
        emoji: body.emoji,
      });
    } else if (body.action === "removed") {
      await supabase
        .from("community_reaction")
        .delete()
        .eq("user_id", parseInt(body.user_id))
        .eq("target_type", body.target_type)
        .eq("target_id", parseInt(body.target_id))
        .eq("emoji", body.emoji);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Reaction webhook error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export const POST = process.env.QSTASH_CURRENT_SIGNING_KEY
  ? verifySignatureAppRouter(handler)
  : handler;
