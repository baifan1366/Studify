import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, token } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (!token || token === 'no-token-found') {
      return NextResponse.json(
        { error: 'Reset token is required. Please use the link from your email.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // 使用 verifyOtp 验证重置密码 token
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery'
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset.' },
        { status: 401 }
      );
    }

    // 验证成功后更新密码
    const { error: updateError } = await supabase.auth.updateUser({ 
      password: password 
    });

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    }

    // 更新 profile 时间戳
    if (data.session?.user) {
      const adminSupabase = await createAdminClient();
      await adminSupabase
        .from('profiles')
        .update({ last_password_change: new Date().toISOString() })
        .eq('user_id', data.session.user.id);
    }

    return NextResponse.json(
      { message: 'Password updated successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
