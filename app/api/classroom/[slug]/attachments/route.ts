import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
export const runtime = 'nodejs';

// GET - List attachments for a classroom
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authResult = await authorize('student');
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

    // Parse query parameters
    const url = new URL(request.url);
    const contextType = url.searchParams.get('context_type');
    const assignmentId = url.searchParams.get('assignment_id');

    // Build query for attachments
    let query = supabase
      .from('classroom_attachments')
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
        context_type,
        profiles!classroom_attachments_owner_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .eq('context_id', classroom.id)
      .eq('is_deleted', false);

    // Filter by context type if provided
    if (contextType) {
      query = query.eq('context_type', contextType);
    }

    // For assignment attachments, we'll use the path or custom_message to store assignment info
    // Since assignment_id column doesn't exist in the database

    const { data: attachments, error: attachmentsError } = await query
      .order('created_at', { ascending: false });

    if (attachmentsError) {
      console.error('Error fetching attachments:', attachmentsError);
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }

    return NextResponse.json(attachments || []);

  } catch (error) {
    console.error('Error in GET /api/classroom/[slug]/attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Upload attachment to classroom
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authResult = await authorize('student');
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
      console.error('Classroom not found for slug:', slug);
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    console.log('POST /attachments - Classroom found:', classroom.id);
    console.log('Checking membership for user profile:', profile.id);

    // Check if user is a member of the classroom
    const { data: membership, error: membershipError } = await supabase
      .from('classroom_member')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (membershipError) {
      console.error('Membership query error:', membershipError);
    }

    if (!membership) {
      console.error('User is not a member of the classroom');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('User membership verified:', membership.id);

    // Parse form data - expecting actual file and metadata
    const formData = await request.formData();
    console.log('FormData keys:', Array.from(formData.keys()));
    const file = formData.get('file') as File;
    let contextType = formData.get('contextType') as string || 'chat';
    const visibility = formData.get('visibility') as string || 'private';
    const customMessage = formData.get('customMessage') as string || null;
    const assignmentId = formData.get('assignmentId') ? parseInt(formData.get('assignmentId') as string) : null;
    
    // Map assignment context to material since assignment isn't allowed by DB constraint
    const originalContextType = contextType;
    if (contextType === 'assignment') {
      contextType = 'material'; // Use material context type for assignments
    }

    if (!file) {
      console.error('No file in formData');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
      contextType,
      visibility,
      customMessage,
      assignmentId,
      hasCustomMessage: !!customMessage
    });

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 100MB.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/', 'video/', 'audio/', 'application/pdf', 
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/', 'application/zip', 'application/x-rar-compressed'
    ];

    const isAllowedType = allowedTypes.some(type => file.type.startsWith(type));
    if (!isAllowedType) {
      return NextResponse.json({ error: 'File type not supported' }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    // Upload to a bucket with visibility-based path
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const BUCKET = 'classroom-attachment';
    const objectPath = `${visibility}/classrooms/${classroom.id}/${uniqueFilename}`;

    console.log('Uploading to bucket:', BUCKET, 'Path:', objectPath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed', details: uploadError.message }, { status: 500 });
    }

    console.log('File uploaded successfully to bucket:', BUCKET);
    console.log('Upload data:', uploadData);

    // First insert without file_url to get the ID
    // Store assignment_id in the path field for assignment context
    let finalPath = objectPath;
    if (originalContextType === 'assignment' && assignmentId) {
      finalPath = `assignment_${assignmentId}/${objectPath}`;
    }

    const insertData: any = {
      owner_id: profile.id,
      context_type: contextType,
      context_id: classroom.id,
      file_url: '', // Will be updated after we get the ID
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      visibility: visibility,
      bucket: BUCKET,
      path: finalPath
    };

    const { data: attachment, error: attachmentError } = await supabase
      .from('classroom_attachments')
      .insert(insertData)
      .select('id')
      .single();

    if (attachmentError) {
      console.error('Error saving attachment to database:', attachmentError);
      // Clean up uploaded file
      await supabase.storage.from(BUCKET).remove([objectPath]);
      return NextResponse.json({ 
        error: 'Failed to save attachment record', 
        details: attachmentError.message 
      }, { status: 500 });
    }

    // Update with permanent-looking URL based on the actual ID
    const permanentUrl = `/api/attachment/${attachment.id}-${Math.random().toString(36).substring(2)}`;
    
    const { data: updatedAttachment, error: updateError } = await supabase
      .from('classroom_attachments')
      .update({ file_url: permanentUrl })
      .eq('id', attachment.id)
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
        profiles!classroom_attachments_owner_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating attachment URL:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update attachment URL'
      }, { status: 500 });
    }

    console.log('Successfully saved attachment with permanent URL:', updatedAttachment);

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
      console.log('Using existing active session:', existingSession.id);
    } else {
      // No active session found, create a new one
      console.log('No active session found, creating new session for classroom:', classroom.id);
      
      const { data: newSession, error: sessionError } = await supabase
        .from('classroom_live_session')
        .insert({
          classroom_id: classroom.id,
          title: 'General Chat Session',
          host_id: profile.id, // Required field
          starts_at: new Date().toISOString(), // Correct field name
          status: 'live', // Set status to live
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error('Error creating new session:', sessionError);
        console.error('Session creation failed, cannot create chat message');
      } else {
        activeSession = newSession;
        console.log('Created new session:', newSession.id);
      }
    }

    if (activeSession) {
      // Create a chat message for the attachment using custom message or filename
      let attachmentMessage;
      if (customMessage && customMessage.trim().length > 0) {
        attachmentMessage = customMessage.trim();
        console.log('✅ Using custom message for fallback API:', attachmentMessage);
      } else {
        attachmentMessage = file.name;
        console.log('⚠️ No custom message for fallback API, using filename:', attachmentMessage);
      }
      
      console.log('Creating chat message with session_id:', activeSession.id, 'and attachment_id:', updatedAttachment.id);
      
      const { error: messageError } = await supabase
        .from('classroom_chat_message')
        .insert({
          session_id: activeSession.id,
          sender_id: profile.id,
          message: attachmentMessage,
          attachment_id: updatedAttachment.id,
          created_at: new Date().toISOString()
        });

      if (messageError) {
        console.error('Error creating chat message for attachment:', messageError);
        console.error('Message error details:', JSON.stringify(messageError, null, 2));
        
        // Log the exact insert data being attempted
        console.error('Attempted insert data:', {
          session_id: activeSession.id,
          sender_id: profile.id,
          message: attachmentMessage,
          created_at: new Date().toISOString()
        });

        // Check if the session actually exists
        const { data: sessionCheck } = await supabase
          .from('classroom_live_session')
          .select('id')
          .eq('id', activeSession.id)
          .single();
          
        console.error('Session exists check:', sessionCheck ? 'YES' : 'NO');
      } else {
        console.log('✅ Chat message created successfully for attachment ID:', updatedAttachment.id);
      }
    } else {
      console.error('❌ Could not get or create active session for classroom:', classroom.id);
    }

    return NextResponse.json(updatedAttachment);

  } catch (error: any) {
    console.error('Error in POST /api/classroom/[slug]/attachments:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
