import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { Receiver } from "@upstash/qstash";
import { authorize } from '@/utils/auth/server-guard';

// PATCH /api/admin/courses/[courseId]/status - admin update course status (including ban)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    // Check if this is a QStash webhook call
    const isBanExpiration = req.headers.get("X-Ban-Expiration") === "true";
    const qstashSignature = req.headers.get("Upstash-Signature");
    
    // Read body once
    const bodyText = await req.text();
    const body = JSON.parse(bodyText);
    
    // Verify QStash signature if it's from QStash
    if (qstashSignature && process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY) {
      try {
        const receiver = new Receiver({
          currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
          nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
        });

        await receiver.verify({
          body: bodyText,
          signature: qstashSignature,
        });
        
        console.log("✅ QStash signature verified successfully for ban expiration");
      } catch (error) {
        console.error("❌ QStash signature verification failed:", error);
        return NextResponse.json({ error: "Invalid QStash signature" }, { status: 401 });
      }
    } 
    // If not from QStash, require admin authorization
    else if (!isBanExpiration) {
      const authResult = await authorize('admin');
      if (authResult instanceof NextResponse) {
        return authResult;
      }
    }

    const client = await createServerClient();
    
    // Parse courseId from URL parameter (Next.js params are always strings)
    const { courseId: courseIdString } = await params;
    const courseId = parseInt(courseIdString, 10);

    if (!courseId || isNaN(courseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    const { status } = body;

    // Admin can set any valid status including "ban"
    if (!status || !['active', 'pending', 'inactive', 'ban'].includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be 'active', 'pending', 'inactive', or 'ban'" 
      }, { status: 400 });
    }

    // Verify the course exists
    const { data: currentCourse, error: fetchError } = await client
      .from("course")
      .select("id, owner_id, status, title")
      .eq("id", courseId)
      .eq("is_deleted", false)
      .single();

    if (fetchError || !currentCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Admin has full control over course status changes
    // Update the course status
    const { data, error } = await client
      .from("course")
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", courseId)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Log if this was an automatic ban expiration reversion
    if (isBanExpiration && status === 'inactive') {
      const banId = req.headers.get("X-Ban-Id");
      console.log(`✅ Automatic course status reversion completed for course ${courseId} (ban ${banId} expired)`);
    }

    return NextResponse.json({ 
      data,
      message: `Course status updated to ${status}${isBanExpiration ? ' (automatic ban expiration)' : ''}` 
    });

  } catch (e: any) {
    return NextResponse.json({ 
      error: e?.message ?? "Internal error" 
    }, { status: 500 });
  }
}
