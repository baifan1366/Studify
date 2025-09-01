import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

/**
 * GET handler for retrieving authenticated user information
 * Uses the server-side Supabase client to get the current user
 */
export async function GET(req: NextRequest) {
  try {
    // Read optional bearer token from header (e.g., for mobile/clients)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const tokenMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
    const accessToken = tokenMatch ? tokenMatch[1] : undefined;

    // Also check auth cookie set by our app (browser flows)
    const cookieToken = req.cookies.get('sb-access-token')?.value;

    // If no token anywhere, treat as unauthenticated but not an error
    if (!accessToken && !cookieToken) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Create server-side Supabase client (uses header token or falls back to cookies)
    const supabase = await createServerClient(accessToken);

    // Get current user from Supabase auth
    const { data: { user }, error } = await supabase.auth.getUser();

    // Handle authentication error
    if (error) {
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="supabase", error="invalid_token"'
          }
        }
      );
    }

    // Return user data
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error in auth API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}