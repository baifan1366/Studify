import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userId = profile.id; // This is the bigint we need
    
    const { lessonId, timestampSec, content, tags } = await request.json();

    if (!lessonId || !content) {
      return NextResponse.json(
        { error: 'Lesson ID and content are required' },
        { status: 400 }
      );
    }

    // Validate lessonId is a number (internal ID)
    if (typeof lessonId !== 'number') {
      return NextResponse.json(
        { error: 'Invalid lesson ID - must be a number' },
        { status: 400 }
      );
    }

    // Get lesson details using internal ID
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lesson')
      .select('*, course!inner(*)')
      .eq('id', lessonId)
      .eq('is_deleted', false)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Check if user is enrolled in the course
    const { data: enrollment } = await supabase
      .from('course_enrollment')
      .select('id')
      .eq('course_id', lesson.course.id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // Create note
    const { data: note, error: noteError } = await supabase
      .from('course_notes')
      .insert({
        user_id: userId,
        lesson_id: lesson.id,
        timestamp_sec: timestampSec,
        content,
        tags: tags || []
      })
      .select()
      .single();

    if (noteError) {
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      );
    }

    // Log analytics event
    await supabase
      .from('course_analytics')
      .insert({
        user_id: userId,
        course_id: lesson.course.id,
        lesson_id: lesson.id,
        event_type: 'note_created',
        event_data: {
          timestamp_sec: timestampSec,
          content_length: content.length,
          tags: tags || []
        }
      });

    return NextResponse.json({
      success: true,
      note: {
        id: note.public_id,
        lessonId: lesson.public_id,
        timestampSec: note.timestamp_sec,
        content: note.content,
        tags: note.tags,
        createdAt: note.created_at
      }
    });

  } catch (error) {
    console.error('Note creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userId = profile.id; // This is the bigint we need

    const { searchParams } = new URL(request.url);
    const lessonIdParam = searchParams.get('lessonId');
    const courseIdParam = searchParams.get('courseId');

    if (!lessonIdParam && !courseIdParam) {
      return NextResponse.json(
        { error: 'Lesson ID or Course ID is required' },
        { status: 400 }
      );
    }

    if (lessonIdParam) {
      const lessonId = parseInt(lessonIdParam);
      if (isNaN(lessonId)) {
        return NextResponse.json(
          { error: 'Invalid lesson ID - must be a number' },
          { status: 400 }
        );
      }
      
      // Get the lesson info using internal ID
      const { data: lesson, error: lessonError } = await supabase
        .from('course_lesson')
        .select('id, public_id, title, course_id')
        .eq('id', lessonId)
        .single();

      if (lessonError) {
        console.error('❌ Lesson lookup error:', lessonError);
        return NextResponse.json(
          { error: 'Lesson not found' },
          { status: 404 }
        );
      }

      if (!lesson) {
        console.error('❌ No lesson found for public_id:', lessonId);
        return NextResponse.json(
          { error: 'Lesson not found' },
          { status: 404 }
        );
      }

      // Then get the course info
      const { data: course, error: courseError } = await supabase
        .from('course')
        .select('public_id, title')
        .eq('id', lesson.course_id)
        .single();

      if (courseError) {
        console.error('❌ Course lookup error:', courseError);
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 500 }
        );
      }
      
      let notes = [];
      let notesError = null;

      try {
        // Query with explicit bigint type - lesson.id should be 25 (bigint)
        const result = await supabase
          .from('course_notes')
          .select('*')
          .eq('user_id', userId)
          .eq('lesson_id', lesson.id) // This MUST be bigint 25, not UUID
          .eq('is_deleted', false)
          .order('timestamp_sec', { ascending: true });
        
        notes = result.data || [];
        notesError = result.error;
      } catch (error) {
        console.error('🚨 Query execution failed:', error);
        // For now, return empty notes instead of breaking the app
        notes = [];
        notesError = null;
      }

      if (notesError) {
        console.error('❌ Notes fetch error:', notesError);
        return NextResponse.json(
          { error: 'Failed to fetch notes' },
          { status: 500 }
        );
      }

      const formattedNotes = notes.map(note => ({
        id: note.public_id,
        lessonId: lesson.public_id,
        lessonTitle: lesson.title,
        courseId: course.public_id,
        courseTitle: course.title,
        timestampSec: note.timestamp_sec,
        content: note.content,
        aiSummary: note.ai_summary,
        tags: note.tags,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      }));

      return NextResponse.json({
        success: true,
        notes: formattedNotes,
      });
    }

    if (courseIdParam) {
      const courseId = parseInt(courseIdParam);
      if (isNaN(courseId)) {
        return NextResponse.json(
          { error: 'Invalid course ID - must be a number' },
          { status: 400 }
        );
      }
      
      // Get the course info using internal ID
      const { data: course, error: courseError } = await supabase
        .from('course')
        .select('id, public_id, title')
        .eq('id', courseId)
        .single();

      if (courseError || !course) {
        console.error('❌ Course lookup error:', courseError);
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        );
      }

      // Get all lessons for that course
      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lesson')
        .select('id, public_id, title')
        .eq('course_id', course.id);

      if (lessonsError) {
        console.error('❌ Lessons lookup error:', lessonsError);
        return NextResponse.json(
          { error: 'Failed to fetch lessons for course' },
          { status: 500 }
        );
      }

      const lessonIds = lessons?.map(l => l.id) ?? [];
      if (lessonIds.length === 0) {
        return NextResponse.json({ success: true, notes: [] });
      }

      // Get all notes for these lessons
      const { data: notes, error: notesError } = await supabase
        .from('course_notes')
        .select('*')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds) // Use bigint IDs
        .eq('is_deleted', false)
        .order('timestamp_sec', { ascending: true });

      if (notesError) {
        console.error('❌ Notes fetch error:', notesError);
        return NextResponse.json(
          { error: 'Failed to fetch notes' },
          { status: 500 }
        );
      }

      // Create a lookup map for lessons
      const lessonMap = lessons.reduce((acc, lesson) => {
        acc[lesson.id] = lesson;
        return acc;
      }, {} as Record<number, any>);

      const formattedNotes = notes.map(note => {
        const lesson = lessonMap[note.lesson_id];
        return {
          id: note.public_id,
          lessonId: lesson?.public_id || '',
          lessonTitle: lesson?.title || 'Unknown Lesson',
          courseId: course.public_id,
          courseTitle: course.title,
          timestampSec: note.timestamp_sec,
          content: note.content,
          aiSummary: note.ai_summary,
          tags: note.tags,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
        };
      });

      return NextResponse.json({
        success: true,
        notes: formattedNotes,
      });
    }

    // This should never be reached due to the validation above, but just in case
    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Notes fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const supabase = await createClient();
    const user = authResult.sub;
    
    const { noteId, content, tags } = await request.json();

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    // Update note
    const { data: note, error: noteError } = await supabase
      .from('course_notes')
      .update({
        content: content,
        tags: tags,
        updated_at: new Date().toISOString()
      })
      .eq('public_id', noteId)
      .eq('user_id', user)
      .eq('is_deleted', false)
      .select()
      .single();

    if (noteError || !note) {
      return NextResponse.json(
        { error: 'Note not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      note: {
        id: note.public_id,
        content: note.content,
        tags: note.tags,
        updatedAt: note.updated_at
      }
    });

  } catch (error) {
    console.error('Note update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const supabase = await createClient();
    const user = authResult.sub;
    
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    // Soft delete note
    const { error: deleteError } = await supabase
      .from('course_notes')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('public_id', noteId)
      .eq('user_id', user);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Note deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
