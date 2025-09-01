import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

/**
 * GET handler for retrieving authenticated user information
 * Uses the server-side Supabase client to get the current user
 */
export async function GET(req: NextRequest) {
  try {
    // Create server-side Supabase client
    const supabase = await createServerClient();
    // Get current user from Supabase auth
    const { data: { user }, error } = await supabase.auth.getUser();

    // Handle authentication error
    if (error) {
      return NextResponse.json(
        { error: error.message }, 
        { status: 401 }
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