import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { aiWorkflowExecutor } from '@/lib/langChain/ai-workflow';
import { getToolsByCategory } from '@/lib/langChain/tools';

export interface GenerateQuizRequest {
  topic: string;
  num_questions?: number;
  difficulty?: number;
  question_types?: string[];
  focus_topics?: string;
  include_explanations?: boolean;
  lesson_content?: string;
  custom_instructions?: string;
  lessonId?: string;
}

export interface GenerateQuizResponse {
  success: boolean;
  quiz?: {
    title: string;
    description: string;
    total_points: number;
    estimated_time_minutes: number;
    questions: Array<{
      id: string;
      question_text: string;
      question_type: string;
      options: string[];
      correct_answer: string | boolean;
      explanation: string;
      points: number;
      difficulty: number;
      position: number;
    }>;
  };
  error?: string;
  message?: string;
}

/**
 * POST /api/ai/generate-quiz
 * Generate quiz questions using AI based on provided parameters
 */
export async function POST(req: NextRequest): Promise<NextResponse<GenerateQuizResponse>> {
  try {
    // Authorize request
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<GenerateQuizResponse>;
    }

    const body: GenerateQuizRequest = await req.json();
    
    // Validate required parameters
    if (!body.topic?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: topic',
        message: 'Topic is required to generate quiz questions'
      }, { status: 400 });
    }

    console.log(`🎯 AI Quiz Generation Request from user ${authResult.payload.profileId}:`, {
      topic: body.topic,
      num_questions: body.num_questions,
      difficulty: body.difficulty,
      question_types: body.question_types,
      lessonId: body.lessonId
    });

    // Generate quiz using our internal generation logic
    console.log('🎯 Generating quiz with parameters:', {
      topic: body.topic,
      num_questions: body.num_questions || 5,
      difficulty: body.difficulty || 2,
      question_types: body.question_types || ['multiple_choice', 'true_false']
    });
    
    // Create a mock quiz for now (this would be replaced with actual AI generation)
    const generatedQuiz = await generateMockQuiz({
      topic: body.topic,
      num_questions: body.num_questions || 5,
      difficulty: body.difficulty || 2,
      question_types: body.question_types || ['multiple_choice', 'true_false'],
      focus_topics: body.focus_topics,
      include_explanations: body.include_explanations ?? true,
      lesson_content: body.lesson_content,
      custom_instructions: body.custom_instructions
    });

    // Return successful response
    return NextResponse.json({
      success: true,
      quiz: generatedQuiz,
      message: `Successfully generated ${generatedQuiz.questions.length} quiz questions`
    });

  } catch (error) {
    console.error('❌ Quiz Generation API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

/**
 * Build comprehensive prompt for quiz generation
 */
function buildQuizGenerationPrompt(params: GenerateQuizRequest): string {
  const {
    topic,
    num_questions = 5,
    difficulty = 2,
    question_types = ['multiple_choice', 'true_false'],
    focus_topics,
    include_explanations = true,
    lesson_content,
    custom_instructions
  } = params;

  const difficultyLabels = {
    1: 'Beginner (Easy)',
    2: 'Intermediate (Medium)', 
    3: 'Advanced (Hard)',
    4: 'Expert (Very Hard)',
    5: 'Master (Extremely Hard)'
  };

  const typeDescriptions = {
    'multiple_choice': 'Multiple choice questions with 4 options (A, B, C, D)',
    'true_false': 'True/false questions',
    'short_answer': 'Short answer questions requiring brief explanations',
    'essay': 'Essay questions requiring detailed responses',
    'fill_blank': 'Fill-in-the-blank questions'
  };

  let prompt = `You are an expert educational content creator. Generate a comprehensive quiz on the topic: "${topic}".

QUIZ REQUIREMENTS:
- Number of questions: ${num_questions}
- Difficulty level: ${difficultyLabels[difficulty as keyof typeof difficultyLabels] || 'Intermediate'}
- Question types: ${question_types.map(type => typeDescriptions[type as keyof typeof typeDescriptions]).join(', ')}
- Include explanations: ${include_explanations ? 'Yes' : 'No'}`;

  if (focus_topics) {
    prompt += `\n- Focus areas: ${focus_topics}`;
  }

  if (lesson_content) {
    prompt += `\n\nBASE CONTENT:\n"${lesson_content.slice(0, 1000)}${lesson_content.length > 1000 ? '...' : ''}"`;
  }

  if (custom_instructions) {
    prompt += `\n\nADDITIONAL INSTRUCTIONS:\n${custom_instructions}`;
  }

  prompt += `

INSTRUCTIONS:
1. Use the generate_quiz tool with the following parameters:
   - topic: "${topic}"
   - num_questions: ${num_questions}
   - difficulty: ${difficulty}
   - question_types: ${JSON.stringify(question_types)}
   - include_explanations: ${include_explanations}`;

  if (focus_topics) {
    prompt += `\n   - focus_topics: "${focus_topics}"`;
  }

  if (lesson_content) {
    prompt += `\n   - lesson_content: "${lesson_content.slice(0, 500)}"`;
  }

  if (custom_instructions) {
    prompt += `\n   - custom_instructions: "${custom_instructions}"`;
  }

  prompt += `

2. Ensure questions are:
   - Educationally valuable and test understanding
   - Appropriate for the specified difficulty level
   - Well-structured with clear language
   - Diverse in content and cognitive levels

3. For multiple choice questions:
   - Provide exactly 4 options (A, B, C, D)
   - Ensure only one correct answer
   - Make distractors plausible but clearly incorrect

4. For all question types:
   - Use clear, unambiguous language
   - Test understanding, not just memorization
   - Include context when necessary

5. Return the complete quiz data structure as generated by the tool.

Generate the quiz now using the generate_quiz tool.`;

  return prompt;
}

/**
 * GET /api/ai/generate-quiz
 * Get information about quiz generation capabilities
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'AI Quiz Generation API',
    capabilities: {
      question_types: [
        'multiple_choice',
        'true_false', 
        'short_answer',
        'essay',
        'fill_blank'
      ],
      difficulty_levels: {
        1: 'Beginner (Easy)',
        2: 'Intermediate (Medium)',
        3: 'Advanced (Hard)', 
        4: 'Expert (Very Hard)',
        5: 'Master (Extremely Hard)'
      },
      max_questions: 50,
      features: [
        'Topic-based generation',
        'Difficulty level control',
        'Multiple question types',
        'Explanations and feedback',
        'Lesson content integration',
        'Custom instructions support'
      ]
    }
  });
}

/**
 * Generate mock quiz for testing (replace with actual AI generation)
 */
async function generateMockQuiz(params: {
  topic: string;
  num_questions: number;
  difficulty: number;
  question_types: string[];
  focus_topics?: string;
  include_explanations: boolean;
  lesson_content?: string;
  custom_instructions?: string;
}) {
  const questions = [];
  
  for (let i = 0; i < params.num_questions; i++) {
    const questionType = params.question_types[i % params.question_types.length];
    
    let question;
    switch (questionType) {
      case 'multiple_choice':
        question = {
          id: `q-${Date.now()}-${i}`,
          question_text: `What is a key concept in ${params.topic}? (Question ${i + 1})`,
          question_type: 'multiple_choice',
          options: [
            `Primary concept of ${params.topic}`,
            `Secondary aspect of ${params.topic}`,
            `Alternative approach in ${params.topic}`,
            `Unrelated concept`
          ],
          correct_answer: `Primary concept of ${params.topic}`,
          explanation: params.include_explanations ? `This is the fundamental concept in ${params.topic}.` : '',
          points: Math.max(1, params.difficulty),
          difficulty: params.difficulty,
          position: i + 1
        };
        break;
        
      case 'true_false':
        question = {
          id: `q-${Date.now()}-${i}`,
          question_text: `${params.topic} is considered an important subject in this field.`,
          question_type: 'true_false',
          options: [],
          correct_answer: true,
          explanation: params.include_explanations ? `This statement is true because ${params.topic} is fundamental to understanding the field.` : '',
          points: Math.max(1, params.difficulty),
          difficulty: params.difficulty,
          position: i + 1
        };
        break;
        
      default:
        question = {
          id: `q-${Date.now()}-${i}`,
          question_text: `Explain the main principles of ${params.topic}.`,
          question_type: questionType,
          options: [],
          correct_answer: `The main principles include understanding the fundamental concepts and applications of ${params.topic}.`,
          explanation: params.include_explanations ? `A good answer should demonstrate understanding of key concepts and provide examples.` : '',
          points: Math.max(1, params.difficulty * 2),
          difficulty: params.difficulty,
          position: i + 1
        };
    }
    
    questions.push(question);
  }
  
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  
  return {
    title: `Quiz: ${params.topic}`,
    description: `A quiz on ${params.topic} with ${questions.length} questions.`,
    total_points: totalPoints,
    estimated_time_minutes: Math.ceil(questions.length * 2),
    questions
  };
}
