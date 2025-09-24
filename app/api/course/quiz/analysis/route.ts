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

    const userId = profile.id;
    
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
      .eq('user_id', userId)
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
      .from('course_quiz_question')
      .select('*')
      .eq('lesson_id', lesson.id)
      .eq('is_deleted', false)
      .order('position', { ascending: true });

    if (questionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch quiz questions' },
        { status: 500 }
      );
    }

    if (!questions.length) {
      return NextResponse.json(
        { error: 'No quiz questions found for this lesson' },
        { status: 404 }
      );
    }

    // Fetch user's submissions for these questions
    const questionIds = questions.map((q: any) => q.id);
    const { data: userSubmissions, error: submissionsError } = await supabase
      .from('course_quiz_submission')
      .select('*')
      .eq('user_id', userId)
      .in('question_id', questionIds)
      .eq('is_deleted', false);

    if (submissionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch user submissions' },
        { status: 500 }
      );
    }

    // Create submission map for quick lookup
    const submissionMap = userSubmissions?.reduce((acc: any, s: any) => {
      acc[s.question_id] = s;
      return acc;
    }, {}) || {};

    // Calculate user statistics
    const totalQuestions = questions.length;
    const completedQuestions = userSubmissions?.length || 0;
    const correctAnswers = userSubmissions?.filter((s: any) => s.is_correct).length || 0;
    const totalPossiblePoints = questions.reduce((sum: number, q: any) => sum + q.points, 0);
    const totalEarnedPoints = userSubmissions?.reduce((sum: number, s: any) => sum + (s.points_earned || 0), 0) || 0;
    const totalTimeSpent = userSubmissions?.reduce((sum: number, s: any) => sum + (s.time_taken_sec || 0), 0) || 0;
    const percentage = totalPossiblePoints > 0 ? Math.round((totalEarnedPoints / totalPossiblePoints) * 100) : 0;

    // Get completion time (most recent submission)
    const mostRecentSubmission = userSubmissions?.reduce((latest: any, current: any) => {
      return new Date(current.submitted_at) > new Date(latest?.submitted_at || 0) ? current : latest;
    }, null);

    // Fetch lesson statistics (all students)
    const { data: allSubmissions, error: allSubmissionsError } = await supabase
      .from('course_quiz_submission')
      .select(`
        user_id,
        points_earned,
        is_correct,
        course_quiz_question!inner(lesson_id, points)
      `)
      .eq('course_quiz_question.lesson_id', lesson.id)
      .eq('is_deleted', false);

    if (allSubmissionsError) {
      console.error('Error fetching all submissions:', allSubmissionsError);
    }

    // Calculate lesson statistics
    const enrolledStudentsCount = await supabase
      .from('course_enrollment')
      .select('user_id', { count: 'exact' })
      .eq('course_id', lesson.course.id)
      .eq('status', 'active');

    const totalEnrolledStudents = enrolledStudentsCount.count || 1;

    // Get unique students who submitted at least one answer
    const studentsWithSubmissions = [...new Set(allSubmissions?.map((s: any) => s.user_id) || [])];
    const totalSubmissions = studentsWithSubmissions.length;

    // Calculate average score
    const studentScores = studentsWithSubmissions.map(studentId => {
      const studentSubs = allSubmissions?.filter((s: any) => s.user_id === studentId) || [];
      const studentPoints = studentSubs.reduce((sum: number, s: any) => sum + (s.points_earned || 0), 0);
      return studentPoints;
    });

    const averageScore = studentScores.length > 0 
      ? (studentScores.reduce((sum, score) => sum + score, 0) / studentScores.length / totalPossiblePoints) * 100
      : 0;

    const completionRate = totalEnrolledStudents > 0 ? (totalSubmissions / totalEnrolledStudents) * 100 : 0;

    // Difficulty breakdown
    const difficultyBreakdown = questions.reduce((acc: any, q: any) => {
      const difficulty = q.difficulty || 1;
      if (difficulty <= 2) acc.easy++;
      else if (difficulty === 3) acc.medium++;
      else acc.hard++;
      return acc;
    }, { easy: 0, medium: 0, hard: 0 });

    // Combine questions with user submissions for detailed analysis
    const questionsWithSubmissions = questions.map((question: any) => {
      const submission = submissionMap[question.id];
      return {
        ...question,
        user_answer: submission?.user_answer || null,
        is_correct: submission?.is_correct || false,
        points_earned: submission?.points_earned || 0,
        submitted_at: submission?.submitted_at || null,
      };
    });

    const response = {
      questions: questionsWithSubmissions,
      user_stats: {
        total_score: totalEarnedPoints,
        max_possible_score: totalPossiblePoints,
        percentage,
        correct_count: correctAnswers,
        total_questions: totalQuestions,
        time_taken_sec: totalTimeSpent,
        completed_at: mostRecentSubmission?.submitted_at || null,
      },
      lesson_stats: {
        total_submissions: totalSubmissions,
        average_score: Math.round(averageScore * 10) / 10, // Round to 1 decimal
        completion_rate: Math.round(completionRate * 10) / 10, // Round to 1 decimal
        difficulty_breakdown: difficultyBreakdown,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Quiz analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
