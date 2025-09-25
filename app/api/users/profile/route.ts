import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/utils/auth/server-guard";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/users/profile
 * Get current user's profile information
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize(['student', 'tutor', 'admin']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult.sub
    const supabase = await createClient();
    // Get current user's profile from profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Profile API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/profile
 * Update current user's profile information
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authorize(['student', 'tutor', 'admin']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult.sub
    const supabase = await createClient();
    const body = await request.json();

    // Update user's profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(body)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Profile Update API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
