// app/api/admin/users/[userId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/users/[userId] - Get specific user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { userId } = await params;
    const supabase = await createAdminClient();

    // Get user profile with additional details
    const { data: user, error } = await supabase
      .from('profiles')
      .select(`
        *,
        course_enrollment(count),
        classroom_member(count),
        community_post(count),
        community_comment(count)
      `)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Get recent activity from audit log
    const { data: recentActivity } = await supabase
      .from('audit_log')
      .select('action, created_at, meta')
      .or(`actor_id.eq.${user.id},subject_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      user,
      recentActivity: recentActivity || []
    });

  } catch (error) {
    console.error('Admin user GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/users/[userId] - Update user (role, status, ban)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { userId } = params;
    const updates = await request.json();
    const supabase = await createAdminClient();

    // Get current user data
    const { data: currentUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Prepare update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Handle role change
    if (updates.role && updates.role !== currentUser.role) {
      if (!['admin', 'student', 'tutor'].includes(updates.role)) {
        return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
      }
      updateData.role = updates.role;
    }

    // Handle status change (ban/unban)
    if (updates.status && updates.status !== currentUser.status) {
      if (!['active', 'banned'].includes(updates.status)) {
        return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
      }
      
      updateData.status = updates.status;
      
      if (updates.status === 'banned') {
        updateData.banned_reason = updates.banned_reason || 'No reason provided';
        updateData.banned_at = new Date().toISOString();
        
        // Create ban record
        await supabase
          .from('ban')
          .insert({
            user_id: currentUser.id,
            reason: updates.banned_reason || 'No reason provided',
            expires_at: updates.ban_expires_at || null
          });
      } else if (updates.status === 'active' && currentUser.status === 'banned') {
        updateData.banned_reason = null;
        updateData.banned_at = null;
        
        // Mark ban records as deleted
        await supabase
          .from('ban')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('user_id', currentUser.id)
          .eq('is_deleted', false);
      }
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', currentUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
    }

    // Log the action
    const auditAction = updates.status === 'banned' ? 'ban_user' : 
                       updates.status === 'active' && currentUser.status === 'banned' ? 'unban_user' :
                       updates.role ? 'change_role' : 'update_user';

    await supabase
      .from('audit_log')
      .insert({
        actor_id: authResult.user.profile?.id,
        action: auditAction,
        subject_type: 'profile',
        subject_id: currentUser.id.toString(),
        meta: {
          previous_data: {
            role: currentUser.role,
            status: currentUser.status
          },
          new_data: {
            role: updateData.role || currentUser.role,
            status: updateData.status || currentUser.status
          },
          reason: updates.banned_reason,
          target_user_id: userId
        }
      });

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Admin user PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[userId] - Soft delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { userId } = params;
    const supabase = await createAdminClient();

    // Get current user data
    const { data: currentUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Soft delete user
    const { error: deleteError } = await supabase
      .from('profiles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json({ message: 'Failed to delete user' }, { status: 500 });
    }

    // Log the action
    await supabase
      .from('audit_log')
      .insert({
        actor_id: authResult.user.profile?.id,
        action: 'delete_user',
        subject_type: 'profile',
        subject_id: currentUser.id.toString(),
        meta: {
          deleted_user_data: {
            display_name: currentUser.display_name,
            email: currentUser.email,
            role: currentUser.role
          },
          target_user_id: userId
        }
      });

    return NextResponse.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Admin user DELETE error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
