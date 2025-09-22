import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Users Search API
 * GET /api/users/search - Search for users by name or email
 */

export async function GET(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const userId = authResult.sub;
    const supabase = await createAdminClient();

    // Get search query from URL parameters
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        users: [], 
        message: 'Search query must be at least 2 characters' 
      }, { status: 400 });
    }

    // Get current user's profile ID
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Search for users by display_name or email (if available)
    // Exclude the current user from results
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        avatar_url,
        user_id,
        created_at
      `)
      .neq('id', currentProfile.id) // Exclude current user
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('display_name', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    // Transform the results to match the expected format
    const transformedUsers = users?.map(user => ({
      id: user.id.toString(),
      name: user.display_name || 'Unknown User',
      avatar: user.avatar_url,
      role: 'Student', // Default role, could be enhanced with role table join
      userId: user.user_id,
      joinDate: user.created_at
    })) || [];

    return NextResponse.json({ 
      users: transformedUsers,
      total: transformedUsers.length,
      query: query
    });

  } catch (error) {
    console.error('Error in users search API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
