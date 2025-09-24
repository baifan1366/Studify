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
    
    const { questionId, userAnswer, timeTakenSec } = await request.json();

    if (!questionId || userAnswer === undefined) {
      return NextResponse.json(
        { error: 'Question ID and answer are required' },
        { status: 400 }
      );
    }

    // Get question details
    const { data: question, error: questionError } = await supabase
      .from('course_quiz_question')
      .select(`
        *,
        course_lesson!inner(
          *,
          course!inner(*)
        )
      `)
      .eq('public_id', questionId)
      .eq('is_deleted', false)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Check if user is enrolled in the course
    const { data: enrollment } = await supabase
      .from('course_enrollment')
      .select('id')
      .eq('course_id', question.course_lesson.course.id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // Check if already submitted
    const { data: existingSubmission } = await supabase
      .from('course_quiz_submission')
      .select('*')
      .eq('user_id', userId)
      .eq('question_id', question.id)
      .eq('is_deleted', false)
      .single();

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'Question already answered' },
        { status: 409 }
      );
    }

    // Evaluate answer
    let isCorrect = false;
    let pointsEarned = 0;

    switch (question.question_type) {
      case 'multiple_choice':
        isCorrect = userAnswer === question.correct_answer;
        break;
      case 'true_false':
        isCorrect = userAnswer === question.correct_answer;
        break;
      case 'short_answer':
      case 'fill_blank':
        // Simple string comparison (case-insensitive)
        const correctAnswers = Array.isArray(question.correct_answer) 
          ? question.correct_answer 
          : [question.correct_answer];
        isCorrect = correctAnswers.some((answer: any) => 
          answer.toLowerCase().trim() === userAnswer.toLowerCase().trim()
        );
        break;
      case 'essay':
        // Essays need manual grading, mark as submitted but not graded
        isCorrect = false;
        break;
    }

    if (isCorrect) {
      pointsEarned = isCorrect === true ? question.points : 0;
    }

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from('course_quiz_submission')
      .insert({
        user_id: userId,
        question_id: question.id,
        lesson_id: question.course_lesson.id,
        user_answer: userAnswer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        time_taken_sec: timeTakenSec,
      })
      .select()
      .single();

    if (submissionError) {
      return NextResponse.json(
        { error: 'Failed to submit answer' },
        { status: 500 }
      );
    }

    // Log analytics event
    await supabase
      .from('course_analytics')
      .insert({
        user_id: userId,
        course_id: question.course_lesson.course.id,
        lesson_id: question.course_lesson.id,
        event_type: 'quiz_attempt',
        event_data: {
          question_id: question.public_id,
          question_type: question.question_type,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          time_taken_sec: timeTakenSec,
        }
      });

    // If answer is incorrect, the trigger will automatically add to mistake_book
    // But we can also return additional context for immediate feedback

    return NextResponse.json({
      success: true,
      result: {
        isCorrect,
        pointsEarned,
        explanation: question.explanation,
        correctAnswer: isCorrect === false ? question.correct_answer : undefined,
        submittedAt: submission.submitted_at
      }
    });

  } catch (error) {
    console.error('Quiz submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
