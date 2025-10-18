import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/utils/auth/server-guard";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/profile
 * Get current user's complete profile with all settings
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize(['student', 'tutor', 'admin']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult.sub; // This is the auth UUID
    const supabase = await createClient();

    // Get current user's profile from profiles table using user_id (auth UUID)
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

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Profile API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile
 * Update current user's profile information and settings
 * Admins can update any user's profile by passing user_id in the body
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authorize(['student', 'tutor', 'admin']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const authenticatedUserId = authResult.sub; // This is the auth UUID
    const supabase = await createClient();
    const body = await request.json();

    // Determine which user's profile to update
    // Admins can update any user's profile, others can only update their own
    let targetUserId = authenticatedUserId;
    if (body.user_id && authResult.payload.role === 'admin') {
      targetUserId = body.user_id;
      // Remove user_id from body so it doesn't get updated
      delete body.user_id;
    }

    // Handle smart merging for nested JSON objects
    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Copy simple fields
    const simpleFields = [
      'display_name', 'full_name', 'email', 'role', 'avatar_url', 'bio', 
      'currency', 'timezone', 'status', 'banned_reason', 'banned_at', 
      'points', 'onboarded', 'onboarded_step', 'theme', 'language',
      'two_factor_enabled', 'email_verified', 'profile_completion',
      'onesignal_player_id', 'onesignal_external_id', 'push_subscription_status',
      'is_deleted', 'last_login'
    ];

    simpleFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Handle smart merging for notification_settings
    if (body.notification_settings) {
      // Get current notification settings first
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('user_id', targetUserId)
        .single();

      const currentNotifications = currentProfile?.notification_settings || {};
      updateData.notification_settings = {
        ...currentNotifications,
        ...body.notification_settings
      };
    }

    // Handle smart merging for privacy_settings
    if (body.privacy_settings) {
      // Get current privacy settings first
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('privacy_settings')
        .eq('user_id', targetUserId)
        .single();

      const currentPrivacy = currentProfile?.privacy_settings || {};
      updateData.privacy_settings = {
        ...currentPrivacy,
        ...body.privacy_settings
      };
    }

    // Handle smart merging for preferences
    if (body.preferences) {
      // Get current preferences first
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_id', targetUserId)
        .single();

      const currentPreferences = currentProfile?.preferences || {};
      updateData.preferences = {
        ...currentPreferences,
        ...body.preferences
      };
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Update user's profile using user_id (auth UUID)
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', targetUserId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Profile Update API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
