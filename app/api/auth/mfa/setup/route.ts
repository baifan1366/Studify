import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

// Generate TOTP secret using otplib
function generateSecret(): string {
  return authenticator.generateSecret();
}

function generateBackupCodes(): string[] {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

// Generate TOTP setup (secret + QR code)
export async function GET(request: NextRequest) {
  try {
    // Authorize the request
    const authResult = await authorize(['student','tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const profile = user.profile;

    // Check if MFA is already enabled
    if (profile?.two_factor_enabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is already enabled' },
        { status: 400 }
      );
    }

    // Generate new TOTP secret
    const secret = generateSecret();
    const appName = 'Studify';
    const accountName = profile?.email || user.email;
    
    // Create TOTP URL for QR code
    const totpUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;
    
    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Store the secret temporarily (not activated yet)
    const supabase = await createAdminClient();
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        totp_secret: secret,
        totp_backup_codes: backupCodes
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error storing TOTP secret:', updateError);
      return NextResponse.json(
        { error: 'Failed to store TOTP secret' },
        { status: 500 }
      );
    }

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(totpUrl);

    return NextResponse.json({
      secret,
      totpUrl,
      backupCodes,
      qrCode: qrCodeDataUrl,
      message: 'TOTP setup generated. Please verify with your authenticator app.'
    });

  } catch (error) {
    console.error('MFA setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Verify and enable TOTP
export async function POST(request: NextRequest) {
  try {
    // Authorize the request
    const authResult = await authorize(['student','tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const profile = user.profile;
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Get the stored secret
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('totp_secret, totp_backup_codes')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile?.totp_secret) {
      return NextResponse.json(
        { error: 'TOTP setup not found. Please start setup again.' },
        { status: 400 }
      );
    }

    // Verify TOTP code using otplib
    const isValid = authenticator.check(code, userProfile.totp_secret);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Enable MFA
    const { error: enableError } = await supabase
      .from('profiles')
      .update({ 
        two_factor_enabled: true,
        totp_enabled_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (enableError) {
      console.error('Error enabling MFA:', enableError);
      return NextResponse.json(
        { error: 'Failed to enable two-factor authentication' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Two-factor authentication enabled successfully',
      backupCodes: userProfile.totp_backup_codes
    });

  } catch (error) {
    console.error('MFA verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
