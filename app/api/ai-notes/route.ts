import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// 保存AI生成的智能笔记
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student')(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.payload.sub;

    const body = await request.json();
    const { content, aiSummary, tags, lessonId, courseId, title } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // 保存AI笔记到数据库
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('course_notes')
      .insert({
        user_id: userId,
        lesson_id: lessonId || null,
        course_id: courseId || null,
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
    const authResult = await authorize('student')(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.payload.sub;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const courseId = searchParams.get('course_id');

    const supabase = await createAdminClient();
    let query = supabase
      .from('course_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('note_type', 'ai_generated')
      .order('created_at', { ascending: false });

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching AI notes:', error);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('AI note fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
