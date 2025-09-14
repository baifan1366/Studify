import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Validation schema for profile updates
const updateProfileSchema = z.object({
  display_name: z.string().optional(),
  full_name: z.string().optional(),
  bio: z.string().optional(),
  timezone: z.string().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().optional(),
  notification_settings: z.object({
    email_notifications: z.boolean().optional(),
    push_notifications: z.boolean().optional(),
    course_updates: z.boolean().optional(),
    community_updates: z.boolean().optional(),
    marketing_emails: z.boolean().optional(),
  }).optional(),
  privacy_settings: z.object({
    profile_visibility: z.enum(['public', 'friends', 'private']).optional(),
    show_email: z.boolean().optional(),
    show_progress: z.boolean().optional(),
    data_collection: z.boolean().optional(),
  }).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    if (!user ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Add validated fields to update data
    if (validatedData.display_name !== undefined) {
      updateData.display_name = validatedData.display_name;
    }
    if (validatedData.full_name !== undefined) {
      updateData.full_name = validatedData.full_name;
    }
    if (validatedData.bio !== undefined) {
      updateData.bio = validatedData.bio;
    }
    if (validatedData.timezone !== undefined) {
      updateData.timezone = validatedData.timezone;
    }
    if (validatedData.theme !== undefined) {
      updateData.theme = validatedData.theme;
    }
    if (validatedData.language !== undefined) {
      updateData.language = validatedData.language;
    }

    // Create Supabase client
    const supabase = await createClient();

    // Handle JSONB fields
    if (validatedData.notification_settings) {
      // Get current notification settings and merge with new ones
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('user_id', user.id)
        .single();

      const currentNotificationSettings = currentProfile?.notification_settings || {};
      updateData.notification_settings = {
        ...currentNotificationSettings,
        ...validatedData.notification_settings,
      };
    }

    if (validatedData.privacy_settings) {
      // Get current privacy settings and merge with new ones
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('privacy_settings')
        .eq('user_id', user.id)
        .single();

      const currentPrivacySettings = currentProfile?.privacy_settings || {};
      updateData.privacy_settings = {
        ...currentPrivacySettings,
        ...validatedData.privacy_settings,
      };
    }

    // Update profile in database
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Get full profile data
    const { data: fullProfile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: fullProfile
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
