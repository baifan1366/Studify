import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// 获取用户学习路径的里程碑进度
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const pathId = searchParams.get('path_id');

    const supabase = await createAdminClient();

    // 获取用户的profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authResult.payload.sub)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userId = profile.id;

    if (pathId) {
      // 获取特定学习路径的里程碑
      const { data: milestones, error } = await supabase
        .from('milestone')
        .select('*')
        .eq('path_id', pathId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching milestones:', error);
        return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: milestones || []
      });
    } else {
      // 获取用户所有活跃学习路径的里程碑概述
      const { data: paths, error: pathsError } = await supabase
        .from('learning_path')
        .select(`
          id,
          public_id,
          goal,
          progress,
          is_active,
          milestone (
            id,
            title,
            description,
            order_index,
            status,
            resource_type,
            resource_id
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('is_deleted', false);

      if (pathsError) {
        console.error('Error fetching learning paths with milestones:', pathsError);
        return NextResponse.json({ error: 'Failed to fetch learning paths' }, { status: 500 });
      }

      // 基于课程进度计算里程碑数据
      const { data: courseProgress, error: progressError } = await supabase
        .from('course_progress')
        .select(`
          progress_pct,
          state,
          lesson:lesson_id (
            id,
            title,
            course:course_id (
              id,
              title,
              level
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_deleted', false);

      if (progressError) {
        console.warn('Error fetching course progress:', progressError);
      }

      // 生成基于学习进度的里程碑
      const milestones = generateMilestonesFromProgress(courseProgress || []);

      return NextResponse.json({
        success: true,
        data: {
          paths: paths || [],
          generatedMilestones: milestones,
          overallProgress: calculateOverallProgress(courseProgress || [])
        }
      });
    }

  } catch (error) {
    console.error('Learning path milestones fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 辅助函数：基于课程进度生成里程碑
function generateMilestonesFromProgress(courseProgress: any[]) {
  const beginnerCourses = courseProgress.filter(p => 
    p.lesson?.course?.level === 'beginner'
  );
  const intermediateCourses = courseProgress.filter(p => 
    p.lesson?.course?.level === 'intermediate'
  );
  const advancedCourses = courseProgress.filter(p => 
    p.lesson?.course?.level === 'advanced'
  );

  const milestones = [
    {
      id: 1,
      title: "Basic Concepts",
      completed: beginnerCourses.length > 0 && 
        beginnerCourses.every(c => c.state === 'completed'),
      progress: beginnerCourses.length > 0 ? 
        Math.round(beginnerCourses.reduce((sum, p) => sum + (p.progress_pct || 0), 0) / beginnerCourses.length) : 0,
      level: "beginner",
      coursesCount: beginnerCourses.length
    },
    {
      id: 2,
      title: "Intermediate Skills",
      completed: intermediateCourses.length > 0 && 
        intermediateCourses.every(c => c.state === 'completed'),
      progress: intermediateCourses.length > 0 ? 
        Math.round(intermediateCourses.reduce((sum, p) => sum + (p.progress_pct || 0), 0) / intermediateCourses.length) : 0,
      level: "intermediate",
      coursesCount: intermediateCourses.length
    },
    {
      id: 3,
      title: "Advanced Topics",
      completed: advancedCourses.length > 0 && 
        advancedCourses.every(c => c.state === 'completed'),
      progress: advancedCourses.length > 0 ? 
        Math.round(advancedCourses.reduce((sum, p) => sum + (p.progress_pct || 0), 0) / advancedCourses.length) : 0,
      level: "advanced",
      coursesCount: advancedCourses.length
    },
    {
      id: 4,
      title: "Expert Level",
      completed: false,
      progress: 0,
      level: "expert",
      coursesCount: 0
    }
  ];

  return milestones;
}

// 辅助函数：计算总体进度
function calculateOverallProgress(courseProgress: any[]) {
  if (courseProgress.length === 0) return 0;
  
  const totalProgress = courseProgress.reduce((sum, p) => sum + (p.progress_pct || 0), 0);
  return Math.round(totalProgress / courseProgress.length);
}
