import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { routing } from '@/i18n/routing';

/**
 * Resend verification email endpoint
 * POST /api/auth/resend-verification
 * 
 * IMPORTANT: According to Supabase docs, resend() only works if:
 * 1. There was an initial signup request
 * 2. The user email is not yet confirmed
 * 3. Custom SMTP is configured (default provider has strict rate limits)
 */
export async function POST(request: NextRequest) {
  console.log('[RESEND VERIFICATION] Request initiated:', {
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent')?.substring(0, 100),
  });

  try {
    const body = await request.json();
    const { email, captchaToken } = body;

    console.log('[RESEND VERIFICATION] Request data:', {
      hasEmail: !!email,
      emailLength: email?.length || 0,
      hasCaptchaToken: !!captchaToken,
    });

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get the user's locale from the request header or cookie
    const cookieLocale = request.cookies.get('next-intl-locale')?.value;
    let locale = cookieLocale || routing.defaultLocale;

    // Validate that the detected locale is supported
    if (!routing.locales.includes(locale as any)) {
      console.warn('[RESEND VERIFICATION] Invalid locale detected, using default:', {
        detectedLocale: locale,
        defaultLocale: routing.defaultLocale,
      });
      locale = routing.defaultLocale;
    }

    console.log('[RESEND VERIFICATION] Using locale:', locale);

    const supabase = await createClient();
    const supabaseAdmin = await createAdminClient();

    // First, check if the user exists and their email confirmation status
    const { data: users, error: userLookupError } = await supabaseAdmin.auth.admin.listUsers();
    const userRecord = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (userLookupError) {
      console.error('[RESEND VERIFICATION] Error looking up user:', userLookupError);
    }

    console.log('[RESEND VERIFICATION] User lookup result:', {
      userExists: !!userRecord,
      emailConfirmed: userRecord?.email_confirmed_at ? 'Yes' : 'No',
      createdAt: userRecord?.created_at,
      lastSignInAt: userRecord?.last_sign_in_at,
    });

    // If user doesn't exist, return generic success to prevent enumeration
    if (!userRecord) {
      console.warn('[RESEND VERIFICATION] No user found with email');
      return NextResponse.json(
        { 
          success: true, 
          message: 'If an account with that email exists and is unverified, a verification email has been sent.',
          debug: process.env.NODE_ENV === 'development' ? 'User not found' : undefined
        },
        { status: 200 }
      );
    }

    // If email is already confirmed, inform the user
    if (userRecord.email_confirmed_at) {
      console.log('[RESEND VERIFICATION] Email already confirmed');
      return NextResponse.json(
        { 
          success: false,
          error: 'Email already verified',
          message: 'This email is already verified. You can sign in directly.',
          debug: process.env.NODE_ENV === 'development' ? 'Email already confirmed' : undefined
        },
        { status: 400 }
      );
    }

    // Construct redirect URL with locale
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || '';
    // After email confirmation, redirect to home instead of sign-in to avoid processing loops
    const emailRedirectTo = `${siteUrl}/api/auth/callback?type=signup&next=${encodeURIComponent(`/${locale}/home`)}`;

    console.log('[RESEND VERIFICATION] Sending verification email:', {
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email for privacy
      locale,
      redirectUrl: emailRedirectTo,
      hasCaptchaToken: !!captchaToken,
      siteUrl,
    });

    // Use Supabase's built-in resend functionality
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo,
        ...(captchaToken ? { captchaToken } : {}),
      },
    });

    if (error) {
      console.error('[RESEND VERIFICATION] Supabase error:', {
        error: error.message,
        code: error.status,
        name: error.name,
        details: error,
      });

      // Check for specific error types
      const errorMessage = error.message?.toLowerCase() || '';
      
      // Rate limit error
      if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many email requests. Please wait a few minutes before trying again.',
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 429 }
        );
      }

      // Email service error (SMTP not configured)
      if (errorMessage.includes('smtp') || errorMessage.includes('email') || errorMessage.includes('mail')) {
        console.error('[RESEND VERIFICATION] Email service configuration issue detected');
        return NextResponse.json(
          { 
            success: false,
            error: 'Email service error',
            message: 'Unable to send email. Please contact support.',
            debug: process.env.NODE_ENV === 'development' ? 
              'SMTP may not be configured in Supabase. Check Authentication > Email Templates in Supabase Dashboard.' : undefined
          },
          { status: 500 }
        );
      }

      // Generic error - return success to prevent enumeration but log details
      return NextResponse.json(
        { 
          success: true, 
          message: 'If an account with that email exists and is unverified, a verification email has been sent.',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 200 }
      );
    }

    console.log('[RESEND VERIFICATION] ✅ Email sent successfully:', {
      success: true,
      data: data ? 'Email sent' : 'No data returned',
      timestamp: new Date().toISOString(),
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
    });

    console.log('[RESEND VERIFICATION] 📧 IMPORTANT: Check the following:');
    console.log('1. Supabase Dashboard > Authentication > Logs for email delivery status');
    console.log('2. Spam/Junk folder in email inbox');
    console.log('3. SMTP configuration in Supabase Dashboard > Authentication > Email Templates');
    console.log('4. Default Supabase email provider has strict rate limits - configure custom SMTP for production');

    return NextResponse.json(
      { 
        success: true, 
        message: 'Verification email sent successfully',
        debug: process.env.NODE_ENV === 'development' ? {
          email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          nextSteps: [
            'Check spam/junk folder',
            'Check Supabase Auth Logs',
            'Verify SMTP is configured',
            'Default email provider has low rate limits'
          ]
        } : undefined
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[RESEND VERIFICATION] Unexpected error:', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
