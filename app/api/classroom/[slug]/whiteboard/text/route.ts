import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
export const runtime = 'nodejs';

// POST - Create or update text box
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
      .select('id, role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { sessionId, textBox, action } = body;

    if (!sessionId || !textBox) {
      return NextResponse.json({ error: 'Session ID and text box data are required' }, { status: 400 });
    }

    // Find or create whiteboard session
    let whiteboardSession;
    const { data: existingSession } = await supabase
      .from('classroom_whiteboard_session')
      .select('id, public_id')
      .eq('session_id', sessionId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingSession) {
      whiteboardSession = existingSession;
    } else {
      // Create new whiteboard session
      const { data: newSession, error: sessionError } = await supabase
        .from('classroom_whiteboard_session')
        .insert({
          session_id: parseInt(sessionId),
          title: `Whiteboard - ${new Date().toLocaleString()}`,
          is_deleted: false
        })
        .select('id, public_id')
        .single();

      if (sessionError) {
        console.error('Error creating whiteboard session:', sessionError);
        return NextResponse.json({ error: 'Failed to create whiteboard session' }, { status: 500 });
      }
      whiteboardSession = newSession;
    }

    // Save or update text box
    if (action === 'create_or_update') {
      // Check if text box already exists
      const { data: existingTextBox, error: checkError } = await supabase
        .from('classroom_whiteboard_text')
        .select('id')
        .eq('whiteboard_session_id', whiteboardSession.id)
        .eq('text_id', textBox.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found (expected)
        console.error('Error checking existing text box:', checkError);
        // Continue anyway, assume it doesn't exist
      }

      if (existingTextBox) {
        // Update existing text box
        const { data: updatedTextBox, error: updateError } = await supabase
          .from('classroom_whiteboard_text')
          .update({
            x: textBox.x,
            y: textBox.y,
            text: textBox.text,
            color: textBox.color,
            font_size: textBox.fontSize,
            alignment: textBox.alignment,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingTextBox.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating text box:', updateError);
          return NextResponse.json({ error: 'Failed to update text box' }, { status: 500 });
        }

        // Broadcast update to all participants
        await broadcastToParticipants(slug, sessionId, {
          type: 'textbox_updated',
          data: updatedTextBox
        });

        return NextResponse.json({ success: true, textBox: updatedTextBox });
      } else {
        // Create new text box
        const { data: newTextBox, error: createError } = await supabase
          .from('classroom_whiteboard_text')
          .insert({
            whiteboard_session_id: whiteboardSession.id,
            text_id: textBox.id,
            x: textBox.x,
            y: textBox.y,
            text: textBox.text,
            color: textBox.color,
            font_size: textBox.fontSize,
            alignment: textBox.alignment,
            is_deleted: false
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating text box:', createError);
          
          // If table doesn't exist, try to use alternative storage (classroom_whiteboard_image metadata)
          if (createError.code === '42P01') { // relation does not exist
            console.log('classroom_whiteboard_text table not found, using alternative storage');
            
            // Store text box data in classroom_whiteboard_image metadata as a fallback
            const textBoxMetadata = {
              type: 'text_box',
              textBoxes: [textBox]
            };
            
            const { data: altTextBox, error: altError } = await supabase
              .from('classroom_whiteboard_image')
              .insert({
                whiteboard_session_id: whiteboardSession.id,
                image_data: '', // empty image data
                width: 0,
                height: 0,
                metadata: textBoxMetadata,
                is_deleted: false
              })
              .select()
              .single();
              
            if (altError) {
              console.error('Alternative text box storage failed:', altError);
              return NextResponse.json({ error: 'Failed to create text box (fallback failed)' }, { status: 500 });
            }
            
            return NextResponse.json({ success: true, textBox: altTextBox, fallback: true });
          }
          
          return NextResponse.json({ error: 'Failed to create text box' }, { status: 500 });
        }

        // Broadcast new text box to all participants
        await broadcastToParticipants(slug, sessionId, {
          type: 'textbox_created',
          data: newTextBox
        });

        return NextResponse.json({ success: true, textBox: newTextBox });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in POST /api/classroom/[slug]/whiteboard/text:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Fetch all text boxes for a session
export async function GET(
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
    
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get whiteboard session
    const { data: whiteboardSession } = await supabase
      .from('classroom_whiteboard_session')
      .select('id')
      .eq('session_id', sessionId)
      .eq('is_deleted', false)
      .single();

    if (!whiteboardSession) {
      return NextResponse.json([]);
    }

    // Get all text boxes for this session
    const { data: textBoxes, error: textBoxesError } = await supabase
      .from('classroom_whiteboard_text')
      .select('*')
      .eq('whiteboard_session_id', whiteboardSession.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (textBoxesError) {
      console.error('Error fetching text boxes:', textBoxesError);
      return NextResponse.json({ error: 'Failed to fetch text boxes' }, { status: 500 });
    }

    return NextResponse.json(textBoxes || []);

  } catch (error) {
    console.error('Error in GET /api/classroom/[slug]/whiteboard/text:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Broadcast changes to all participants (placeholder for real-time implementation)
async function broadcastToParticipants(classroomSlug: string, sessionId: string, message: any) {
  // This would integrate with a real-time system like Supabase Realtime or WebSockets
  // For now, it's a placeholder
  console.log(`Broadcasting to ${classroomSlug}/${sessionId}:`, message);
}
