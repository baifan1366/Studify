import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET - 获取用户偏好设置
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize(['student', 'tutor', 'admin']);
    if ('status' in authResult) {
      return authResult;
    }

    // 获取用户的profile ID
    const supabase = await createAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, preferences, theme, language, notification_settings, privacy_settings')
      .eq('user_id', authResult.payload.sub)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 默认学习偏好
    const defaultPreferences = {
      weekly_study_goal_hours: 10,
      daily_study_goal_minutes: 60,
      preferred_study_time: 'morning', // morning, afternoon, evening, night
      difficulty_preference: 'adaptive', // beginner, intermediate, advanced, adaptive
      notification_frequency: 'daily', // immediate, daily, weekly, never
      learning_style: 'mixed', // visual, auditory, kinesthetic, mixed
      break_reminder_interval: 30, // minutes
      auto_play_next_lesson: true,
      progress_visibility: 'public', // public, friends, private
      achievement_notifications: true
    };

    // 合并用户设置和默认设置
    const userPreferences = {
      ...defaultPreferences,
      ...(profile.preferences || {})
    };

    return NextResponse.json({
      success: true,
      data: {
        preferences: userPreferences,
        theme: profile.theme,
        language: profile.language,
        notification_settings: profile.notification_settings,
        privacy_settings: profile.privacy_settings
      }
    });

  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - 更新用户偏好设置
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authorize(['student', 'tutor', 'admin']);
    if ('status' in authResult) {
      return authResult;
    }

    const body = await request.json();
    const { preferences, theme, language, notification_settings, privacy_settings } = body;

    // 获取用户的profile ID
    const supabase = await createAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, preferences')
      .eq('user_id', authResult.payload.sub)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 准备更新数据
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (preferences) {
      // 合并现有偏好和新偏好
      updateData.preferences = {
        ...(profile.preferences || {}),
        ...preferences
      };
    }

    if (theme) updateData.theme = theme;
    if (language) updateData.language = language;
    if (notification_settings) updateData.notification_settings = notification_settings;
    if (privacy_settings) updateData.privacy_settings = privacy_settings;

    // 更新profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id);

    if (updateError) {
      console.error('Error updating user preferences:', updateError);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
