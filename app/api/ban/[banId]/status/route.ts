import { NextResponse } from "next/server";
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from "@/utils/supabase/server";

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
    const { status } = body;

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
