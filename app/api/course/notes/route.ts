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
    const user = authResult.user;
    
    const { lessonId, timestampSec, content, tags } = await request.json();

    if (!lessonId || !content) {
      return NextResponse.json(
        { error: 'Lesson ID and content are required' },
        { status: 400 }
      );
    }

    // Get lesson details
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lesson')
      .select('*, course!inner(*)')
      .eq('public_id', lessonId)
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
      .eq('user_id', user.id)
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
        user_id: user.profile?.id || user.id,
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
        user_id: user.profile?.id || user.id,
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
    const user = authResult.user;
    
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const courseId = searchParams.get('courseId');

    if (!lessonId && !courseId) {
      return NextResponse.json(
        { error: 'Lesson ID or Course ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('course_notes')
      .select(`
        *,
        course_lesson!inner(
          public_id,
          title,
          course!inner(public_id, title)
        )
      `)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('timestamp_sec', { ascending: true });

    if (lessonId) {
      // Get notes for specific lesson
      const { data: lesson } = await supabase
        .from('course_lesson')
        .select('id')
        .eq('public_id', lessonId)
        .single();

      if (!lesson) {
        return NextResponse.json(
          { error: 'Lesson not found' },
          { status: 404 }
        );
      }

      query = query.eq('lesson_id', lesson.id);
    } else if (courseId) {
      // Get all notes for a course
      const { data: course } = await supabase
        .from('course')
        .select('id')
        .eq('public_id', courseId)
        .single();

      if (!course) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        );
      }

      query = query.eq('course_lesson.course.id', course.id);
    }

    const { data: notes, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      );
    }

    const formattedNotes = notes.map(note => ({
      id: note.public_id,
      lessonId: note.course_lesson.public_id,
      lessonTitle: note.course_lesson.title,
      courseId: note.course_lesson.course.public_id,
      courseTitle: note.course_lesson.course.title,
      timestampSec: note.timestamp_sec,
      content: note.content,
      aiSummary: note.ai_summary,
      tags: note.tags,
      createdAt: note.created_at,
      updatedAt: note.updated_at
    }));

    return NextResponse.json({
      success: true,
      notes: formattedNotes
    });

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
    const user = authResult.user;
    
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
      .eq('user_id', user.id)
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
    const user = authResult.user;
    
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
      .eq('user_id', user.id);

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
