import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { routing } from '@/i18n/routing';

// Send forgot password email using Supabase's resetPasswordForEmail
export async function POST(request: NextRequest) {
  console.log('[FORGOT PASSWORD] Request initiated:', {
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent')?.substring(0, 100),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
  });
  
  try {
    const body = await request.json();
    const { email, captchaToken } = body;

    console.log('[FORGOT PASSWORD] Request data:', {
      hasEmail: !!email,
      emailLength: email?.length || 0,
      hasCaptchaToken: !!captchaToken,
      captchaTokenLength: captchaToken?.length || 0
    });

    // Get the user's locale from the request header or cookie, fallback to default
    const acceptLanguage = request.headers.get('accept-language');
    const cookieLocale = request.cookies.get('next-intl-locale')?.value;
    let locale = cookieLocale || routing.defaultLocale;

    console.log('[FORGOT PASSWORD] Locale detection:', {
      acceptLanguage,
      cookieLocale,
      initialLocale: locale,
      supportedLocales: routing.locales
    });

    // Validate that the detected locale is supported
    if (!routing.locales.includes(locale as any)) {
      console.log('[FORGOT PASSWORD] Unsupported locale, using default:', { 
        unsupportedLocale: locale, 
        defaultLocale: routing.defaultLocale 
      });
      locale = routing.defaultLocale;
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!captchaToken) {
      return NextResponse.json(
        { error: 'CAPTCHA verification is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // For hCaptcha, Supabase handles verification directly (recommended approach)

    // hCaptcha tokens are passed directly to Supabase - no server verification needed

    const supabase = await createClient();

    // Construct the redirect URL - go through auth callback for session handling
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?type=recovery&next=/${locale}/reset-password`;
    
    console.log('[FORGOT PASSWORD] Sending reset email:', {
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email for privacy
      locale,
      redirectUrl,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      hasCaptchaToken: !!captchaToken
    });

    // Use Supabase's built-in password reset functionality with captcha token
    // Direct redirect to reset password page (implicit flow)
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
      captchaToken: captchaToken // Pass the captcha token to Supabase
    });

    if (error) {
      console.error('[FORGOT PASSWORD] Supabase error:', {
        error: error.message,
        code: error.status,
        details: error
      });
      // Don't expose internal errors to prevent email enumeration
      return NextResponse.json(
        { message: 'If an account with that email exists, a reset link has been sent.' },
        { status: 200 }
      );
    }

    console.log('[FORGOT PASSWORD] Email sent successfully:', {
      success: true,
      data: data ? 'Email sent' : 'No data returned',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { message: 'If an account with that email exists, a reset link has been sent.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('[FORGOT PASSWORD] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
