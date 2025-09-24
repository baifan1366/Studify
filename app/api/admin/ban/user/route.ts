import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// POST /api/admin/ban/user - Create a user ban request
export async function POST(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { userId, reason, targetType, targetId, expiresAt, description } = await request.json();

    if (!userId || !reason) {
      return NextResponse.json({ 
        message: 'userId and reason are required' 
      }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Get user profile to get the profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Check if user is already banned
    if ((profile as any).status === 'banned') {
      return NextResponse.json({ 
        message: 'User is already banned' 
      }, { status: 400 });
    }

    // Create the ban record
    const banData = {
      target_id: targetId || userId,
      target_type: targetType || 'user',
      reason: reason.trim(),
      status: 'pending',
      created_by: authResult.user.profile?.id,
      expires_at: expiresAt || null,
      description: description?.trim() || null,
      created_at: new Date().toISOString(),
    };

    const { data: ban, error: banError } = await supabase
      .from('ban')
      .insert([banData])
      .select('*')
      .single();

    if (banError) {
      console.error('Error creating ban:', banError);
      return NextResponse.json({ 
        message: 'Failed to create ban request' 
      }, { status: 500 });
    }

    // Log the action in audit log
    await supabase
      .from('audit_log')
      .insert({
        actor_id: authResult.user.profile?.id,
        action: 'create_user_ban',
        subject_type: 'ban',
        subject_id: ban.id.toString(),
        meta: {
          target_user_id: userId,
          target_user_name: (profile as any).full_name || (profile as any).email,
          reason: reason.trim(),
          expires_at: expiresAt,
          ban_type: targetType || 'user'
        }
      });

    return NextResponse.json({
      success: true,
      banId: ban.public_id || ban.id.toString(),
      message: 'Ban request created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Admin ban user POST error:', error);
    return NextResponse.json({ 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
