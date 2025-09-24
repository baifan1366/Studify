import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
export const runtime = 'nodejs';

// GET - Test whiteboard tables access
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing whiteboard tables access...');
    
    const supabase = await createAdminClient();

    // Test 1: Check if classroom_whiteboard_session table exists
    console.log('📋 Testing classroom_whiteboard_session table...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('classroom_whiteboard_session')
      .select('*')
      .limit(1);

    if (sessionsError) {
      console.error('❌ Error accessing classroom_whiteboard_session:', sessionsError);
      return NextResponse.json({ 
        error: 'Failed to access classroom_whiteboard_session table',
        details: sessionsError 
      }, { status: 500 });
    }

    // Test 2: Check if classroom_whiteboard_event table exists
    console.log('📋 Testing classroom_whiteboard_event table...');
    const { data: events, error: eventsError } = await supabase
      .from('classroom_whiteboard_event')
      .select('*')
      .limit(1);

    if (eventsError) {
      console.error('❌ Error accessing classroom_whiteboard_event:', eventsError);
      return NextResponse.json({ 
        error: 'Failed to access classroom_whiteboard_event table',
        details: eventsError 
      }, { status: 500 });
    }

    // Test 3: Check classroom_live_session table
    console.log('📋 Testing classroom_live_session table...');
    const { data: liveSessions, error: liveError } = await supabase
      .from('classroom_live_session')
      .select('id, session_name, status, classroom_id')
      .limit(5);

    if (liveError) {
      console.error('❌ Error accessing classroom_live_session:', liveError);
      return NextResponse.json({ 
        error: 'Failed to access classroom_live_session table',
        details: liveError 
      }, { status: 500 });
    }

    // Test 4: Check classroom table
    console.log('📋 Testing classroom table...');
    const { data: classrooms, error: classroomError } = await supabase
      .from('classroom')
      .select('id, slug, name')
      .limit(5);

    if (classroomError) {
      console.error('❌ Error accessing classroom:', classroomError);
      return NextResponse.json({ 
        error: 'Failed to access classroom table',
        details: classroomError 
      }, { status: 500 });
    }

    // Test 5: Check profiles table
    console.log('📋 Testing profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, display_name, role')
      .limit(5);

    if (profilesError) {
      console.error('❌ Error accessing profiles:', profilesError);
      return NextResponse.json({ 
        error: 'Failed to access profiles table',
        details: profilesError 
      }, { status: 500 });
    }

    console.log('✅ All tables accessible!');

    return NextResponse.json({
      message: 'All whiteboard-related tables are accessible',
      tableData: {
        whiteboardSessions: {
          count: sessions?.length || 0,
          sample: sessions?.[0] || null
        },
        whiteboardEvents: {
          count: events?.length || 0,
          sample: events?.[0] || null
        },
        liveSessions: {
          count: liveSessions?.length || 0,
          samples: liveSessions || []
        },
        classrooms: {
          count: classrooms?.length || 0,
          samples: classrooms || []
        },
        profiles: {
          count: profiles?.length || 0,
          samples: profiles || []
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in whiteboard debug route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
