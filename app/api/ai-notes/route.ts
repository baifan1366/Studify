import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// 保存AI生成的智能笔记
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.payload.sub;

    const body = await request.json();
    const { content, aiSummary, tags, lessonId, courseId, title } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Get profile ID (bigint) from user_id (UUID)
    const supabase = await createAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    let lessonInternalId: number | null = null;
    let courseInternalId: number | null = null;
    if (lessonId) {
      const lessonColumn = /^\d+$/.test(String(lessonId)) ? 'id' : 'public_id';
      const { data: lesson } = await supabase
        .from('course_lesson')
        .select('id, module_id')
        .eq(lessonColumn, lessonId)
        .maybeSingle();
      lessonInternalId = lesson?.id ?? null;
      if (!courseId && lesson?.module_id) {
        const { data: module } = await supabase
          .from('course_module')
          .select('course_id')
          .eq('id', lesson.module_id)
          .maybeSingle();
        courseInternalId = module?.course_id ?? null;
      }
    }
    if (courseId) {
      const courseColumn = /^\d+$/.test(String(courseId)) ? 'id' : 'public_id';
      const { data: course } = await supabase
        .from('course')
        .select('id')
        .eq(courseColumn, courseId)
        .maybeSingle();
      courseInternalId = course?.id ?? null;
    }

    // 保存AI笔记到数据库
    const { data, error } = await supabase
      .from('course_notes')
      .insert({
        user_id: profile.id,
        lesson_id: lessonInternalId,
        course_id: courseInternalId,
        content,
        ai_summary: aiSummary,
        tags: tags || [],
        timestamp_sec: null, // AI笔记不需要时间戳
        title: title || 'AI智能笔记',
        note_type: 'ai_generated', // 标识为AI生成的笔记
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving AI note:', error);
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'AI note saved successfully' 
    });

  } catch (error) {
    console.error('AI note save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 获取用户的AI笔记
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.payload.sub;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const courseId = searchParams.get('course_id');

    // Get profile ID (bigint) from user_id (UUID)
    const supabase = await createAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    let query = supabase
      .from('course_notes')
      .select('*')
      .eq('user_id', profile.id)
      .eq('note_type', 'ai_generated')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (courseId) {
      const courseColumn = /^\d+$/.test(courseId) ? 'id' : 'public_id';
      const { data: course } = await supabase
        .from('course')
        .select('id')
        .eq(courseColumn, courseId)
        .maybeSingle();
      query = course ? query.eq('course_id', course.id) : query.eq('course_id', -1);
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching AI notes:', error);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: (data || []).map((note) => ({ ...note, id: note.public_id })),
      count: data?.length || 0
    });

  } catch (error) {
    console.error('AI note fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
