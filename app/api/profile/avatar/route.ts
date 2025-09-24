import { NextRequest, NextResponse } from 'next/server';
import { avatarUploader } from '@/lib/avatar-upload';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    let userId: string | null = null;
    try {
      const { data: authData } = await supabase.auth.getUser();
      userId = authData?.user?.id ?? null;
    } catch (err) {
      // 未登录则继续
    }
    
    const formData = await request.formData();
    const file = formData.get('avatar') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Upload to Cloudinary
    const avatar_url = await avatarUploader.uploadAvatar(buffer, userId!);

    // Update profile in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to update profile in database');
    }

    return NextResponse.json({
      success: true,
      avatar_url,
      message: 'Avatar uploaded successfully'
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}
