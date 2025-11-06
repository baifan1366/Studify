import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET - Fetch notes for a lesson or course
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const lessonId = searchParams.get('lessonId');
    const courseId = searchParams.get('courseId');

    // Get user profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    let query = supabase
      .from('course_notes')
      .select(`
        *,
        lesson:course_lesson!course_notes_lesson_id_fkey(id, public_id, title),
        course:course!course_notes_course_id_fkey(id, public_id, title)
      `)
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (lessonId) {
      // Get lesson internal ID from public_id
      const { data: lesson } = await supabase
        .from('course_lesson')
        .select('id')
        .eq('public_id', lessonId)
        .single();

      if (lesson) {
        query = query.eq('lesson_id', lesson.id);
      }
    }

    if (courseId) {
      // Get course internal ID from public_id
      const { data: course } = await supabase
        .from('course')
        .select('id')
        .eq('public_id', courseId)
        .single();

      if (course) {
        query = query.eq('course_id', course.id);
      }
    }

    const { data: notes, error } = await query;

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Transform notes to include public IDs
    const transformedNotes = notes?.map(note => ({
      id: note.public_id,
      lessonId: note.lesson?.public_id,
      lessonTitle: note.lesson?.title,
      courseId: note.course?.public_id,
      courseTitle: note.course?.title,
      timestampSec: note.timestamp_sec,
      content: note.content,
      aiSummary: note.ai_summary,
      tags: note.tags || [],
      noteType: note.note_type,
      title: note.title,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    })) || [];

    return NextResponse.json({
      success: true,
      notes: transformedNotes,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/course/notes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new note
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    let { lessonId, courseId, timestampSec, content, aiSummary, tags, title, noteType } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    // Get user profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get lesson internal ID if provided
    let lessonInternalId = null;
    if (lessonId) {
      const { data: lesson } = await supabase
        .from('course_lesson')
        .select('id, module_id')
        .eq('public_id', lessonId)
        .single();

      if (lesson) {
        lessonInternalId = lesson.id;

        // If courseId not provided, get it from lesson's module
        if (!courseId && lesson.module_id) {
          const { data: module } = await supabase
            .from('course_module')
            .select('course_id')
            .eq('id', lesson.module_id)
            .single();

          if (module) {
            courseId = module.course_id;
          }
        }
      }
    }

    // Get course internal ID if provided
    let courseInternalId = null;
    if (courseId) {
      const { data: course } = await supabase
        .from('course')
        .select('id')
        .eq('public_id', courseId)
        .single();

      if (course) {
        courseInternalId = course.id;
      }
    }

    // Create note
    const { data: note, error } = await supabase
      .from('course_notes')
      .insert({
        user_id: profile.id,
        lesson_id: lessonInternalId,
        course_id: courseInternalId,
        timestamp_sec: timestampSec,
        content,
        ai_summary: aiSummary,
        tags: tags || [],
        title,
        note_type: noteType || 'ai_generated',
      })
      .select(`
        *,
        lesson:course_lesson!course_notes_lesson_id_fkey(id, public_id, title),
        course:course!course_notes_course_id_fkey(id, public_id, title)
      `)
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Transform note
    const transformedNote = {
      id: note.public_id,
      lessonId: note.lesson?.public_id,
      lessonTitle: note.lesson?.title,
      courseId: note.course?.public_id,
      courseTitle: note.course?.title,
      timestampSec: note.timestamp_sec,
      content: note.content,
      aiSummary: note.ai_summary,
      tags: note.tags || [],
      noteType: note.note_type,
      title: note.title,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    };

    return NextResponse.json({
      success: true,
      note: transformedNote,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/course/notes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update a note
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { noteId, content, tags, timestampSec, title } = body;

    if (!noteId) {
      return NextResponse.json(
        { success: false, error: 'Note ID is required' },
        { status: 400 }
      );
    }

    // Get user profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (content !== undefined) updates.content = content;
    if (tags !== undefined) updates.tags = tags;
    if (timestampSec !== undefined) updates.timestamp_sec = timestampSec;
    if (title !== undefined) updates.title = title;

    // Update note (ensure user owns it)
    const { data: note, error } = await supabase
      .from('course_notes')
      .update(updates)
      .eq('public_id', noteId)
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .select(`
        *,
        lesson:course_lesson!course_notes_lesson_id_fkey(id, public_id, title),
        course:course!course_notes_course_id_fkey(id, public_id, title)
      `)
      .single();

    if (error) {
      console.error('Error updating note:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!note) {
      return NextResponse.json(
        { success: false, error: 'Note not found or unauthorized' },
        { status: 404 }
      );
    }

    // Transform note
    const transformedNote = {
      id: note.public_id,
      lessonId: note.lesson?.public_id,
      lessonTitle: note.lesson?.title,
      courseId: note.course?.public_id,
      courseTitle: note.course?.title,
      timestampSec: note.timestamp_sec,
      content: note.content,
      aiSummary: note.ai_summary,
      tags: note.tags || [],
      noteType: note.note_type,
      title: note.title,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    };

    return NextResponse.json({
      success: true,
      note: transformedNote,
    });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/course/notes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a note
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json(
        { success: false, error: 'Note ID is required' },
        { status: 400 }
      );
    }

    // Get user profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Soft delete note (ensure user owns it)
    const { error } = await supabase
      .from('course_notes')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('public_id', noteId)
      .eq('user_id', profile.id)
      .eq('is_deleted', false);

    if (error) {
      console.error('Error deleting note:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/course/notes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
