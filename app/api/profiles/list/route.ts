import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/utils/auth/server-guard";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/profiles/list
 * List available user profiles for testing (development only)
 */
export async function GET(request: NextRequest) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    const authResult = await authorize(['student', 'tutor', 'admin']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const supabase = await createClient();

    // Get first 10 profiles for testing
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id,
        public_id,
        user_id,
        display_name,
        full_name,
        role,
        status,
        created_at
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching profiles list:', error);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    return NextResponse.json({
      profiles: profiles || [],
      count: profiles?.length || 0,
      note: 'This endpoint is only available in development mode for testing purposes'
    });
  } catch (error: any) {
    console.error('Profiles list API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}
