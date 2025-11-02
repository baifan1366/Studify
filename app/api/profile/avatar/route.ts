import { NextRequest, NextResponse } from 'next/server';
import { uploadToMega } from '@/lib/mega';
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

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
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

    // Validate file size (10MB limit for avatars)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    console.log(`Uploading avatar for user ${userId}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Upload to MEGA and get the public link
    const { url: avatar_url, size } = await uploadToMega(file);

    console.log(`Avatar uploaded successfully to MEGA: ${avatar_url}`);

    // Update profile in database with MEGA link
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to update profile in database');
    }

    return NextResponse.json({
      success: true,
      avatar_url,
      file_size: size,
      message: 'Avatar uploaded successfully to MEGA'
    });

  } catch (error: any) {
    console.error('Avatar upload error:', error);
    
    // Provide user-friendly error messages
    const errorMessage = error?.message || 'Failed to upload avatar';
    
    if (errorMessage.includes('MEGA')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to upload avatar. Please try again.' },
      { status: 500 }
    );
  }
}
