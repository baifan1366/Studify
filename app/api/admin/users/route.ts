// app/api/admin/users/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/users - List all users with pagination and filtering
export async function GET(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role'); // Filter by role
    const status = searchParams.get('status'); // Filter by status
    const search = searchParams.get('search'); // Search by name/email
    const offset = (page - 1) * limit;

    const supabase = await createAdminClient();

    // Build query
    let query = supabase
      .from('profiles')
      .select(`
        id,
        public_id,
        user_id,
        display_name,
        full_name,
        email,
        role,
        status,
        banned_reason,
        banned_at,
        points,
        onboarded,
        profile_completion,
        created_at,
        updated_at,
        last_login
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    // Apply filters
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`display_name.ilike.%${search}%,full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    // Get paginated results
    const { data: users, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ message: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/users - Create admin user (promote existing user to admin)
export async function POST(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { user_id, email } = await request.json();

    if (!user_id && !email) {
      return NextResponse.json({ message: 'user_id or email is required' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Find user by user_id or email
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('is_deleted', false);

    if (user_id) {
      query = query.eq('user_id', user_id);
    } else {
      query = query.eq('email', email);
    }

    const { data: existingUser, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return NextResponse.json({ message: 'Failed to fetch user' }, { status: 500 });
    }

    if (!existingUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (existingUser.role === 'admin') {
      return NextResponse.json({ message: 'User is already an admin' }, { status: 400 });
    }

    // Update user role to admin
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', existingUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return NextResponse.json({ message: 'Failed to update user role' }, { status: 500 });
    }

    // Log the action
    await supabase
      .from('audit_log')
      .insert({
        actor_id: authResult.user.profile?.id,
        action: 'promote_to_admin',
        subject_type: 'profile',
        subject_id: existingUser.id.toString(),
        meta: {
          previous_role: existingUser.role,
          new_role: 'admin',
          target_user_id: existingUser.user_id
        }
      });

    return NextResponse.json({
      message: 'User promoted to admin successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Admin users POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
