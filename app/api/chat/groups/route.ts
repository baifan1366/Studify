import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function POST(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize(['student', 'tutor']);
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
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse request body
    const { name, description, member_ids } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      return NextResponse.json({ error: 'At least one member is required' }, { status: 400 });
    }

    // Validate that member IDs exist and get their profile IDs
    // Note: member_ids are profile IDs (numeric), not user UUIDs
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('id, user_id, display_name')
      .in('id', member_ids.map(id => parseInt(id, 10)));

    if (membersError) {
      console.error('Error validating member IDs:', membersError);
      return NextResponse.json({ error: 'Error validating member IDs' }, { status: 500 });
    }

    if (!members || members.length === 0) {
      console.error('No valid members found for IDs:', member_ids);
      return NextResponse.json({ error: 'No valid members found' }, { status: 400 });
    }

    console.log('Found members:', members.length, 'of', member_ids.length, 'requested');

    // Create group conversation
    console.log('Creating group conversation:', {
      name: name.trim(),
      description: description?.trim() || null,
      created_by: profile.id
    });

    const { data: conversation, error: conversationError } = await supabase
      .from('group_conversations')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: profile.id,
        avatar_url: null // Can be added later
      })
      .select('*')
      .single();

    if (conversationError) {
      console.error('Failed to create group conversation:', conversationError);
      
      // Check if it's a table not found error
      if (conversationError.message.includes('relation') && conversationError.message.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Group conversations table not found. Please run the database migration.' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: `Database error: ${conversationError.message}` 
      }, { status: 500 });
    }

    if (!conversation) {
      console.error('No conversation returned from database');
      return NextResponse.json({ error: 'Failed to create group conversation' }, { status: 500 });
    }

    console.log('Group conversation created:', conversation.id);

    // Add creator as admin member
    const membersToAdd = [
      {
        conversation_id: conversation.id,
        user_id: profile.id,
        role: 'admin'
      },
      // Add selected members as regular members
      ...members.map(member => ({
        conversation_id: conversation.id,
        user_id: member.id,
        role: 'member'
      }))
    ];

    console.log('Adding group members:', membersToAdd.length, 'members');

    const { error: membersInsertError } = await supabase
      .from('group_members')
      .insert(membersToAdd);

    if (membersInsertError) {
      console.error('Failed to add group members:', membersInsertError);
      
      // Check if it's a table not found error
      if (membersInsertError.message.includes('relation') && membersInsertError.message.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Group members table not found. Please run the database migration.' 
        }, { status: 500 });
      }
      
      // Clean up the conversation if members couldn't be added
      await supabase
        .from('group_conversations')
        .delete()
        .eq('id', conversation.id);
      
      return NextResponse.json({ 
        error: `Failed to add members: ${membersInsertError.message}` 
      }, { status: 500 });
    }

    console.log('Group members added successfully');

    // Return success response with conversation data
    const responseData = {
      success: true,
      conversation: {
        id: `group_${conversation.id}`, // Prefix for group conversations
        name: conversation.name,
        description: conversation.description,
        type: 'group',
        created_at: conversation.created_at,
        member_count: membersToAdd.length
      }
    };

    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
