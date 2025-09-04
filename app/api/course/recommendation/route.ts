import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const supabase = await createClient();
    const user = authResult.user;
    
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select('*')
      .eq('public_id', courseId)
      .eq('is_deleted', false)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if user is enrolled
    const { data: enrollment } = await supabase
      .from('course_enrollment')
      .select('id')
      .eq('course_id', course.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // Get user's progress data
    const { data: progressData } = await supabase
      .from('course_progress')
      .select(`
        *,
        course_lesson!inner(
          public_id,
          title,
          position,
          duration_sec
        )
      `)
      .eq('course_lesson.course_id', course.id)
      .eq('user_id', user.id);

    // Get user's mistake book entries for this course
    const { data: mistakes } = await supabase
      .from('mistake_book')
      .select(`
        *,
        course_quiz_question(
          public_id,
          question_text,
          lesson_id,
          course_lesson(
            public_id,
            title
          )
        )
      `)
      .eq('course_id', course.id)
      .eq('user_id', user.id)
      .eq('is_deleted', false);

    // Get quiz performance
    const { data: quizSubmissions } = await supabase
      .from('course_quiz_submission')
      .select(`
        *,
        course_quiz_question!inner(
          lesson_id,
          difficulty,
          course_lesson(
            public_id,
            title
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('course_quiz_question.course_lesson.course_id', course.id);

    // Generate recommendations based on data
    const recommendations = generateRecommendations({
      progressData: progressData || [],
      mistakes: mistakes || [],
      quizSubmissions: quizSubmissions || []
    });

    return NextResponse.json({
      success: true,
      recommendations
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateRecommendations({ progressData, mistakes, quizSubmissions }: {
  progressData: any[];
  mistakes: any[];
  quizSubmissions: any[];
}) {
  const recommendations = [];

  // 1. Incomplete lessons
  const incompleteLessons = progressData.filter(p => 
    p.state !== 'completed' && p.progress_pct < 100
  );

  if (incompleteLessons.length > 0) {
    const nextLesson = incompleteLessons.sort((a, b) => 
      a.course_lesson.position - b.course_lesson.position
    )[0];

    recommendations.push({
      type: 'continue_lesson',
      priority: 'high',
      title: '继续学习课程',
      description: `继续学习 "${nextLesson.course_lesson.title}"`,
      action: {
        type: 'navigate',
        lessonId: nextLesson.course_lesson.public_id
      },
      reason: '您有未完成的课程内容'
    });
  }

  // 2. Review mistakes
  if (mistakes.length > 0) {
    const recentMistakes = mistakes
      .filter(m => {
        const mistakeDate = new Date(m.created_at);
        const daysSince = (Date.now() - mistakeDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 7; // Recent mistakes within 7 days
      });

    if (recentMistakes.length > 0) {
      recommendations.push({
        type: 'review_mistakes',
        priority: 'medium',
        title: '复习错题',
        description: `您有 ${recentMistakes.length} 道最近的错题需要复习`,
        action: {
          type: 'navigate',
          path: 'mistake-book'
        },
        reason: '复习错题有助于巩固知识点'
      });
    }
  }

  // 3. Quiz performance analysis
  if (quizSubmissions.length > 0) {
    const incorrectAnswers = quizSubmissions.filter(s => !s.is_correct);
    const difficultyStats = incorrectAnswers.reduce((acc, submission) => {
      const difficulty = submission.course_quiz_question.difficulty || 1;
      acc[difficulty] = (acc[difficulty] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // If struggling with basic concepts (difficulty 1-2)
    if ((difficultyStats[1] || 0) + (difficultyStats[2] || 0) > 3) {
      recommendations.push({
        type: 'review_basics',
        priority: 'high',
        title: '复习基础概念',
        description: '建议复习基础知识点以建立更牢固的基础',
        action: {
          type: 'navigate',
          path: 'concepts'
        },
        reason: '在基础题目上有较多错误'
      });
    }
  }

  // 4. Study streak and engagement
  const recentProgress = progressData.filter(p => {
    if (!p.last_seen_at) return false;
    const lastSeen = new Date(p.last_seen_at);
    const daysSince = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 3;
  });

  if (recentProgress.length === 0 && progressData.length > 0) {
    recommendations.push({
      type: 'resume_learning',
      priority: 'medium',
      title: '恢复学习',
      description: '您已经几天没有学习了，建议继续保持学习习惯',
      action: {
        type: 'navigate',
        path: 'dashboard'
      },
      reason: '保持学习连续性很重要'
    });
  }

  // 5. Practice recommendations
  const completedLessons = progressData.filter(p => p.state === 'completed');
  if (completedLessons.length > 0 && quizSubmissions.length < completedLessons.length * 2) {
    recommendations.push({
      type: 'more_practice',
      priority: 'low',
      title: '增加练习',
      description: '建议多做练习题来巩固所学知识',
      action: {
        type: 'navigate',
        path: 'practice'
      },
      reason: '练习不足，建议增加练习量'
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority as keyof typeof priorityOrder] - 
           priorityOrder[a.priority as keyof typeof priorityOrder];
  });
}
