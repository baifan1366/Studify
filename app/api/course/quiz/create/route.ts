import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

export interface CreateQuizRequest {
  lessonId: string;
  questions: Array<{
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank';
    options?: string[];
    correct_answer: string | boolean;
    explanation?: string;
    points: number;
    difficulty: number;
    position: number;
  }>;
}

export interface CreateQuizResponse {
  success: boolean;
  quiz?: {
    id: string;
    lessonId: string;
    totalQuestions: number;
    totalPoints: number;
    questions: Array<{
      id: string;
      public_id: string;
      question_text: string;
      question_type: string;
      position: number;
      points: number;
      difficulty: number;
    }>;
  };
  error?: string;
  message?: string;
}

/**
 * POST /api/course/quiz/create
 * Create quiz questions for a specific lesson
 */
export async function POST(req: NextRequest): Promise<NextResponse<CreateQuizResponse>> {
  try {
    // Authorize request - tutors can create quiz questions
    const authResult = await authorize(['tutor']);
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<CreateQuizResponse>;
    }

    const body: CreateQuizRequest = await req.json();
    
    // Validate required parameters
    if (!body.lessonId?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: lessonId',
        message: 'Lesson ID is required to create quiz questions'
      }, { status: 400 });
    }

    if (!body.questions || !Array.isArray(body.questions) || body.questions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No questions provided',
        message: 'At least one question is required to create a quiz'
      }, { status: 400 });
    }

    console.log(`📝 Creating quiz for lesson ${body.lessonId} with ${body.questions.length} questions`);

    const supabase = await createAdminClient();
    const userId = authResult.user.profile?.id;
    
    if (!userId) {
      return NextResponse.json({ 
        success: false,
        error: 'Profile not found',
        message: 'User profile not found'
      }, { status: 404 });
    }

    // Verify lesson exists and user has permission
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lesson')
      .select(`
        id, 
        public_id,
        title,
        course:course_id(
          id,
          title,
          owner_id
        )
      `)
      .eq('id', body.lessonId)
      .eq('is_deleted', false)
      .single();

    if (lessonError || !lesson) {
      console.error('❌ Lesson not found:', lessonError);
      return NextResponse.json({
        success: false,
        error: 'Lesson not found',
        message: 'The specified lesson does not exist or has been deleted'
      }, { status: 404 });
    }

    // Check if user owns the course
    const course = lesson.course as any;
    if (course?.owner_id !== userId) {
      return NextResponse.json({
        success: false,
        error: 'Permission denied',
        message: 'You do not have permission to create quiz questions for this lesson'
      }, { status: 403 });
    }

    // Prepare quiz questions for insertion
    const questionsToInsert = body.questions.map(q => {
      // Ensure options is properly formatted
      let optionsValue = null;
      if (q.options && Array.isArray(q.options) && q.options.length > 0) {
        optionsValue = JSON.stringify(q.options);
      }
      
      // Handle correct_answer based on question type
      let correctAnswerValue = q.correct_answer;
      if (q.question_type === 'multiple_choice' && Array.isArray(q.correct_answer)) {
        // For multiple choice, ensure it's a single value
        correctAnswerValue = q.correct_answer[0];
      }
      
      return {
        user_id: userId,
        lesson_id: parseInt(body.lessonId),
        question_text: q.question_text,
        question_type: q.question_type,
        options: optionsValue,
        correct_answer: typeof correctAnswerValue === 'string' ? correctAnswerValue : JSON.stringify(correctAnswerValue),
        explanation: q.explanation || null,
        points: q.points,
        difficulty: q.difficulty,
        position: q.position,
      };
    });

    console.log(`💾 Inserting ${questionsToInsert.length} quiz questions into database`);

    // Insert quiz questions
    const { data: insertedQuestions, error: insertError } = await supabase
      .from('course_quiz_question')
      .insert(questionsToInsert)
      .select(`
        id,
        public_id,
        question_text,
        question_type,
        position,
        points,
        difficulty
      `);

    if (insertError) {
      console.error('❌ Error inserting quiz questions:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: 'Failed to save quiz questions to database'
      }, { status: 500 });
    }

    const totalPoints = insertedQuestions?.reduce((sum: number, q: any) => sum + q.points, 0) || 0;

    console.log(`✅ Successfully created ${insertedQuestions?.length} quiz questions`);

    // Return success response
    return NextResponse.json({
      success: true,
      quiz: {
        id: lesson.public_id,
        lessonId: body.lessonId,
        totalQuestions: insertedQuestions?.length || 0,
        totalPoints,
        questions: insertedQuestions || []
      },
      message: `Successfully created ${insertedQuestions?.length} quiz questions for lesson "${lesson.title}"`
    });

  } catch (error) {
    console.error('❌ Create Quiz API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

/**
 * GET /api/course/quiz/create
 * Get information about quiz creation capabilities
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'Quiz Creation API',
    capabilities: {
      question_types: [
        'multiple_choice',
        'true_false', 
        'short_answer',
        'essay',
        'fill_blank'
      ],
      difficulty_levels: {
        1: 'Easy',
        2: 'Medium',
        3: 'Hard',
        4: 'Expert',
        5: 'Master'
      },
      max_questions_per_lesson: 100,
      max_points_per_question: 100,
      features: [
        'Multiple question types',
        'Difficulty levels 1-5',
        'Custom explanations',
        'Flexible scoring',
        'Position ordering'
      ]
    }
  });
}
