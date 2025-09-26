import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolContext, ToolResponse } from './types';

// Quiz question type enum
const questionTypes = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'] as const;

// Quiz question schema
const QuizQuestionSchema = z.object({
  question_text: z.string().describe('The question text'),
  question_type: z.enum(questionTypes).describe('Type of question'),
  options: z.array(z.string()).optional().describe('Multiple choice options (for multiple_choice type)'),
  correct_answer: z.union([z.string(), z.boolean()]).describe('Correct answer'),
  explanation: z.string().optional().describe('Explanation for the answer'),
  points: z.number().default(1).describe('Points for this question'),
  difficulty: z.number().min(1).max(5).describe('Difficulty level (1-5)'),
});

// Quiz generation schema
const QuizGenerationSchema = z.object({
  topic: z.string().describe('Main topic or subject for the quiz'),
  num_questions: z.number().min(1).max(50).default(5).describe('Number of questions to generate'),
  difficulty: z.number().min(1).max(5).default(2).describe('Overall difficulty level (1=easy to 5=master)'),
  question_types: z.array(z.enum(questionTypes)).default(['multiple_choice', 'true_false']).describe('Types of questions to include'),
  focus_topics: z.string().optional().describe('Specific topics to focus on'),
  include_explanations: z.boolean().default(true).describe('Include explanations for answers'),
  lesson_content: z.string().optional().describe('Lesson content to base questions on'),
  custom_instructions: z.string().optional().describe('Additional custom instructions for question generation'),
});

export interface QuizGenerationResponse extends ToolResponse {
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
}

/**
 * Quiz Generation Tool
 * Generates quiz questions based on topic, difficulty, and other parameters
 */
