import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import { uploadFileToBucket } from '@/utils/attachment/upload-utils';

export async function POST(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const userId = authResult.sub;
    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string;
    const customMessage = formData.get('customMessage') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    // Upload file directly to Supabase Storage using service role
    const fileName = `${Date.now()}-${file.name}`;
    let filePath = `${profile.id}/${fileName}`; // Use profile.id instead of userId

    console.log('Uploading file:', { fileName, filePath, profileId: profile.id, userId });

    // Create a new admin client specifically for storage operations
    const storageClient = await createAdminClient();
    
    let { data: uploadData, error: uploadError } = await storageClient.storage
      .from('chat-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      
      // Try alternative path format if first attempt fails
      const altFilePath = `uploads/${profile.id}/${fileName}`;
      console.log('Retrying with alternative path:', altFilePath);
      
      const { data: retryData, error: retryError } = await storageClient.storage
        .from('chat-attachments')
        .upload(altFilePath, file, {
          cacheControl: '3600',
          upsert: false,
        });
        
      if (retryError) {
        return NextResponse.json({ 
          error: `File upload failed: ${retryError.message}`,
          originalError: uploadError,
          retryError: retryError,
          suggestion: 'Check storage policies and bucket configuration'
        }, { status: 500 });
      }
      
      // Use retry data if successful
      uploadData = retryData;
      filePath = altFilePath;
    }

    if (!uploadData) {
      return NextResponse.json({ 
        error: 'Upload succeeded but no data returned',
        filePath 
      }, { status: 500 });
    }

    console.log('File uploaded successfully:', uploadData);

    // Create attachment record
    const { data: attachment, error: attachmentError } = await supabase
      .from('chat_attachments')
      .insert({
        uploader_id: profile.id,
        file_name: file.name,
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        file_url: `/api/chat/attachments`,
        storage_path: uploadData.path,
        custom_message: customMessage || null,
      })
      .select('*')
      .single();

    if (attachmentError) {
      console.error('Error creating attachment record:', attachmentError);
      return NextResponse.json({ error: 'Failed to create attachment record' }, { status: 500 });
    }

    // Send message with attachment
    const participantId = parseInt(conversationId.replace('user_', ''));
    
    // Get or create conversation
    const { data: actualConversationId, error: convError } = await supabase
      .rpc('create_or_get_conversation', {
        user1_id: profile.id,
        user2_id: participantId
      });

    if (convError || !actualConversationId) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Create message with attachment
    const messageContent = customMessage || `📎 Shared: ${file.name}`;
    
    const { data: message, error: messageError } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: actualConversationId,
        sender_id: profile.id,
        content: messageContent,
        message_type: 'file',
        attachment_id: attachment.id,
        delivered_at: new Date().toISOString(),
      })
      .select(`
        id,
        content,
        sender_id,
        message_type,
        created_at,
        delivered_at,
        attachment_id,
        sender:profiles!direct_messages_sender_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }

    // Return the attachment and message data
    return NextResponse.json({
      attachment,
      message: {
        id: message.id.toString(),
        content: message.content,
        senderId: message.sender_id.toString(),
        senderName: (message.sender as any)?.display_name || 'You',
        senderAvatar: (message.sender as any)?.avatar_url,
        timestamp: message.created_at,
        deliveredAt: message.delivered_at,
        type: message.message_type || 'file',
        isFromMe: true,
        status: 'delivered' as const,
        isEdited: false,
        attachmentId: message.attachment_id,
        attachment,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
