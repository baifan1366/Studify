import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// Change password for authenticated user
export async function PATCH(request: NextRequest) {
  try {
    // Authorize the request
    const authResult = await authorize(['student','tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const profile = user.profile;
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Create a regular client for password verification
    const regularSupabase = await createClient();
    
    // Verify current password by attempting to sign in
    const { error: signInError } = await regularSupabase.auth.signInWithPassword({
      email: profile?.email || user.email,
      password: currentPassword
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Update last password change timestamp
    const { error: profileUpdateError } = await supabase
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
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
