import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// 保存错题到错题本
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.payload.sub;

    const body = await request.json();
    const { 
      mistakeContent, 
      analysis, 
      knowledgePoints, 
      recommendedExercises, 
      courseId, 
      lessonId,
      sourceType = 'manual' 
    } = body;

    if (!mistakeContent) {
      return NextResponse.json({ error: 'Mistake content is required' }, { status: 400 });
    }

    // 保存错题到数据库
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('mistake_book')
      .insert({
        user_id: userId,
        course_id: courseId || null,
        lesson_id: lessonId || null,
        mistake_content: mistakeContent,
        analysis,
        source_type: sourceType,
        knowledge_points: knowledgePoints || [],
        recommended_exercises: recommendedExercises || {},
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving mistake:', error);
      return NextResponse.json({ error: 'Failed to save mistake' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Mistake saved to mistake book successfully' 
    });

  } catch (error) {
    console.error('Mistake book save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 获取用户的错题本
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
    const knowledgePoint = searchParams.get('knowledge_point');

    const supabase = await createAdminClient();
    let query = supabase
      .from('mistake_book')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (knowledgePoint) {
      query = query.contains('knowledge_points', [knowledgePoint]);
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching mistakes:', error);
      return NextResponse.json({ error: 'Failed to fetch mistakes' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Mistake book fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 删除错题
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.payload.sub;

    const { searchParams } = new URL(request.url);
    const mistakeId = searchParams.get('id');

    if (!mistakeId) {
      return NextResponse.json({ error: 'Mistake ID is required' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const { error } = await supabase
      .from('mistake_book')
      .delete()
      .eq('id', mistakeId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting mistake:', error);
      return NextResponse.json({ error: 'Failed to delete mistake' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Mistake deleted successfully' 
    });

  } catch (error) {
    console.error('Mistake delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
