import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// PATCH /api/admin/users/[userId]/status - Update user status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { userId } = await params;
    const { status, reason } = await request.json();

    if (!status) {
      return NextResponse.json({ 
        message: 'status is required' 
      }, { status: 400 });
    }

    // Validate status
    if (!['active', 'inactive', 'banned', 'pending'].includes(status)) {
      return NextResponse.json({ 
        message: 'Invalid status. Must be one of: active, inactive, banned, pending' 
      }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Get current user data
    const { data: currentUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (fetchError || !currentUser) {
      console.error('Error fetching user:', fetchError);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    // Handle ban status
    if (status === 'banned') {
      updateData.banned_reason = reason || 'No reason provided';
      updateData.banned_at = new Date().toISOString();
    } else if (currentUser.status === 'banned' && status === 'active') {
      // Unbanning user
      updateData.banned_reason = null;
      updateData.banned_at = null;
    }

    // Update user status
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', currentUser.id)
      .select()
      .maybeSingle();

    if (updateError || !updatedUser) {
      console.error('Error updating user status:', updateError);
      return NextResponse.json({ 
        message: 'Failed to update user status' 
      }, { status: 500 });
    }

    // Log the action
    const action = status === 'banned' ? 'ban_user' : 
                  status === 'active' && currentUser.status === 'banned' ? 'unban_user' : 
                  'update_user_status';

    await supabase
      .from('audit_log')
      .insert({
        actor_id: authResult.user.profile?.id,
        action,
        subject_type: 'profile',
        subject_id: currentUser.id.toString(),
        meta: {
          previous_status: currentUser.status,
          new_status: status,
          reason: reason || null,
          target_user_id: userId,
          target_user_name: currentUser.full_name || currentUser.email
        }
      });

    return NextResponse.json({
      success: true,
      message: 'User status updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Admin user status PATCH error:', error);
    return NextResponse.json({ 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
