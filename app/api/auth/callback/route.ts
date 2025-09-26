import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Handle Supabase auth callbacks (email confirmations, password resets, etc.)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code') || searchParams.get('token_hash');
  const redirectTo = searchParams.get('redirect_to');
  let next = searchParams.get('next') ?? '/';
  
  // Parse next from redirect_to if needed
  if (!searchParams.get('next') && redirectTo) {
    try {
      const redirectUrl = new URL(decodeURIComponent(redirectTo));
      next = redirectUrl.searchParams.get('next') ?? '/';
    } catch (e) {
      console.log('[AUTH CALLBACK] Failed to parse redirect_to:', redirectTo);
    }
  }
  
  const type = searchParams.get('type');

  console.log('[AUTH CALLBACK] Parameters:', { 
    code: !!code, 
    next, 
    type, 
    origin,
    rawRedirectTo: searchParams.get('redirect_to'),
    allParams: Object.fromEntries(searchParams.entries())
  });

  if (code) {
    const supabase = await createClient();
    
    console.log('[AUTH CALLBACK] Attempting session exchange:', {
      codeLength: code.length,
      codePrefix: code.substring(0, 10) + '...',
      type,
      next
    });
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    console.log('[AUTH CALLBACK] Session exchange result:', {
      success: !error && !!data?.session,
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.status,
      hasSession: !!data?.session,
      userEmail: data?.session?.user?.email
    });
    
    if (!error && data?.session) {
      // Determine redirect based on the type of auth flow
      let redirectPath = next;
      
      if (type === 'recovery') {
        // Password reset flow - use the next parameter which contains the locale
        // If next parameter is provided (e.g., /en/reset-password), use it
        // Otherwise, fallback to /en/reset-password
        redirectPath = next && next !== '/' ? next : '/en/reset-password';
        console.log('[AUTH CALLBACK] Password reset redirect:', { 
          next, 
          redirectPath, 
          sessionUser: data.session.user?.email,
          sessionId: data.session.access_token?.substring(0, 20) + '...'
        });
      } else if (type === 'signup') {
        // Email verification flow - redirect to onboarding or dashboard
        redirectPath = next;
      }
      
      console.log('[AUTH CALLBACK] Final redirect:', `${origin}${redirectPath}`);
      // Redirect to the appropriate page
      return NextResponse.redirect(`${origin}${redirectPath}`);
    } else {
      console.log('[AUTH CALLBACK] Session exchange failed:', {
        hasError: !!error,
        errorMessage: error?.message,
        hasSession: !!data?.session,
        type,
        next
      });
    }
  }

  // If there's an error or no code, redirect to sign-in with error
  return NextResponse.redirect(`${origin}/en/sign-in?error=auth_callback_error`);
}
