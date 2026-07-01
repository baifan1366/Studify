import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { getLLM } from '@/lib/langChain/client';
import { createRateLimitCheck, rateLimitResponse } from '@/lib/ratelimit';
import { DEFAULT_TEXT_MODEL } from '@/lib/ai/model-policy';
import { createClient } from '@/utils/supabase/server';

// Get model based on AI mode: thinking mode uses THINKING model, fast mode uses FAST model
function getModel(mode: 'fast' | 'thinking' = 'fast'): string {
  return DEFAULT_TEXT_MODEL;
}
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
  aiMode?: 'fast' | 'thinking'; // New: AI mode selection
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
  metadata?: {
    aiGenerated: boolean;
    toolsUsed?: string[];
    processingTimeMs?: number;
  };
}

/**
 * POST /api/ai/generate-quiz
 * Generate quiz questions using AI based on provided parameters
 */
export async function POST(req: NextRequest): Promise<NextResponse<GenerateQuizResponse>> {
  const startTime = Date.now();
  
  try {
    // Authorize request
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<GenerateQuizResponse>;
    }

    const userId = authResult.user.profile?.id || parseInt(authResult.payload.sub);

    // Rate limiting check
    const checkLimit = createRateLimitCheck('ai');
    const { allowed, remaining, resetTime, limit } = checkLimit(userId.toString());
    
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: rateLimitResponse(resetTime, limit).message
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      );
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

    const aiMode = body.aiMode || 'fast';
    const selectedModel = getModel(aiMode);
    let groundedLessonContent = body.lesson_content?.trim() || '';

    if (body.lessonId) {
      const supabase = await createClient();
      const lessonColumn = /^\d+$/.test(body.lessonId) ? 'id' : 'public_id';
      const { data: lesson } = await supabase
        .from('course_lesson')
        .select('id, transcript')
        .eq(lessonColumn, body.lessonId)
        .eq('is_deleted', false)
        .single();
      if (lesson) {
        const { data: segments } = await supabase
          .from('video_segments')
          .select('start_time, end_time, text')
          .eq('lesson_id', lesson.id)
          .order('start_time', { ascending: true })
          .limit(300);
        groundedLessonContent = (segments || [])
          .map((segment) => `[${Math.floor(segment.start_time || 0)}s] ${segment.text}`)
          .join('\n') || lesson.transcript || groundedLessonContent;
      }
    }

    if (!groundedLessonContent) {
      return NextResponse.json({
        success: false,
        error: 'Lesson content is not ready',
        message: 'Add a transcript or finish video processing before generating a grounded quiz.'
      }, { status: 409 });
    }

    console.log(`🎯 AI Quiz Generation Request from user ${userId}:`, {
      topic: body.topic,
      num_questions: body.num_questions,
      difficulty: body.difficulty,
      question_types: body.question_types,
      lessonId: body.lessonId,
      model: selectedModel,
      aiMode
    });

    // ✅ Generate quiz using real AI with Tool Calling
    try {
      const generatedQuiz = await generateQuizWithAI({
        topic: body.topic,
        num_questions: body.num_questions || 5,
        difficulty: body.difficulty || 2,
        question_types: body.question_types || ['multiple_choice', 'true_false'],
        focus_topics: body.focus_topics,
        include_explanations: body.include_explanations ?? true,
        lesson_content: groundedLessonContent,
        custom_instructions: body.custom_instructions
      }, userId, selectedModel, aiMode === 'thinking');

      const processingTime = Date.now() - startTime;
      console.log(`✅ Quiz generated successfully in ${processingTime}ms with ${generatedQuiz.quiz.questions.length} questions using ${selectedModel}`);

      // Return successful response
      return NextResponse.json({
        success: true,
        quiz: generatedQuiz.quiz,
        message: `Successfully generated ${generatedQuiz.quiz.questions.length} quiz questions using AI`,
        metadata: {
          aiGenerated: true,
          toolsUsed: generatedQuiz.toolsUsed || [],
          processingTimeMs: processingTime
        }
      }, {
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetTime.toString()
        }
      });
    } catch (aiError) {
      console.error('AI Quiz Generation failed:', aiError);
      return NextResponse.json({
        success: false,
        error: 'AI quiz generation failed',
        message: aiError instanceof Error
          ? aiError.message
          : 'The model could not create a valid grounded quiz. Please retry.'
      }, { status: 502 });
    }

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
 * Generate quiz using real AI with Tool Calling and Structured Output
 */
