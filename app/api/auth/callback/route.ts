import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Handle Supabase auth callbacks (email confirmations, password resets, etc.)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const type = searchParams.get('type');

  console.log('[AUTH CALLBACK] Parameters:', { code: !!code, next, type, origin });

  if (code) {
    const supabase = await createClient();
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data?.session) {
      // Determine redirect based on the type of auth flow
      let redirectPath = next;
      
      if (type === 'recovery') {
        // Password reset flow - use the next parameter which contains the locale
        // If next parameter is provided (e.g., /en/reset-password), use it
        // Otherwise, fallback to /en/reset-password
        redirectPath = next && next !== '/' ? next : '/en/reset-password';
        console.log('[AUTH CALLBACK] Password reset redirect:', { next, redirectPath });
      } else if (type === 'signup') {
        // Email verification flow - redirect to onboarding or dashboard
        redirectPath = next;
      }
      
      console.log('[AUTH CALLBACK] Final redirect:', `${origin}${redirectPath}`);
      // Redirect to the appropriate page
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  // If there's an error or no code, redirect to sign-in with error
  return NextResponse.redirect(`${origin}/en/sign-in?error=auth_callback_error`);
}
