import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Authorize admin user
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
      return authResult;
    }


    const userId = authResult.sub;    
    
    const supabaseServer = await createClient();
    const body = await request.json();
    
    const {
      target_type,
      target_id,
      reason,
      description,
      severity = 'medium',
      expires_at
    } = body;
    
    // Validate required fields
    if (!target_type || !target_id || !reason) {
      return NextResponse.json(
        { error: 'Target type, target ID, and reason are required' },
        { status: 400 }
      );
    }
    
    // Validate target type
    const validTypes = ['course', 'post', 'comment', 'user'];
    if (!validTypes.includes(target_type)) {
      return NextResponse.json(
        { error: 'Invalid target type' },
        { status: 400 }
      );
    }
    
    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid severity level' },
        { status: 400 }
      );
    }
    
    // Check if content exists
    let contentExists = false;
    switch (target_type) {
      case 'course':
        const { data: course } = await supabaseServer
          .from('course')
          .select('id')
          .eq('id', target_id)
          .single();
        contentExists = !!course;
        break;
        
      case 'post':
        const { data: post } = await supabaseServer
          .from('community_post')
          .select('id')
          .eq('id', target_id)
          .single();
        contentExists = !!post;
        break;
        
      case 'comment':
        const { data: comment } = await supabaseServer
          .from('community_comment')
          .select('id')
          .eq('id', target_id)
          .single();
        contentExists = !!comment;
        break;
        
      case 'user':
        const { data: userProfile } = await supabaseServer
          .from('profiles')
          .select('id')
          .eq('user_id', target_id)
          .single();
        contentExists = !!userProfile;
        break;
    }
    
    if (!contentExists) {
      return NextResponse.json(
        { error: 'Target content not found' },
        { status: 404 }
      );
    }
    
    // Create ban request
    const { data: banData, error: banError } = await supabaseServer
      .from('ban')
      .insert({
        target_type,
        target_id: target_id.toString(),
        reason,
        description,
        severity,
        expires_at: expires_at ? new Date(expires_at).toISOString() : null,
        status: 'pending',
        created_by: userId,
      })
      .select()
      .single();
    
    if (banError) {
      console.error('[CREATE_BAN_ERROR]', banError);
      return NextResponse.json(
        { error: 'Failed to create ban request' },
        { status: 500 }
      );
    }
    
    // If it's a course ban and approved immediately, update course status
    if (target_type === 'course') {
      const { error: courseUpdateError } = await supabaseServer
        .from('course')
        .update({ status: 'ban' })
        .eq('id', target_id);
      
      if (courseUpdateError) {
        console.error('[COURSE_STATUS_UPDATE_ERROR]', courseUpdateError);
        // Don't fail the ban creation, just log the error
      }
    }
    
    return NextResponse.json({
      success: true,
      ban: banData,
      message: 'Ban request created successfully',
    });
    
  } catch (error) {
    console.error('[ADMIN_CREATE_CONTENT_BAN_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to create ban request' },
      { status: 500 }
    );
  }
}
