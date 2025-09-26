import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';

// Update user password after reset (called from reset password page)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Create a regular client to get the current user from the session
    const supabase = await createClient();
    
    // Get the current user (should be authenticated via the reset token)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'No authenticated user found. Please use the reset link again.' },
        { status: 401 }
      );
    }

    // Update the password using the regular client (user must be authenticated)
    const { data, error } = await supabase.auth.updateUser({ 
      password: password 
    });

    if (error) {
      console.error('Error updating password:', error);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Update last password change timestamp in profile
    const adminSupabase = await createAdminClient();
    const { error: profileUpdateError } = await adminSupabase
      .from('profiles')
      .update({ last_password_change: new Date().toISOString() })
      .eq('user_id', user.id);

    if (profileUpdateError) {
      console.error('Error updating profile timestamp:', profileUpdateError);
      // Don't fail the request for this
    }

    return NextResponse.json(
      { message: 'Password updated successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
