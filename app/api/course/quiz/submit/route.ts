import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import { notificationService } from '@/lib/notifications/notification-service';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { payload, user } = authResult;
    
    // Get user profile ID from the cached user info
    const userId = user.profile?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const supabase = await createAdminClient();
    
    const { questionId, userAnswer, timeTakenSec, sendNotification = false } = await request.json();

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

    // Send notification if requested
    if (sendNotification) {
      try {
        // Get course owner (tutor)
        const courseOwnerId = question.course_lesson.course.owner_id;
        
        if (courseOwnerId && courseOwnerId !== userId) {
          // Get student name
          const { data: studentProfile } = await supabase
            .from('profiles')
            .select('display_name, full_name')
            .eq('id', userId)
            .single();

          const studentName = studentProfile?.display_name || studentProfile?.full_name || 'A student';

          await notificationService.createNotification({
            user_id: courseOwnerId,
            kind: 'course_notification',
            payload: {
              type: 'quiz_submission',
              question_id: questionId,
              lesson_id: question.course_lesson.public_id,
              lesson_title: question.course_lesson.title,
              course_id: question.course_lesson.course.public_id,
              course_title: question.course_lesson.course.title,
              student_id: userId,
              student_name: studentName,
              is_correct: isCorrect,
              points_earned: pointsEarned,
            },
            title: '新测验提交',
            message: `${studentName} 提交了测验答案 - ${isCorrect ? '✓ 正确' : '✗ 错误'}`,
            deep_link: `/course/${question.course_lesson.course.public_id}`,
            send_push: true,
          });
        }
      } catch (notifError) {
        console.error('Failed to send quiz submission notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

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
