import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import { getPublicFileUrl, getPrivateFileUrl } from '@/utils/attachment/upload-utils';

export const runtime = 'nodejs';

// POST - Save attachment metadata after upload to Supabase Storage
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id')
      .eq('slug', slug)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Check if user is a member of the classroom
    const { data: membership } = await supabase
      .from('classroom_member')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse the metadata from request body
    const body = await request.json();
    const { 
      file_name, 
      file_url, 
      size_bytes, 
      mime_type, 
      context_type = 'chat',
      visibility = 'private',
      bucket = 'mega-storage',
      path = `mega://${file_name}`,
      custom_message = null, // Optional custom message from user
      assignment_id = null // Optional assignment ID for assignment submissions
    } = body;

    // Map assignment context to material since assignment isn't allowed by DB constraint
    let finalContextType = context_type;
    if (context_type === 'assignment') {
      finalContextType = 'material'; // Use material context type for assignments
    }

    console.log('📝 Received attachment metadata:', {
      file_name,
      custom_message,
      custom_message_type: typeof custom_message,
      custom_message_length: custom_message?.length,
      custom_message_is_null: custom_message === null,
      custom_message_is_undefined: custom_message === undefined,
      custom_message_is_empty_string: custom_message === '',
      context_type,
      has_custom_message: !!custom_message,
      full_body: body
    });

    if (!file_name || !file_url || !size_bytes || !mime_type) {
      return NextResponse.json({ 
        error: 'Missing required fields: file_name, file_url, size_bytes, mime_type' 
      }, { status: 400 });
    }

    // For MEGA uploads, use the direct MEGA URL
    let finalFileUrl: string = file_url;
    
    // If it's a MEGA URL, use it directly (no need for Supabase URL generation)
    if (file_url.includes('mega.nz') || file_url.includes('mega.co.nz')) {
      finalFileUrl = file_url;
      console.log('Using MEGA direct URL:', finalFileUrl);
    } else {
      // Legacy support for Supabase URLs
      try {
        if (file_url.includes('/public/')) {
          // Public bucket - get direct public URL
          const bucketPath = file_url.split('/');
          const bucketName = bucketPath[0];
          const filePath = bucketPath.slice(1).join('/');
          finalFileUrl = getPublicFileUrl(bucketName, filePath);
        } else {
          // Private bucket - generate signed URL (1 hour expiration)
          const bucketPath = file_url.split('/');
          const bucketName = bucketPath[0];
          const filePath = bucketPath.slice(1).join('/');
          finalFileUrl = await getPrivateFileUrl(bucketName, filePath, 3600);
        }
      } catch (error) {
        console.error('Error generating file URL:', error);
        finalFileUrl = file_url; // Fallback to original URL
      }
    }

    // Save attachment record to database
    console.log('💾 Creating attachment record...');
    
    // Store assignment info in the path for assignment context
    let finalPath = path;
    if (context_type === 'assignment' && assignment_id) {
      finalPath = `assignment_${assignment_id}/${path}`;
    }

    const insertData: any = {
      owner_id: profile.id,
      context_type: finalContextType, // Use mapped context type
      context_id: classroom.id,
      file_url: finalFileUrl,
      file_name: file_name,
      mime_type: mime_type,
      size_bytes: size_bytes,
      visibility: visibility,
      bucket: bucket,
      path: finalPath,
      custom_message: custom_message // Now safely included
    };
    
    console.log('🔍 Insert data being sent to database:', {
      ...insertData,
      custom_message_included: 'custom_message' in insertData,
      custom_message_value: insertData.custom_message
    });
    
    const { data: insertedAttachments, error: attachmentError } = await supabase
      .from('classroom_attachments')
      .insert(insertData)
      .select(`
        id,
        public_id,
        file_url,
        file_name,
        mime_type,
        size_bytes,
        created_at,
        visibility,
        bucket,
        path,
        custom_message,
        profiles!classroom_attachments_owner_id_fkey (
          display_name,
          avatar_url
        )
      `); 

    if (attachmentError) {
      console.error('❌ Error saving attachment to database:', {
        error: attachmentError,
        error_message: attachmentError.message,
        error_details: attachmentError.details,
        error_hint: attachmentError.hint,
        error_code: attachmentError.code,
        custom_message_attempted: custom_message
      });
      return NextResponse.json({ 
        error: 'Failed to save attachment record', 
        details: attachmentError.message,
        hint: attachmentError.hint,
        code: attachmentError.code
      }, { status: 500 });
    }

    // Get the single attachment object from the returned array
    const attachment = insertedAttachments ? insertedAttachments[0] : null;

    if (!attachment) {
      console.error('❌ Attachment record was not created or returned after insert.');
      return NextResponse.json({ 
        error: 'Failed to create attachment record' 
      }, { status: 500 });
    }

    console.log('✅ Attachment created successfully:', {
      attachment_id: attachment.id,
      file_name: attachment.file_name,
      custom_message: attachment.custom_message,
      attachment_exists: !!attachment
    });

    // Also create a chat message for this attachment
    // First, get or create a live session for this classroom
    let activeSession = null;
    
    // Try to get existing active session
    const { data: existingSession } = await supabase
      .from('classroom_live_session')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('status', 'live')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingSession) {
      activeSession = existingSession;
    } else {
      // No active session found, create a new one
      const { data: newSession, error: sessionError } = await supabase
        .from('classroom_live_session')
        .insert({
          classroom_id: classroom.id,
          title: 'General Chat Session',
          host_id: profile.id,
          starts_at: new Date().toISOString(),
          status: 'live',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error('Error creating new session:', sessionError);
      } else {
        activeSession = newSession;
      }
    }

    if (activeSession) {
      // Create a chat message for the attachment
      // Use custom message if provided, otherwise use just filename
      let messageText;
      if (custom_message && custom_message.trim().length > 0) {
        messageText = custom_message.trim();
        console.log('✅ Using custom message:', messageText);
      } else {
        messageText = file_name;
        console.log('⚠️ No custom message, using filename:', messageText);
      }
      
      console.log('💬 Attempting to create message:', {
        session_id: activeSession.id,
        sender_id: profile.id,
        message: messageText,
        attachment_id: attachment.id,
        custom_message,
        file_name
      });

      const { error: messageError } = await supabase
        .from('classroom_chat_message')
        .insert({
          session_id: activeSession.id,
          sender_id: profile.id,
          message: messageText,
          attachment_id: attachment.id, 
          created_at: new Date().toISOString()
        });

      if (messageError) {
        console.error('❌ Error creating chat message for attachment:', {
          error: messageError,
          messageText,
          attachment_id: attachment.id,
          session_id: activeSession.id
        });
        
        // Don't fail the entire request, just log the error
        console.error('Full error details:', JSON.stringify(messageError, null, 2));
      } else {
        console.log('✅ Chat message created successfully');
      }
    }

    return NextResponse.json(attachment);

  } catch (error: any) {
    console.error('Error in POST /api/classroom/[slug]/attachments/metadata:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