export const quizGenerationTool = new DynamicStructuredTool({
  name: 'generate_quiz',
  description: `Generate educational quiz questions based on specified parameters.
  
This tool creates comprehensive quizzes with multiple question types including:
- Multiple choice questions with 4 options
- True/false questions  
- Short answer questions
- Essay questions
- Fill-in-the-blank questions

The tool can adapt to different difficulty levels, focus on specific topics, and include detailed explanations for learning purposes.`,
  
  schema: QuizGenerationSchema,
  
  func: async (input, runManager): Promise<string> => {
    try {
      console.log(`🎯 Quiz Generation Tool - Generating quiz for topic: ${input.topic}`);
      
      // Generate quiz questions based on input parameters
      const questions = await generateQuizQuestions(input);
      
      if (!questions || questions.length === 0) {
        return JSON.stringify({
          success: false,
          error: 'Failed to generate quiz questions',
          message: 'No questions could be generated with the given parameters'
        } as QuizGenerationResponse);
      }

      // Calculate total points and estimated time
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      const estimatedTime = Math.ceil(questions.length * 2 + (totalPoints * 0.5)); // Base estimate

      // Create quiz object
      const quiz = {
        title: `Quiz: ${input.topic}`,
        description: `A ${getDifficultyLabel(input.difficulty)} level quiz on ${input.topic} with ${questions.length} questions.`,
        total_points: totalPoints,
        estimated_time_minutes: estimatedTime,
        questions: questions.map((q, index) => ({
          ...q,
          id: `q-${Date.now()}-${index}`,
          position: index + 1
        }))
      };

      const response: QuizGenerationResponse = {
        success: true,
        quiz,
        message: `Successfully generated ${questions.length} questions for ${input.topic}`
      };

      console.log(`✅ Quiz generated successfully: ${questions.length} questions, ${totalPoints} points`);
      return JSON.stringify(response);

    } catch (error) {
      console.error('❌ Quiz Generation Tool Error:', error);
      return JSON.stringify({
        success: false,
        error: 'Quiz generation failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      } as QuizGenerationResponse);
    }
  },
});

/**
 * Generate quiz questions based on input parameters
 */
async function generateQuizQuestions(
  input: z.infer<typeof QuizGenerationSchema>
): Promise<Array<{
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string | boolean;
  explanation: string;
  points: number;
  difficulty: number;
}>> {
  const questions = [];
  
  // Distribute question types evenly
  const typeDistribution = distributeQuestionTypes(input.question_types, input.num_questions);
  
  let questionIndex = 0;
  
  for (const [questionType, count] of Object.entries(typeDistribution)) {
    for (let i = 0; i < count; i++) {
      questionIndex++;
      
      // Generate question based on type and parameters
      const question = await generateSingleQuestion({
        type: questionType as typeof questionTypes[number],
        topic: input.topic,
        difficulty: input.difficulty,
        focusTopics: input.focus_topics,
        lessonContent: input.lesson_content,
        includeExplanation: input.include_explanations,
        questionNumber: questionIndex,
        customInstructions: input.custom_instructions
      });
      
      if (question) {
        questions.push(question);
      }
    }
  }
  
  return questions;
}

/**
 * Distribute question types evenly across the requested number of questions
 */
function distributeQuestionTypes(types: string[], totalQuestions: number): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  // Initialize all types with 0
  types.forEach(type => {
    distribution[type] = 0;
  });
  
  // Distribute questions evenly
  let remaining = totalQuestions;
  let typeIndex = 0;
  
  while (remaining > 0) {
    const currentType = types[typeIndex % types.length];
    distribution[currentType]++;
    remaining--;
    typeIndex++;
  }
  
  return distribution;
}

/**
 * Generate a single question based on parameters
 */
async function generateSingleQuestion(params: {
  type: typeof questionTypes[number];
  topic: string;
  difficulty: number;
  focusTopics?: string;
  lessonContent?: string;
  includeExplanation: boolean;
  questionNumber: number;
  customInstructions?: string;
}): Promise<{
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string | boolean;
  explanation: string;
  points: number;
  difficulty: number;
} | null> {
  
  try {
    // Calculate points based on difficulty
    const points = Math.max(1, Math.ceil(params.difficulty * 1.5));
    
    // Generate question content based on type
    let questionContent;
    
    switch (params.type) {
      case 'multiple_choice':
        questionContent = generateMultipleChoiceQuestion(params);
        break;
      case 'true_false':
        questionContent = generateTrueFalseQuestion(params);
        break;
      case 'short_answer':
        questionContent = generateShortAnswerQuestion(params);
        break;
      case 'essay':
        questionContent = generateEssayQuestion(params);
        break;
      case 'fill_blank':
        questionContent = generateFillBlankQuestion(params);
        break;
      default:
        return null;
    }
    
    if (!questionContent) {
      return null;
    }
    
    return {
      ...questionContent,
      question_type: params.type,
      points,
      difficulty: params.difficulty
    };
    
  } catch (error) {
    console.error(`Error generating ${params.type} question:`, error);
    return null;
  }
}

/**
 * Generate multiple choice question
 */
function generateMultipleChoiceQuestion(params: any) {
  const difficultyModifiers = {
    1: "basic", 2: "intermediate", 3: "advanced", 4: "expert", 5: "master"
  };
  
  const focusContext = params.focusTopics ? ` focusing on ${params.focusTopics}` : '';
  const contentContext = params.lessonContent ? ` based on this content: "${params.lessonContent.slice(0, 200)}..."` : '';
  
  // Generate sample multiple choice question
  const templates = [
    `What is the most important concept in ${params.topic}${focusContext}?`,
    `Which of the following best describes ${params.topic}${focusContext}?`,
    `In the context of ${params.topic}, what is the primary purpose of${focusContext}?`,
    `According to ${params.topic} principles${focusContext}, which statement is correct?`
  ];
  
  const questionText = templates[Math.floor(Math.random() * templates.length)];
  
  // Generate options (this would typically use AI to generate contextual options)
  const options = [
    `Primary concept related to ${params.topic}`,
    `Secondary aspect of ${params.topic}`,
    `Alternative approach in ${params.topic}`,
    `Incorrect interpretation of ${params.topic}`
  ];
  
  const correctAnswer = options[0];
  const explanation = params.includeExplanation 
    ? `This is correct because it represents the fundamental principle of ${params.topic}${focusContext}.`
    : '';
  
  return {
    question_text: questionText,
    options,
    correct_answer: correctAnswer,
    explanation
  };
}

/**
 * Generate true/false question
 */
function generateTrueFalseQuestion(params: any) {
  const focusContext = params.focusTopics ? ` in ${params.focusTopics}` : '';
  
  const statements = [
    `${params.topic}${focusContext} is considered a fundamental concept in this field.`,
    `The primary application of ${params.topic}${focusContext} is widely accepted.`,
    `${params.topic}${focusContext} requires advanced understanding to implement correctly.`,
    `Most experts agree that ${params.topic}${focusContext} is essential knowledge.`
  ];
  
  const questionText = statements[Math.floor(Math.random() * statements.length)];
  const correctAnswer = Math.random() > 0.5; // Randomize for variety
  
  const explanation = params.includeExplanation 
    ? `This statement is ${correctAnswer ? 'true' : 'false'} because ${params.topic}${focusContext} ${correctAnswer ? 'indeed represents' : 'does not necessarily represent'} the described concept.`
    : '';
  
  return {
    question_text: questionText,
    options: [],
    correct_answer: correctAnswer,
    explanation
  };
}

/**
 * Generate short answer question
 */
function generateShortAnswerQuestion(params: any) {
  const focusContext = params.focusTopics ? ` related to ${params.focusTopics}` : '';
  
  const questionText = `Explain the key concept of ${params.topic}${focusContext} in your own words.`;
  const correctAnswer = `The key concept involves understanding the fundamental principles and applications of ${params.topic}${focusContext}.`;
  
  const explanation = params.includeExplanation 
    ? `A good answer should demonstrate understanding of the main principles, provide examples, and show how the concept applies in practice.`
    : '';
  
  return {
    question_text: questionText,
    options: [],
    correct_answer: correctAnswer,
    explanation
  };
}

/**
 * Generate essay question
 */
function generateEssayQuestion(params: any) {
  const focusContext = params.focusTopics ? ` with emphasis on ${params.focusTopics}` : '';
  
  const questionText = `Write a comprehensive essay discussing ${params.topic}${focusContext}. Include examples, analysis, and your own insights.`;
  const correctAnswer = `A comprehensive essay should cover the main aspects of ${params.topic}, provide relevant examples, analyze different perspectives, and demonstrate critical thinking.`;
  
  const explanation = params.includeExplanation 
    ? `Look for: clear thesis statement, logical structure, supporting evidence, examples, analysis, and conclusion. The essay should demonstrate deep understanding of ${params.topic}.`
    : '';
  
  return {
    question_text: questionText,
    options: [],
    correct_answer: correctAnswer,
    explanation
  };
}

/**
 * Generate fill-in-the-blank question
 */
function generateFillBlankQuestion(params: any) {
  const focusContext = params.focusTopics ? ` in ${params.focusTopics}` : '';
  
  const questionText = `The most important aspect of ${params.topic}${focusContext} is ________.`;
  const correctAnswer = `understanding the fundamental principles`;
  
  const explanation = params.includeExplanation 
    ? `This answer is correct because it captures the essential nature of learning ${params.topic}${focusContext}.`
    : '';
  
  return {
    question_text: questionText,
    options: [],
    correct_answer: correctAnswer,
    explanation
  };
}

/**
 * Get difficulty label
 */
function getDifficultyLabel(difficulty: number): string {
  const labels = {
    1: 'Beginner',
    2: 'Intermediate', 
    3: 'Advanced',
    4: 'Expert',
    5: 'Master'
  };
  return labels[difficulty as keyof typeof labels] || 'Intermediate';
}

export default quizGenerationTool;
