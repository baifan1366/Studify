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
    const lessonId = searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
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

    // Fetch quiz questions for the lesson
    const { data: questions, error: questionsError } = await supabase
      .from('course_quiz_questions')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('is_deleted', false)
      .order('position', { ascending: true });

    if (questionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch quiz questions' },
        { status: 500 }
      );
    }

    // Fetch user's previous submissions for these questions
    const questionIds = questions.map((q: any) => q.id);
    const { data: submissions, error: submissionsError } = await supabase
      .from('course_quiz_submissions')
      .select('*')
      .eq('user_id', user.id)
      .in('question_id', questionIds)
      .eq('is_deleted', false);

    // Create a map of submissions by question ID
    const submissionMap = submissions?.reduce((acc: any, s: any) => {
      acc[s.question_id] = s;
      return acc;
    }, {}) || {};

    // Combine questions with user submissions
    const questionsWithSubmissions = questions.map((question: any) => ({
      ...question,
      user_answer: submissionMap[question.id]?.user_answer || null,
      is_correct: submissionMap[question.id]?.is_correct || null,
      points_earned: submissionMap[question.id]?.points_earned || 0,
      submitted_at: submissionMap[question.id]?.submitted_at || null,
    }));

    return NextResponse.json({
      success: true,
      lesson: {
        id: lesson.public_id,
        title: lesson.title,
        courseId: lesson.course.public_id,
        courseTitle: lesson.course.title
      },
      questions: questionsWithSubmissions
    });

  } catch (error) {
    console.error('Quiz fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
