import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/utils/auth/server-guard";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/profiles/[userId]
 * Get user profile by user ID (for viewing other users' profiles)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authResult = await authorize(['student', 'tutor', 'admin']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = params;
    const supabase = await createClient();

    // Determine if userId is a number (profile.id) or UUID (user_id)
    const isNumericId = /^\d+$/.test(userId);
    
    // Get user profile from profiles table
    // Only return public information based on privacy settings
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        public_id,
        user_id,
        display_name,
        full_name,
        email,
        role,
        avatar_url,
        bio,
        timezone,
        status,
        banned_reason,
        banned_at,
        points,
        preferences,
        notification_settings,
        privacy_settings,
        last_login,
        created_at
      `)
      .eq(isNumericId ? 'id' : 'user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Error fetching user profile:', {
        userId,
        isNumericId,
        queryField: isNumericId ? 'id' : 'user_id',
        error
      });
      return NextResponse.json({ 
        error: 'Profile not found',
        debug: process.env.NODE_ENV === 'development' ? {
          userId,
          isNumericId,
          queryField: isNumericId ? 'id' : 'user_id',
          errorCode: error.code,
          errorMessage: error.message
        } : undefined
      }, { status: 404 });
    }

    if (!profile) {
      console.log('No profile found for:', {
        userId,
        isNumericId,
        queryField: isNumericId ? 'id' : 'user_id'
      });
      return NextResponse.json({ 
        error: 'Profile not found',
        debug: process.env.NODE_ENV === 'development' ? {
          userId,
          isNumericId,
          queryField: isNumericId ? 'id' : 'user_id'
        } : undefined
      }, { status: 404 });
    }

    // Filter data based on privacy settings
    const filteredProfile = {
      ...profile,
      // Only include email if privacy settings allow it
      email: profile.privacy_settings?.show_email ? profile.email : null,
      // Remove sensitive data that shouldn't be exposed
      notification_settings: undefined,
      preferences: undefined,
    };

    return NextResponse.json(filteredProfile);
  } catch (error: any) {
    console.error('Profile API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
