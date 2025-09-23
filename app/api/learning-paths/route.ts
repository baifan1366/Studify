import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// 保存学习路径
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.payload.sub;

    const body = await request.json();
    const { learningPath, title, description } = body;

    if (!learningPath) {
      return NextResponse.json({ error: 'Learning path data is required' }, { status: 400 });
    }

    // 保存学习路径到数据库
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('learning_paths')
      .insert({
        user_id: userId,
        title: title || `${learningPath.learningGoal} Learning Path`,
        description: description || `Personalized learning path for ${learningPath.learningGoal}`,
        learning_goal: learningPath.learningGoal,
        current_level: learningPath.currentLevel,
        time_constraint: learningPath.timeConstraint,
        mermaid_diagram: learningPath.mermaidDiagram,
        roadmap: learningPath.roadmap,
        recommended_courses: learningPath.recommendedCourses,
        quiz_suggestions: learningPath.quizSuggestions,
        study_tips: learningPath.studyTips,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving learning path:', error);
      return NextResponse.json({ error: 'Failed to save learning path' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Learning path saved successfully' 
    });

  } catch (error) {
    console.error('Learning path save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 获取用户的学习路径
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
    const activeOnly = searchParams.get('active_only') === 'true';

    const supabase = await createAdminClient();
    let query = supabase
      .from('learning_paths')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching learning paths:', error);
      return NextResponse.json({ error: 'Failed to fetch learning paths' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Learning path fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 删除学习路径
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.payload.sub;

    const { searchParams } = new URL(request.url);
    const pathId = searchParams.get('id');

    if (!pathId) {
      return NextResponse.json({ error: 'Learning path ID is required' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const { error } = await supabase
      .from('learning_paths')
      .delete()
      .eq('id', pathId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting learning path:', error);
      return NextResponse.json({ error: 'Failed to delete learning path' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Learning path deleted successfully' 
    });

  } catch (error) {
    console.error('Learning path delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
