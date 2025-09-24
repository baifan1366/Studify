import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import { authenticator } from 'otplib';

// Disable TOTP/MFA
export async function POST(request: NextRequest) {
  try {
    // Authorize the request
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const profile = user.profile;
    const body = await request.json();
    const { password, code } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Current password is required to disable MFA' },
        { status: 400 }
      );
    }

    if (!profile?.two_factor_enabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is not enabled' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Create a regular client for password verification
    const regularSupabase = await createClient();
    
    // Verify current password
    const { error: signInError } = await regularSupabase.auth.signInWithPassword({
      email: profile?.email || user.email,
      password: password
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // If TOTP code is provided, verify it
    if (code) {
      // Get the stored secret
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('totp_secret')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile?.totp_secret) {
        return NextResponse.json(
          { error: 'TOTP secret not found' },
          { status: 400 }
        );
      }

      const isValidTotp = authenticator.check(code, userProfile.totp_secret);
      
      if (!isValidTotp) {
        return NextResponse.json(
          { error: 'Invalid TOTP code' },
          { status: 400 }
        );
      }
    }

    // Disable MFA and clear TOTP data
    const { error: disableError } = await supabase
      .from('profiles')
      .update({ 
        two_factor_enabled: false,
        totp_secret: null,
        totp_backup_codes: [],
        totp_enabled_at: null
      })
      .eq('user_id', user.id);

    if (disableError) {
      console.error('Error disabling MFA:', disableError);
      return NextResponse.json(
        { error: 'Failed to disable two-factor authentication' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Two-factor authentication disabled successfully'
    });

  } catch (error) {
    console.error('MFA disable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
