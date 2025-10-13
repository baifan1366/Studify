import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { signAppJwt, generateJti } from '@/utils/auth/jwt';
import redis from '@/utils/redis/redis';

const APP_SESSION_COOKIE = 'app_session';
const APP_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Handle Supabase auth callbacks (email confirmations, password resets, etc.)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  // Handle both Supabase auth code and OAuth provider code
  const code = searchParams.get('code') || searchParams.get('token_hash') || searchParams.get('access_token');
  const redirectTo = searchParams.get('redirect_to');
  let next = searchParams.get('next') ?? '/';
  const requestedRole = searchParams.get('role') as 'student' | 'tutor' | null;
  
  // Log the full URL for debugging
  console.log('[AUTH CALLBACK] Full callback URL:', request.url);
  
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
    requestedRole,
    rawRedirectTo: searchParams.get('redirect_to'),
    allParams: Object.fromEntries(searchParams.entries())
  });

  if (code) {
    const supabase = await createClient();
    
    try {
      console.log('[AUTH CALLBACK] Attempting session exchange:', {
        codeLength: code.length,
        codePrefix: code.substring(0, 10) + '...',
        type,
        next,
        provider: searchParams.get('provider') || 'unknown'
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
      const userId = data.session.user.id;
      
      // Get user profile to obtain role
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, display_name')
        .eq('user_id', userId)
        .single();
      
      // If profile doesn't exist, create it (for OAuth users)
      if (profileError && profileError.code === 'PGRST116') {
        console.log('[AUTH CALLBACK] Profile not found, creating new profile with role:', requestedRole || 'student');
        
        // Extract name from OAuth user data
        const user = data.session.user;
        const googleName = user.user_metadata?.full_name || 
                          user.user_metadata?.name ||
                          user.user_metadata?.display_name ||
                          user.identities?.[0]?.identity_data?.name ||
                          user.identities?.[0]?.identity_data?.full_name;
        
        const avatarUrl = user.user_metadata?.avatar_url ||
                         user.user_metadata?.picture ||
                         user.identities?.[0]?.identity_data?.avatar_url ||
                         user.identities?.[0]?.identity_data?.picture;
        
        const displayName = googleName || user.email?.split('@')[0];
        const profileRole = requestedRole || 'student';
        
        // Create the profile
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            role: profileRole,
            full_name: googleName,
            email: user.email,
            display_name: displayName,
            avatar_url: avatarUrl,
            email_verified: true // OAuth users have verified emails
          })
          .select('role, full_name, display_name')
          .single();
        
        if (createError) {
          console.error('[AUTH CALLBACK] Failed to create profile:', createError);
          return NextResponse.redirect(`${origin}/en/sign-in?error=profile_creation_failed`);
        }
        
        profile = newProfile;
      } else if (profileError) {
        console.error('[AUTH CALLBACK] Failed to fetch profile:', profileError);
        return NextResponse.redirect(`${origin}/en/sign-in?error=profile_not_found`);
      }
      
      const role = profile?.role || 'student';
      const name = profile?.display_name || profile?.full_name || data.session.user.email?.split('@')[0];
      
      console.log('[AUTH CALLBACK] User profile:', { userId, role, name });
      
      // Generate app JWT and store session in Redis
      const jti = generateJti();
      const jwt = await signAppJwt({ sub: userId, role, jti, name }, APP_SESSION_TTL_SECONDS);
      await redis.set(`session:${jti}`, userId, { ex: APP_SESSION_TTL_SECONDS });
      
      console.log('[AUTH CALLBACK] App session created:', { jti: jti.substring(0, 10) + '...' });
      
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
      
      // Create redirect response with app_session cookie
      const response = NextResponse.redirect(`${origin}${redirectPath}`);
      response.cookies.set(APP_SESSION_COOKIE, jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: APP_SESSION_TTL_SECONDS,
      });
      
      return response;
    } else {
      console.log('[AUTH CALLBACK] Session exchange failed:', {
        hasError: !!error,
        errorMessage: error?.message,
        hasSession: !!data?.session,
        type,
        next
      });
      // More specific error message for debugging
      return NextResponse.redirect(`${origin}/en/sign-in?error=session_exchange_failed&details=${encodeURIComponent(error?.message || 'unknown_error')}`);
    }
  } catch (error: any) {
    console.error('[AUTH CALLBACK] Unexpected error:', error);
    const errorMessage = error?.message || 'unknown_error';
    return NextResponse.redirect(`${origin}/en/sign-in?error=unexpected_error&details=${encodeURIComponent(errorMessage)}`);
  }
}

  // If there's an error or no code, redirect to sign-in with error
  console.log('[AUTH CALLBACK] No code provided in callback');
  return NextResponse.redirect(`${origin}/en/sign-in?error=no_code_provided`);
}
