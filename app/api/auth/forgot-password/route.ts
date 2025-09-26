import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { routing } from '@/i18n/routing';

// Send forgot password email using Supabase's resetPasswordForEmail
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, captchaToken } = body;

    // Get the user's locale from the request header or cookie, fallback to default
    const acceptLanguage = request.headers.get('accept-language');
    const cookieLocale = request.cookies.get('next-intl-locale')?.value;
    let locale = cookieLocale || routing.defaultLocale;

    // Validate that the detected locale is supported
    if (!routing.locales.includes(locale as any)) {
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

    // Use Supabase's built-in password reset functionality with captcha token
    // Use auth callback URL to handle the token exchange properly
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?type=recovery&next=/${locale}/auth/reset-password`,
      captchaToken: captchaToken // Pass the captcha token to Supabase
    });

    if (error) {
      console.error('Error sending reset password email:', error);
      // Don't expose internal errors to prevent email enumeration
      return NextResponse.json(
        { message: 'If an account with that email exists, a reset link has been sent.' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: 'If an account with that email exists, a reset link has been sent.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