async function generateQuizWithAI(params: {
  topic: string;
  num_questions: number;
  difficulty: number;
  question_types: string[];
  focus_topics?: string;
  include_explanations: boolean;
  lesson_content?: string;
  custom_instructions?: string;
}, userId: number, model: string, enableThinking: boolean = false) {
  console.log(`🤖 Starting AI quiz generation with ${model} (thinking: ${enableThinking})...`);
  
  const difficultyLabels: Record<number, string> = {
    1: 'Beginner (Easy)',
    2: 'Intermediate (Medium)',
    3: 'Advanced (Hard)',
    4: 'Expert (Very Hard)',
    5: 'Master (Extremely Hard)'
  };

  // Build comprehensive AI prompt
  const prompt = `You are an expert educational content creator. Generate a comprehensive quiz on the topic: "${params.topic}".

QUIZ REQUIREMENTS:
- Number of questions: ${params.num_questions}
- Difficulty level: ${difficultyLabels[params.difficulty] || 'Intermediate'}
- Question types: ${params.question_types.join(', ')}
- Include explanations: ${params.include_explanations ? 'Yes' : 'No'}
${params.focus_topics ? `- Focus areas: ${params.focus_topics}` : ''}
${params.lesson_content ? `\n\nBASE CONTENT:\n"${params.lesson_content.slice(0, 24000)}${params.lesson_content.length > 24000 ? '...' : ''}"` : ''}
${params.custom_instructions ? `\n\nADDITIONAL INSTRUCTIONS:\n${params.custom_instructions}` : ''}

CRITICAL: Return a valid JSON object in this EXACT format (no markdown, no code blocks):
{
  "title": "Quiz title about the topic",
  "description": "Brief description of what the quiz covers",
  "total_points": 10,
  "estimated_time_minutes": 10,
  "questions": [
    {
      "id": "q1",
      "question_text": "Your question text here?",
      "question_type": "multiple_choice",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correct_answer": "Option A text",
      "explanation": "Why this answer is correct and what concept it tests",
      "points": 2,
      "difficulty": ${params.difficulty},
      "position": 1
    }
  ]
}

IMPORTANT RULES:
1. For multiple_choice questions:
   - Provide EXACTLY 4 options
   - correct_answer must match one option EXACTLY (same text)
   - Make distractors plausible but clearly incorrect
   
2. For true_false questions:
   - options should be empty array []
   - correct_answer should be true or false (boolean)
   
3. For other question types:
   - correct_answer should be a string with the expected answer
   
4. Make questions:
   - Educational and test real understanding
   - Clear and unambiguous
   - Appropriate for the difficulty level
   - Diverse in content coverage and cognitive skill
   - Grounded in specific facts, examples, processes, or claims from BASE CONTENT
   - Unique: never repeat the same stem, answer, fact, or wording
   - Include a mix of recall, application, comparison, and analysis
   
5. Return ONLY the JSON object, no markdown formatting, no \`\`\`json code blocks.`;

  const generationStartedAt = Date.now();
  const llm = await getLLM({
    model,
    streaming: false,
    temperature: 0.35,
    maxTokens: 7000,
    enableReasoning: enableThinking,
  });
  const response = await llm.invoke(prompt);
  const output = typeof response.content === 'string'
    ? response.content
    : response.content.map((part: any) => part.text || '').join('');
  const result = {
    output,
    toolsUsed: [] as string[],
    executionTime: Date.now() - generationStartedAt,
  };
  
  console.log('🤖 AI response received, parsing JSON...', {
    outputLength: result.output?.length || 0,
    toolsUsed: result.toolsUsed || [],
    executionTime: result.executionTime
  });

  // Parse the JSON response
  let quiz;
  try {
    let cleanedOutput = result.output.trim();
    
    // Remove markdown code blocks if present
    cleanedOutput = cleanedOutput.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    
    // Try to find JSON object
    const jsonMatch = cleanedOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      quiz = JSON.parse(jsonMatch[0]);
      console.log('✅ Successfully parsed quiz JSON');
    } else {
      throw new Error('No JSON object found in AI response');
    }
  } catch (parseError) {
    console.error('❌ Failed to parse AI response:', parseError);
    console.log('Raw AI output:', result.output?.substring(0, 500));
    throw new Error(`Failed to parse quiz JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }

  // Validate quiz structure
  if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    throw new Error('Invalid quiz structure: missing or empty questions array');
  }

  // Ensure all questions have required fields
  quiz.questions.forEach((q: any, index: number) => {
    if (!q.id) q.id = `q${index + 1}`;
    if (!q.position) q.position = index + 1;
    if (typeof q.points !== 'number') q.points = 1;
    if (typeof q.difficulty !== 'number') q.difficulty = params.difficulty;
  });

  if (quiz.questions.length !== params.num_questions) {
    throw new Error(`Expected ${params.num_questions} questions but received ${quiz.questions.length}`);
  }
  const normalizedQuestions = quiz.questions.map((q: any) =>
    String(q.question_text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  );
  if (new Set(normalizedQuestions).size !== normalizedQuestions.length) {
    throw new Error('The model returned duplicate quiz questions');
  }
  for (const question of quiz.questions) {
    if (!question.question_text || String(question.question_text).trim().length < 15) {
      throw new Error('The model returned an incomplete question');
    }
    if (question.question_type === 'multiple_choice') {
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        throw new Error('Every multiple-choice question must have exactly four options');
      }
      if (!question.options.includes(question.correct_answer)) {
        throw new Error('A multiple-choice correct answer does not match its options');
      }
    }
  }

  // Calculate total points if not provided
  if (typeof quiz.total_points !== 'number') {
    quiz.total_points = quiz.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);
  }

  console.log(`✅ Quiz validated: ${quiz.questions.length} questions, ${quiz.total_points} total points`);

  return {
    quiz,
    toolsUsed: result.toolsUsed || [],
    executionTime: result.executionTime
  };
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
